import { beforeEach, describe, expect, it } from 'vitest';
import {
  criarPersistenciaMemoria,
  criarPersistenciaNavegador,
  CHAVES,
} from '../shared/persistence';
import type { Persistencia } from '../shared/persistence';
import { criarServicosLocais } from './services';
import { criarRepositorios } from './repositories';
import { contasDemo, criarFixtures } from './fixtures';
import type { BaseDados, NovoConvenio } from './models';
import { criarArmazenamentoArquivosMemoria } from '../shared/file-storage';
import { LIMITE_ARQUIVO, situacaoDocumento, resumoDocumentos } from './documents';
const agora = () => new Date('2026-11-08T12:00:00-03:00');
const dadosAluno = {
  nome: 'Estudante Teste',
  matricula: '99900001',
  telefone: '+55 85 999990000',
  email: 'estudante@example.com',
};
const novoConvenio: NovoConvenio = {
  instituicaoId: 'lisboa',
  cursosIds: ['computacao'],
  duracaoMeses: 9,
  idiomaEnsino: 'pt',
  inicioVigencia: '2026-01-01',
  fimVigencia: '2027-12-31',
  ativo: true,
  observacoes: '',
};
describe.each([
  ['memória', criarPersistenciaMemoria],
  ['navegador', criarPersistenciaNavegador],
] as const)('Contratos com persistência em %s', (_nome, criarPersistencia) => {
  let persistencia: Persistencia;
  let servicos: ReturnType<typeof criarServicosLocais>;
  beforeEach(async () => {
    persistencia = criarPersistencia();
    persistencia.arquivos = criarArmazenamentoArquivosMemoria();
    await persistencia.dados.remover(CHAVES.base);
    await persistencia.dados.remover(CHAVES.idioma);
    await persistencia.sessao.remover(CHAVES.sessao);
    servicos = criarServicosLocais(persistencia, agora);
  });
  async function entrar(perfil: 'aluno' | 'dri') {
    const conta = contasDemo.find((c) => c.perfil === perfil)!;
    return servicos.auth.entrar(conta);
  }
  it('DRI consulta candidaturas e arquivos, aprova um documento e o aluno acompanha a decisão', async () => {
    await entrar('aluno');
    const arquivo = new File(['pdf'], 'historico.pdf', { type: 'application/pdf' });
    const anexo = await servicos.documentos.anexar('cand-ana', 'transcript', arquivo);
    await entrar('dri');
    expect((await servicos.candidaturas.listar())[0].aluno.nome).toBe('Carol');
    expect(await servicos.documentos.baixar('cand-ana', 'transcript')).toEqual({
      arquivo,
      nome: 'historico.pdf',
    });
    await servicos.documentos.revisar(
      'cand-ana',
      'transcript',
      anexo.id,
      'aprovado',
      'Documento conferido.',
    );
    await entrar('aluno');
    const candidatura = (await criarServicosLocais(persistencia, agora).aluno.contexto())
      .candidatura!;
    const documento = candidatura.documentos.find((doc) => doc.chave === 'transcript')!;
    expect(situacaoDocumento(documento)).toBe('aprovado');
    expect(documento.revisao).toMatchObject({
      orientacao: 'Documento conferido.',
      revisadoPor: 'Equipe DRI',
      anexoId: anexo.id,
    });
    expect(resumoDocumentos(candidatura.documentos)).toMatchObject({
      aprovados: 1,
      aguardando: 0,
      correcoes: 0,
    });
    expect(candidatura.etapaAtual).toBe(1);
  });
  it('exige orientação para correção e impede revisão sem arquivo ou com decisão inválida', async () => {
    await entrar('aluno');
    const anexo = await servicos.documentos.anexar(
      'cand-ana',
      'passport',
      new File(['pdf'], 'passaporte.pdf', { type: 'application/pdf' }),
    );
    await entrar('dri');
    await expect(
      servicos.documentos.revisar('cand-ana', 'passport', anexo.id, 'correcao', '   '),
    ).rejects.toMatchObject({ chave: 'review.reasonRequired' });
    await expect(
      servicos.documentos.revisar('cand-ana', 'passport', anexo.id, 'aprovado', 'a'.repeat(2001)),
    ).rejects.toMatchObject({ chave: 'review.reasonLong' });
    await expect(
      servicos.documentos.revisar('cand-ana', 'passport', anexo.id, 'invalido'),
    ).rejects.toMatchObject({ chave: 'errors.form' });
    await expect(
      servicos.documentos.revisar('cand-ana', 'visa', 'sem-arquivo', 'aprovado'),
    ).rejects.toMatchObject({ chave: 'review.noFile' });
    await servicos.documentos.revisar(
      'cand-ana',
      'passport',
      anexo.id,
      'correcao',
      'Envie a página de identificação legível.',
    );
    const documento = (await servicos.candidaturas.obter('cand-ana')).candidatura.documentos.find(
      (doc) => doc.chave === 'passport',
    )!;
    expect(situacaoDocumento(documento)).toBe('correcao');
    expect(documento.revisao?.orientacao).toBe('Envie a página de identificação legível.');
  });
  it('reenvio invalida a revisão anterior e rejeita revisão de uma versão substituída', async () => {
    await entrar('aluno');
    const arquivo = new File(['pdf'], 'teste.pdf', { type: 'application/pdf' });
    const antigo = await servicos.documentos.anexar('cand-ana', 'transcript', arquivo);
    await entrar('dri');
    await servicos.documentos.revisar('cand-ana', 'transcript', antigo.id, 'aprovado');
    await entrar('aluno');
    const novo = await servicos.documentos.anexar('cand-ana', 'transcript', arquivo);
    const documento = (await servicos.aluno.contexto()).candidatura!.documentos.find(
      (doc) => doc.chave === 'transcript',
    )!;
    expect(documento.revisao).toBeUndefined();
    expect(situacaoDocumento(documento)).toBe('enviado');
    await entrar('dri');
    await expect(
      servicos.documentos.revisar('cand-ana', 'transcript', antigo.id, 'aprovado'),
    ).rejects.toMatchObject({ chave: 'review.changed' });
    await servicos.documentos.revisar('cand-ana', 'transcript', novo.id, 'aprovado');
    await entrar('aluno');
    await servicos.documentos.remover('cand-ana', 'transcript');
    expect(
      situacaoDocumento(
        (await servicos.aluno.contexto()).candidatura!.documentos.find(
          (doc) => doc.chave === 'transcript',
        )!,
      ),
    ).toBe('pendente');
  });
  it('restringe a lista de candidaturas e as decisões de revisão ao perfil DRI', async () => {
    await expect(servicos.candidaturas.listar()).rejects.toMatchObject({
      chave: 'errors.unauthenticated',
    });
    await expect(
      servicos.documentos.revisar('cand-ana', 'transcript', 'id', 'aprovado'),
    ).rejects.toMatchObject({ chave: 'errors.unauthenticated' });
    await entrar('aluno');
    await expect(servicos.candidaturas.listar()).rejects.toMatchObject({
      chave: 'errors.forbidden',
    });
    await expect(servicos.candidaturas.obter('cand-ana')).rejects.toMatchObject({
      chave: 'errors.forbidden',
    });
    await expect(
      servicos.documentos.revisar('cand-ana', 'transcript', 'id', 'aprovado'),
    ).rejects.toMatchObject({ chave: 'errors.forbidden' });
    await entrar('dri');
    await expect(servicos.candidaturas.obter('inexistente')).rejects.toMatchObject({
      chave: 'errors.notFound',
    });
  });
  it('completa os documentos antigos preservando o histórico recebido', async () => {
    const base = criarFixtures(agora());
    base.candidaturas[0].documentos = [
      { chave: 'transcript', recebido: true },
      { chave: 'certificate', recebido: false },
    ];
    await persistencia.dados.gravar(CHAVES.base, base);
    await entrar('aluno');
    const candidatura = (await servicos.aluno.contexto()).candidatura!;
    expect(candidatura.documentos).toHaveLength(11);
    expect(candidatura.documentos.find((doc) => doc.chave === 'transcript')?.recebido).toBe(true);
    expect(candidatura.documentos.find((doc) => doc.chave === 'proficiency')).toBeDefined();
    expect(candidatura.documentos.some((doc) => doc.chave === 'certificate')).toBe(false);
  });
  it('salva anexos independentes sem aprovar documentos nem avançar a candidatura', async () => {
    await entrar('aluno');
    const arquivo = new File(['conteúdo'], 'historico.pdf', { type: 'application/pdf' });
    await Promise.all([
      servicos.documentos.anexar('cand-ana', 'transcript', arquivo),
      servicos.documentos.anexar('cand-ana', 'passport', arquivo),
    ]);
    const outraInstancia = criarServicosLocais(persistencia, agora);
    const candidatura = (await outraInstancia.aluno.contexto()).candidatura!;
    expect(candidatura.etapaAtual).toBe(1);
    expect(candidatura.documentos.filter((doc) => doc.anexo)).toHaveLength(2);
    expect(candidatura.documentos.every((doc) => !doc.recebido)).toBe(true);
    expect(await outraInstancia.documentos.baixar('cand-ana', 'transcript')).toEqual({
      arquivo,
      nome: 'historico.pdf',
    });
  });
  it('substitui e remove anexos sem afetar os demais documentos', async () => {
    await entrar('aluno');
    const arquivo = new File(['foto'], 'foto.png', { type: 'image/png' });
    const antigo = await servicos.documentos.anexar('cand-ana', 'photo', arquivo);
    const novo = await servicos.documentos.anexar('cand-ana', 'photo', arquivo);
    expect(await persistencia.arquivos.ler(antigo.id)).toBeNull();
    expect(await persistencia.arquivos.ler(novo.id)).toBe(arquivo);
    await servicos.documentos.remover('cand-ana', 'photo');
    expect(await persistencia.arquivos.ler(novo.id)).toBeNull();
    await expect(servicos.documentos.baixar('cand-ana', 'photo')).rejects.toMatchObject({
      chave: 'documents.fileUnavailable',
    });
    expect((await servicos.aluno.contexto()).candidatura?.documentos).toHaveLength(11);
  });
  it('rejeita arquivos vazios, formatos inválidos e tamanho excedido preservando o anexo anterior', async () => {
    await entrar('aluno');
    const arquivo = new File(['pdf'], 'historico.pdf', { type: 'application/pdf' });
    const original = await servicos.documentos.anexar('cand-ana', 'transcript', arquivo);
    for (const [invalido, chave] of [
      [new File([], 'vazio.pdf', { type: 'application/pdf' }), 'documents.emptyFile'],
      [new File(['texto'], 'texto.txt', { type: 'text/plain' }), 'documents.invalidType'],
      [new File(['texto'], 'falso.pdf', { type: 'text/plain' }), 'documents.invalidType'],
      [
        new File([new Uint8Array(LIMITE_ARQUIVO + 1)], 'grande.pdf', { type: 'application/pdf' }),
        'documents.tooLarge',
      ],
    ] as const) {
      await expect(
        servicos.documentos.anexar('cand-ana', 'transcript', invalido),
      ).rejects.toMatchObject({ chave });
    }
    expect(
      (await servicos.aluno.contexto()).candidatura?.documentos.find(
        (doc) => doc.chave === 'transcript',
      )?.anexo?.id,
    ).toBe(original.id);
  });
  it('bloqueia anexos sem sessão, da DRI e de outra candidatura', async () => {
    const arquivo = new File(['pdf'], 'teste.pdf', { type: 'application/pdf' });
    await expect(
      servicos.documentos.anexar('cand-ana', 'transcript', arquivo),
    ).rejects.toMatchObject({ chave: 'errors.unauthenticated' });
    await entrar('dri');
    await expect(
      servicos.documentos.anexar('cand-ana', 'transcript', arquivo),
    ).rejects.toMatchObject({ chave: 'errors.forbidden' });
    const repos = criarRepositorios(persistencia.dados, agora);
    const outra = await repos.candidaturas.criar({
      ...criarFixtures(agora()).candidaturas[0],
      alunoId: 'bruno',
    });
    await entrar('aluno');
    await expect(servicos.documentos.anexar(outra.id, 'transcript', arquivo)).rejects.toMatchObject(
      { chave: 'errors.notFound' },
    );
    await expect(servicos.documentos.remover(outra.id, 'transcript')).rejects.toMatchObject({
      chave: 'errors.notFound',
    });
    await expect(servicos.documentos.baixar(outra.id, 'transcript')).rejects.toMatchObject({
      chave: 'errors.notFound',
    });
    await expect(
      servicos.documentos.anexar('cand-ana', 'inexistente', arquivo),
    ).rejects.toMatchObject({ chave: 'errors.notFound' });
  });
  it('valida credenciais, restaura a sessão e não persiste a senha', async () => {
    await expect(
      servicos.auth.entrar({ identificador: '2612758', senha: 'incorreta' }),
    ).rejects.toMatchObject({ chave: 'errors.credentials' });
    await entrar('aluno');
    expect(await criarServicosLocais(persistencia, agora).auth.exigirAluno()).toMatchObject({
      alunoId: 'ana',
      perfil: 'aluno',
    });
    expect(await persistencia.sessao.ler(CHAVES.sessao)).toEqual({ usuarioId: 'usuario-ana' });
    await servicos.auth.sair();
    await expect(servicos.auth.exigirAluno()).rejects.toMatchObject({
      chave: 'errors.unauthenticated',
    });
  });
  it('autentica aluno por matrícula e DRI por e-mail, preservando o perfil', async () => {
    const aluno = await servicos.auth.entrar({ identificador: ' 2612758 ', senha: 'Aluno123!' });
    expect(aluno).toMatchObject({ perfil: 'aluno', nome: 'Carol' });
    expect((await servicos.aluno.contexto()).aluno).toMatchObject({
      nome: 'Carol',
      matricula: '2612758',
    });
    await expect(
      servicos.auth.entrar({ identificador: 'aluno@exemplo.com', senha: 'Aluno123!' }),
    ).rejects.toMatchObject({ chave: 'errors.credentials' });
    const dri = await servicos.auth.entrar({
      identificador: ' DRI@EXEMPLO.COM ',
      senha: 'Dri123!',
    });
    expect(dri.perfil).toBe('dri');
  });
  it('atualiza o cadastro demonstrativo antigo sem remover os dados existentes', async () => {
    const base = criarFixtures(agora());
    base.alunos[0] = { ...base.alunos[0], nome: 'Ana Costa', matricula: '26100001' };
    base.alunos.push({ ...dadosAluno, id: 'aluno-cadastrado' });
    await persistencia.dados.gravar(CHAVES.base, base);
    await entrar('aluno');
    expect((await servicos.aluno.contexto()).aluno).toMatchObject({
      nome: 'Carol',
      matricula: '2612758',
    });
    await entrar('dri');
    const alunos = await servicos.alunos.listar();
    expect(alunos).toHaveLength(4);
    expect(alunos.some((aluno) => aluno.id === 'aluno-cadastrado')).toBe(true);
    expect((await servicos.catalogo.obter()).convenios).toHaveLength(5);
  });
  it('bloqueia alterações de instituições, convênios e alunos no perfil aluno', async () => {
    await entrar('aluno');
    await expect(servicos.convenios.salvar(undefined, novoConvenio)).rejects.toMatchObject({
      chave: 'errors.forbidden',
    });
    await expect(servicos.convenios.definirAtivo('conv-lisboa', false)).rejects.toMatchObject({
      chave: 'errors.forbidden',
    });
    await expect(
      servicos.instituicoes.salvar(undefined, {
        nome: 'Teste',
        paisCodigo: 'PT',
        cidade: 'Lisboa',
        site: '',
        emailInternacional: '',
      }),
    ).rejects.toMatchObject({ chave: 'errors.forbidden' });
    await expect(servicos.alunos.criar(dadosAluno)).rejects.toMatchObject({
      chave: 'errors.forbidden',
    });
  });
  it('persiste cadastro e rejeita matrícula duplicada sem apagar registros', async () => {
    await entrar('dri');
    const aluno = await servicos.alunos.criar(dadosAluno);
    expect(await criarServicosLocais(persistencia, agora).alunos.listar()).toContainEqual(aluno);
    await expect(servicos.alunos.criar(dadosAluno)).rejects.toMatchObject({
      campos: { matricula: 'errors.duplicateEnrollment' },
    });
    expect(await servicos.alunos.listar()).toHaveLength(4);
  });
  it('oferece apenas os convênios ativos, vigentes e dos cursos ativos', async () => {
    await entrar('aluno');
    expect((await servicos.oportunidades.listar()).map((o) => o.instituicao.id)).toEqual([
      'lisboa',
      'madri',
      'montreal',
    ]);
    await expect(servicos.oportunidades.obter('porto')).rejects.toMatchObject({
      chave: 'errors.notFound',
    });
    expect(await servicos.oportunidades.listar({ area: 'business' })).toEqual([]);
    expect(
      (await servicos.oportunidades.listar({ pais: 'ES', duracao: '12', area: 'computing' })).map(
        (o) => o.instituicao.id,
      ),
    ).toEqual(['madri']);
  });
  it('reflete a gestão da DRI na consulta do aluno e preserva históricos', async () => {
    await entrar('dri');
    const criado = await servicos.convenios.salvar(undefined, novoConvenio);
    await servicos.convenios.salvar(criado.id, { ...novoConvenio, duracaoMeses: 10 });
    await entrar('aluno');
    expect(
      (await servicos.oportunidades.obter('lisboa')).convenios.some(
        (c) => c.id === criado.id && c.duracaoMeses === 10,
      ),
    ).toBe(true);
    await entrar('dri');
    await servicos.convenios.definirAtivo('conv-lisboa', false);
    await servicos.convenios.definirAtivo(criado.id, false);
    await entrar('aluno');
    expect((await servicos.oportunidades.listar()).map((o) => o.instituicao.id)).not.toContain(
      'lisboa',
    );
    expect((await servicos.aluno.contexto()).candidatura?.convenioId).toBe('conv-lisboa');
    await entrar('dri');
    expect((await servicos.intercambios.listar()).some((i) => i.convenioId === 'conv-lisboa')).toBe(
      true,
    );
  });
  it('compartilha dados da instituição e não cruza filtros de convênios distintos', async () => {
    await entrar('dri');
    await servicos.instituicoes.salvar('lisboa', {
      nome: 'Novo nome Lisboa',
      paisCodigo: 'PT',
      cidade: 'Lisboa',
      site: '',
      emailInternacional: '',
    });
    await servicos.convenios.salvar(undefined, {
      ...novoConvenio,
      cursosIds: ['administracao'],
      duracaoMeses: 12,
    });
    await entrar('aluno');
    expect((await servicos.oportunidades.obter('lisboa')).instituicao.nome).toBe(
      'Novo nome Lisboa',
    );
    expect(
      (await servicos.oportunidades.listar({ duracao: '12', area: 'computing' })).map(
        (o) => o.instituicao.id,
      ),
    ).toEqual(['madri']);
  });
  it('valida curso obrigatório, duração e vigência', async () => {
    await entrar('dri');
    await expect(
      servicos.convenios.salvar(undefined, {
        ...novoConvenio,
        cursosIds: [],
        duracaoMeses: 0,
        fimVigencia: '2025-01-01',
      }),
    ).rejects.toMatchObject({
      campos: {
        cursosIds: 'errors.courses',
        duracaoMeses: 'errors.duration',
        fimVigencia: 'errors.validity',
      },
    });
  });
  it('preserva leitura de avisos e isola os dados de outros alunos', async () => {
    await entrar('aluno');
    await servicos.avisos.marcarComoLido('av-1');
    expect(
      (await criarServicosLocais(persistencia, agora).avisos.listar()).find((a) => a.id === 'av-1')
        ?.lido,
    ).toBe(true);
    const repos = criarRepositorios(persistencia.dados, agora);
    const outro = await repos.avisos.criar({
      perfil: 'aluno',
      alunoId: 'bruno',
      tipo: 'aula',
      data: '2026-11-30',
      lido: false,
    });
    await expect(servicos.avisos.marcarComoLido(outro.id)).rejects.toMatchObject({
      chave: 'errors.notFound',
    });
  });
  it('lista avisos do DRI por data e preserva leitura após sair e recriar os serviços', async () => {
    await entrar('dri');
    const avisos = await servicos.avisos.listar();
    expect(avisos.map((aviso) => aviso.tipo)).toEqual([
      'atualizacaoConvenios',
      'documentosPendentes',
      'vigenciaConvenios',
    ]);
    expect(avisos.every((aviso) => aviso.perfil === 'dri' && !aviso.lido)).toBe(true);
    await servicos.avisos.marcarComoLido(avisos[0].id);
    await servicos.auth.sair();
    const recarregados = criarServicosLocais(persistencia, agora);
    await recarregados.auth.entrar(contasDemo.find((conta) => conta.perfil === 'dri')!);
    expect((await recarregados.avisos.listar()).filter((aviso) => !aviso.lido)).toHaveLength(2);
    expect((await recarregados.avisos.listar())[0].lido).toBe(true);
  });
  it('isola avisos entre perfis e destinatários DRI e exige autenticação', async () => {
    await expect(servicos.avisos.listar()).rejects.toMatchObject({
      chave: 'errors.unauthenticated',
    });
    await expect(servicos.avisos.marcarComoLido('av-dri-1')).rejects.toMatchObject({
      chave: 'errors.unauthenticated',
    });
    const repos = criarRepositorios(persistencia.dados, agora);
    const outro = await repos.avisos.criar({
      perfil: 'dri',
      usuarioId: 'outra-conta-dri',
      tipo: 'documentosPendentes',
      data: '2026-11-01',
      lido: false,
    });
    await entrar('dri');
    expect((await servicos.avisos.listar()).map((aviso) => aviso.id)).not.toContain(outro.id);
    for (const id of ['av-1', outro.id, 'av-inexistente']) {
      await expect(servicos.avisos.marcarComoLido(id)).rejects.toMatchObject({
        chave: 'errors.notFound',
      });
    }
    await entrar('aluno');
    expect((await servicos.avisos.listar()).every((aviso) => aviso.perfil === 'aluno')).toBe(true);
    await expect(servicos.avisos.marcarComoLido('av-dri-1')).rejects.toMatchObject({
      chave: 'errors.notFound',
    });
    expect((await repos.avisos.obter('av-1'))?.lido).toBe(false);
    expect((await repos.avisos.obter('av-dri-1'))?.lido).toBe(false);
    expect((await repos.avisos.obter(outro.id))?.lido).toBe(false);
  });
  it('atualiza avisos legados sem duplicar exemplos nem perder cadastros, arquivos ou leituras', async () => {
    await entrar('aluno');
    const arquivo = new File(['passaporte'], 'passaporte.pdf', { type: 'application/pdf' });
    await servicos.documentos.anexar('cand-ana', 'passport', arquivo);
    const base = (await persistencia.dados.ler(CHAVES.base)) as BaseDados;
    base.alunos[0].telefone = '(85) 98888-1234';
    const avisosLegados = base.avisos
      .filter((aviso) => aviso.perfil === 'aluno')
      .map(({ id, alunoId, tipo, data, lido }) => ({
        id,
        alunoId,
        tipo,
        data,
        lido: id === 'av-1' || lido,
      }));
    await persistencia.dados.gravar(CHAVES.base, { ...base, avisos: avisosLegados });
    await entrar('dri');
    expect(await servicos.avisos.listar()).toHaveLength(3);
    await servicos.avisos.marcarComoLido('av-dri-1');
    const recarregados = criarServicosLocais(persistencia, agora);
    expect(await recarregados.avisos.listar()).toHaveLength(3);
    expect((await recarregados.avisos.listar())[0].lido).toBe(true);
    await recarregados.avisos.marcarComoLido('av-dri-2');
    const salvos = (await persistencia.dados.ler(CHAVES.base)) as BaseDados;
    expect(salvos.avisos).toHaveLength(avisosLegados.length + 3);
    expect(salvos.alunos).toEqual(base.alunos);
    expect(salvos.convenios).toEqual(base.convenios);
    expect(salvos.candidaturas).toEqual(base.candidaturas);
    expect(salvos.solicitacoes).toEqual(base.solicitacoes);
    await recarregados.auth.entrar(contasDemo.find((conta) => conta.perfil === 'aluno')!);
    expect((await recarregados.avisos.listar()).find((aviso) => aviso.id === 'av-1')?.lido).toBe(
      true,
    );
    expect((await recarregados.documentos.baixar('cand-ana', 'passport')).arquivo).toEqual(arquivo);
  });
  it('rejeita avisos armazenados com tipos incompatíveis com o perfil', async () => {
    await persistencia.dados.gravar(CHAVES.base, {
      ...criarFixtures(agora()),
      avisos: [
        {
          id: 'av-invalido',
          perfil: 'aluno',
          alunoId: 'ana',
          tipo: 'documentosPendentes',
          data: '2026-11-10',
          lido: false,
        },
      ],
    });
    await entrar('aluno');
    await expect(servicos.avisos.listar()).rejects.toMatchObject({
      chave: 'errors.storageInvalid',
    });
  });
  it('unifica canais e mantém resposta da DRI após trocar de conta', async () => {
    await entrar('aluno');
    const solicitacao = await servicos.atendimento.criar({
      canal: 'whatsapp',
      assunto: 'Dúvida',
      mensagem: 'Mensagem de teste',
    });
    await entrar('dri');
    await servicos.atendimento.responder(solicitacao.id, 'Resposta da DRI');
    await entrar('aluno');
    const atualizada = await servicos.atendimento.obter(solicitacao.id);
    expect(atualizada.canal).toBe('whatsapp');
    expect(atualizada.mensagens.at(-1)?.texto).toBe('Resposta da DRI');
    await expect(
      servicos.atendimento.responder(solicitacao.id, 'Não permitido'),
    ).rejects.toMatchObject({ chave: 'errors.forbidden' });
  });
  it('preserva idioma e chaves de outro aplicativo ao restaurar exemplos', async () => {
    await persistencia.dados.gravar('outro-app:valor', { preservar: true });
    await servicos.preferencias.definirIdioma('es');
    await entrar('aluno');
    const anexo = await servicos.documentos.anexar(
      'cand-ana',
      'passport',
      new File(['pdf'], 'passaporte.pdf', { type: 'application/pdf' }),
    );
    await entrar('dri');
    await servicos.alunos.criar(dadosAluno);
    await servicos.restaurar();
    expect(await persistencia.arquivos.ler(anexo.id)).toBeNull();
    await entrar('dri');
    expect(await servicos.alunos.listar()).toHaveLength(3);
    expect(await servicos.preferencias.obterIdioma()).toBe('es');
    expect(await persistencia.dados.ler('outro-app:valor')).toEqual({ preservar: true });
    await persistencia.dados.remover('outro-app:valor');
  });
  it('não sobrescreve silenciosamente dados armazenados inválidos', async () => {
    await persistencia.dados.gravar(CHAVES.base, { versao: 999 });
    await entrar('dri');
    await expect(servicos.alunos.listar()).rejects.toMatchObject({
      chave: 'errors.storageInvalid',
    });
    expect(await persistencia.dados.ler(CHAVES.base)).toEqual({ versao: 999 });
  });
});

describe('Cenários adicionais de vínculos e isolamento', () => {
  it('une múltiplos cursos ativos sem duplicar instituições e trata ausência de vínculo', async () => {
    const persistencia = criarPersistenciaMemoria();
    const servicos = criarServicosLocais(persistencia, agora);
    const repos = criarRepositorios(persistencia.dados, agora);
    await servicos.auth.entrar(contasDemo[0]);
    const inativa = (await repos.matriculas.obter('mat-ana-inativa'))!;
    await repos.matriculas.atualizar(inativa.id, { ...inativa, ativa: true });
    expect((await servicos.oportunidades.listar()).map((o) => o.instituicao.id)).toEqual([
      'lisboa',
      'madri',
      'montreal',
      'porto',
    ]);
    for (const m of (await repos.matriculas.listar()).filter((m) => m.alunoId === 'ana'))
      await repos.matriculas.atualizar(m.id, { ...m, ativa: false });
    expect(await servicos.oportunidades.listar()).toEqual([]);
  });
  it('exclui convênio expirado sem afetar a candidatura estática', async () => {
    const persistencia = criarPersistenciaMemoria();
    const servicos = criarServicosLocais(persistencia, agora);
    await servicos.auth.entrar(contasDemo[1]);
    await servicos.convenios.salvar('conv-lisboa', { ...novoConvenio, fimVigencia: '2026-10-01' });
    await servicos.auth.entrar(contasDemo[0]);
    expect((await servicos.oportunidades.listar()).map((o) => o.instituicao.id)).not.toContain(
      'lisboa',
    );
    expect((await servicos.aluno.contexto()).candidatura).not.toBeNull();
  });
  it('não permite consultar solicitações de outro aluno', async () => {
    const persistencia = criarPersistenciaMemoria();
    const servicos = criarServicosLocais(persistencia, agora);
    const repos = criarRepositorios(persistencia.dados, agora);
    const pedido = await repos.solicitacoes.criar({
      alunoId: 'bruno',
      protocolo: 'INT-9999',
      assunto: 'Outro estudante',
      canal: 'portal',
      situacao: 'aberta',
      mensagens: [],
    });
    await servicos.auth.entrar(contasDemo[0]);
    await expect(servicos.atendimento.obter(pedido.id)).rejects.toMatchObject({
      chave: 'errors.notFound',
    });
    expect((await servicos.atendimento.listar()).map((s) => s.id)).not.toContain(pedido.id);
  });
  it('propaga falha de gravação sem substituir os dados anteriores', async () => {
    const persistencia = criarPersistenciaMemoria();
    const servicos = criarServicosLocais(persistencia, agora);
    await servicos.auth.entrar(contasDemo[1]);
    await servicos.alunos.criar(dadosAluno);
    const antes = await persistencia.dados.ler(CHAVES.base);
    const indisponivel = criarServicosLocais(
      {
        ...persistencia,
        dados: {
          ...persistencia.dados,
          async gravar() {
            throw new Error('Quota indisponível');
          },
        },
      },
      agora,
    );
    await expect(indisponivel.alunos.criar({ ...dadosAluno, matricula: 'outra' })).rejects.toThrow(
      'Quota indisponível',
    );
    expect(await persistencia.dados.ler(CHAVES.base)).toEqual(antes);
  });
});
