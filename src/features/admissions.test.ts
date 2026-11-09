import { describe, expect, it } from 'vitest';
import { CHAVES, criarPersistenciaMemoria } from '../shared/persistence';
import { criarServicosLocais } from './services';
import { criarFixtures, contasDemo } from './fixtures';
import { criarEditalDemo, situacaoInscricoes, validarEdital } from './admissions';
import type { BaseDados } from './models';

const hoje = () => new Date('2026-11-08T12:00:00-03:00');
const luiza = contasDemo.find((conta) => conta.alunoId === 'luiza')!;
const dri = contasDemo.find((conta) => conta.perfil === 'dri')!;

describe('Edital e abertura de candidaturas', () => {
  it('salva duas opções na ordem informada e as apresenta para aluno e DRI', async () => {
    const persistencia = criarPersistenciaMemoria();
    const servicos = criarServicosLocais(persistencia, hoje);
    await servicos.auth.entrar(luiza);
    const { edital } = await servicos.edital.obter();
    const candidatura = await servicos.candidaturas.iniciar({
      convenioId: 'conv-madri',
      segundaOpcaoConvenioId: 'conv-lisboa',
      editalId: edital.id,
      aceite: true,
    });
    expect(candidatura).toMatchObject({
      convenioId: 'conv-madri',
      segundaOpcaoConvenioId: 'conv-lisboa',
      periodo: edital.periodo,
    });
    const recarregados = criarServicosLocais(persistencia, hoje);
    const contexto = await recarregados.aluno.contexto();
    expect(contexto.opcoes.map((opcao) => [opcao.ordem, opcao.convenio?.id])).toEqual([
      [1, 'conv-madri'],
      [2, 'conv-lisboa'],
    ]);
    await recarregados.auth.entrar(dri);
    const revisao = await recarregados.candidaturas.obter(candidatura.id);
    expect(revisao.opcoes).toEqual(contexto.opcoes);
  });

  it.each([
    ['conv-lisboa', 'admission.duplicateChoice'],
    ['inexistente', 'admission.invalidDestination'],
    ['conv-lisboa-inativo', 'admission.invalidDestination'],
    ['conv-porto', 'admission.ineligible'],
  ])(
    'rejeita a segunda opção inválida %s sem criar candidatura',
    async (segundaOpcaoConvenioId, erro) => {
      const servicos = criarServicosLocais(criarPersistenciaMemoria(), hoje);
      await servicos.auth.entrar(luiza);
      const { edital } = await servicos.edital.obter();
      await expect(
        servicos.candidaturas.iniciar({
          convenioId: 'conv-lisboa',
          segundaOpcaoConvenioId,
          editalId: edital.id,
          aceite: true,
        }),
      ).rejects.toMatchObject({ campos: { segundaOpcaoConvenioId: erro } });
      expect((await servicos.aluno.contexto()).candidatura).toBeNull();
    },
  );

  it('considera ambos os dias-limite no horário de Fortaleza', () => {
    const edital = {
      ...criarEditalDemo(hoje()),
      inicioInscricoes: '2026-11-08',
      fimInscricoes: '2026-11-08',
    };
    expect(situacaoInscricoes(edital, new Date('2026-11-08T02:59:59Z'))).toBe('emBreve');
    expect(situacaoInscricoes(edital, new Date('2026-11-08T03:00:00Z'))).toBe('abertas');
    expect(situacaoInscricoes(edital, new Date('2026-11-09T02:59:59Z'))).toBe('abertas');
    expect(situacaoInscricoes(edital, new Date('2026-11-09T03:00:00Z'))).toBe('encerradas');
    expect(situacaoInscricoes({ ...edital, publicado: false }, hoje())).toBe('naoPublicado');
  });

  it.each([
    { titulo: ' ' },
    { periodo: '2027.3' },
    { inicioInscricoes: '2026-02-30' },
    { fimInscricoes: '2025-01-01' },
    { url: 'javascript:alert(1)' },
    { descricao: 'a'.repeat(2001) },
  ])('rejeita dados inválidos do edital: %o', (alteracao) => {
    expect(() => validarEdital({ ...criarEditalDemo(hoje()), ...alteracao })).toThrow();
  });

  it('restringe a edição à DRI e a criação ao aluno', async () => {
    const servicos = criarServicosLocais(criarPersistenciaMemoria(), hoje);
    await expect(servicos.edital.obter()).rejects.toMatchObject({
      chave: 'errors.unauthenticated',
    });
    await servicos.auth.entrar(luiza);
    const { edital } = await servicos.edital.obter();
    await expect(servicos.edital.salvar(edital)).rejects.toMatchObject({
      chave: 'errors.forbidden',
    });
    await servicos.auth.entrar(dri);
    await expect(
      servicos.candidaturas.iniciar({
        convenioId: 'conv-lisboa',
        editalId: edital.id,
        aceite: true,
      }),
    ).rejects.toMatchObject({ chave: 'errors.forbidden' });
  });

  it.each(['emBreve', 'encerradas', 'naoPublicado'] as const)(
    'impede a inscrição quando %s',
    async (situacao) => {
      const servicos = criarServicosLocais(criarPersistenciaMemoria(), hoje);
      await servicos.auth.entrar(dri);
      const dados = criarEditalDemo(hoje());
      const edital = await servicos.edital.salvar({
        ...dados,
        inicioInscricoes: situacao === 'emBreve' ? '2026-12-01' : '2026-01-01',
        fimInscricoes: situacao === 'encerradas' ? '2026-01-31' : '2026-12-31',
        publicado: situacao !== 'naoPublicado',
      });
      await servicos.auth.entrar(luiza);
      await expect(
        servicos.candidaturas.iniciar({
          convenioId: 'conv-lisboa',
          editalId: edital.id,
          aceite: true,
        }),
      ).rejects.toMatchObject({ chave: 'admission.closed' });
      expect((await servicos.aluno.contexto()).candidatura).toBeNull();
    },
  );

  it('exige confirmação e destino compatível e vigente', async () => {
    const servicos = criarServicosLocais(criarPersistenciaMemoria(), hoje);
    await servicos.auth.entrar(luiza);
    const { edital } = await servicos.edital.obter();
    const dados = { convenioId: 'conv-lisboa', editalId: edital.id, aceite: true };
    await expect(servicos.candidaturas.iniciar({ ...dados, aceite: false })).rejects.toMatchObject({
      campos: { aceite: 'admission.acceptRequired' },
    });
    for (const convenioId of ['', 'inexistente', 'conv-lisboa-inativo']) {
      await expect(servicos.candidaturas.iniciar({ ...dados, convenioId })).rejects.toMatchObject({
        campos: { convenioId: 'admission.invalidDestination' },
      });
    }
    await expect(
      servicos.candidaturas.iniciar({ ...dados, convenioId: 'conv-porto' }),
    ).rejects.toMatchObject({ chave: 'admission.ineligible' });
  });

  it('revalida critérios acadêmicos e vigência ao enviar', async () => {
    const persistencia = criarPersistenciaMemoria();
    const base = criarFixtures(hoje());
    base.matriculas.find((m) => m.alunoId === 'luiza')!.mediaGlobal = 5;
    await persistencia.dados.gravar(CHAVES.base, base);
    const servicos = criarServicosLocais(persistencia, hoje);
    await servicos.auth.entrar(luiza);
    const { edital } = await servicos.edital.obter();
    const dados = { convenioId: 'conv-lisboa', editalId: edital.id, aceite: true };
    await expect(servicos.candidaturas.iniciar(dados)).rejects.toMatchObject({
      chave: 'admission.ineligible',
    });
    base.matriculas.find((m) => m.alunoId === 'luiza')!.mediaGlobal = 8;
    base.convenios.find((c) => c.id === 'conv-lisboa')!.fimVigencia = '2026-01-01';
    await persistencia.dados.gravar(CHAVES.base, base);
    await expect(servicos.candidaturas.iniciar(dados)).rejects.toMatchObject({
      campos: { convenioId: 'admission.invalidDestination' },
    });
  });

  it('persiste candidatura e documentos, evita duplicatas e preserva o edital de origem', async () => {
    const persistencia = criarPersistenciaMemoria();
    const servicos = criarServicosLocais(persistencia, hoje);
    await servicos.auth.entrar(luiza);
    const { edital } = await servicos.edital.obter();
    const dados = { convenioId: 'conv-lisboa', editalId: edital.id, aceite: true };
    const resultados = await Promise.allSettled([
      servicos.candidaturas.iniciar(dados),
      servicos.candidaturas.iniciar(dados),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { chave: 'admission.exists' },
    });
    const candidatura = (await criarServicosLocais(persistencia, hoje).aluno.contexto())
      .candidatura!;
    expect(candidatura).toMatchObject({
      alunoId: 'luiza',
      etapaAtual: 1,
      periodo: '2027.1',
      edital,
    });
    expect(candidatura.documentos).toHaveLength(11);
    expect(candidatura.documentos.every((d) => !d.anexo && !d.recebido)).toBe(true);
    const anexo = await servicos.documentos.anexar(
      candidatura.id,
      'passport',
      new File(['pdf'], 'passaporte.pdf', { type: 'application/pdf' }),
    );
    await servicos.auth.entrar(dri);
    expect(await servicos.candidaturas.listar()).toHaveLength(2);
    await servicos.documentos.revisar(candidatura.id, 'passport', anexo.id, 'aprovado');
    await servicos.edital.salvar({ ...edital, periodo: '2028.2' });
    expect((await servicos.candidaturas.obter(candidatura.id)).candidatura).toMatchObject({
      periodo: '2027.1',
      edital,
    });
  });

  it('rejeita o formulário de um edital que mudou após sua abertura', async () => {
    const servicos = criarServicosLocais(criarPersistenciaMemoria(), hoje);
    await servicos.auth.entrar(dri);
    const { edital } = await servicos.edital.obter();
    await servicos.edital.salvar({ ...edital, periodo: '2028.2' });
    await servicos.auth.entrar(luiza);
    await expect(
      servicos.candidaturas.iniciar({
        convenioId: 'conv-lisboa',
        editalId: edital.id,
        aceite: true,
      }),
    ).rejects.toMatchObject({ chave: 'admission.changed' });
  });

  it('carrega bases anteriores sem apagar dados e não grava uma candidatura se o armazenamento falhar', async () => {
    const persistencia = criarPersistenciaMemoria();
    const base = criarFixtures(hoje());
    await persistencia.dados.gravar(CHAVES.base, { ...base, edital: undefined });
    const servicos = criarServicosLocais(persistencia, hoje);
    await servicos.auth.entrar(luiza);
    const { edital } = await servicos.edital.obter();
    expect(edital).toEqual(base.edital);
    const gravar = persistencia.dados.gravar;
    persistencia.dados.gravar = async () => {
      throw new Error('falha');
    };
    await expect(
      servicos.candidaturas.iniciar({
        convenioId: 'conv-lisboa',
        editalId: edital.id,
        aceite: true,
      }),
    ).rejects.toThrow('falha');
    expect(((await persistencia.dados.ler(CHAVES.base)) as BaseDados).candidaturas).toEqual(
      base.candidaturas,
    );
    persistencia.dados.gravar = gravar;
    await servicos.candidaturas.iniciar({
      convenioId: 'conv-lisboa',
      editalId: edital.id,
      aceite: true,
    });
    const salvos = (await persistencia.dados.ler(CHAVES.base)) as BaseDados;
    expect(salvos.candidaturas[0]).toEqual(base.candidaturas[0]);
    expect(salvos.edital).toEqual(base.edital);
  });
});
