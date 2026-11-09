import { describe, expect, it } from 'vitest';
import { CHAVES, criarPersistenciaMemoria } from '../shared/persistence';
import { criarFixtures, contasDemo } from './fixtures';
import { criarServicosLocais } from './services';
import type { BaseDados } from './models';

describe('Conta de aluno sem candidatura', () => {
  it('permite entrar na base atual e consultar oportunidades sem candidatura', async () => {
    const servicos = criarServicosLocais(criarPersistenciaMemoria());
    await servicos.auth.entrar(contasDemo.find((conta) => conta.alunoId === 'luiza')!);
    const contexto = await servicos.aluno.contexto();
    expect(contexto.aluno.nome).toBe('Luiza Martins');
    expect(contexto.candidatura).toBeNull();
    expect(contexto.matriculas).toEqual([
      expect.objectContaining({ ativa: true, cursoId: 'computacao' }),
    ]);
    expect(await servicos.oportunidades.listar()).toHaveLength(3);
  });

  it('inclui a nova conta em bases antigas sem perder anexos ou duplicar cadastros', async () => {
    const persistencia = criarPersistenciaMemoria();
    const servicos = criarServicosLocais(persistencia);
    await servicos.auth.entrar(contasDemo[0]);
    const anexo = await servicos.documentos.anexar(
      'cand-ana',
      'passport',
      new File(['pdf'], 'passaporte.pdf', { type: 'application/pdf' }),
    );
    const base = (await persistencia.dados.ler(CHAVES.base)) as BaseDados;
    base.alunos = base.alunos.filter((aluno) => aluno.id !== 'luiza');
    base.matriculas = base.matriculas.filter((matricula) => matricula.alunoId !== 'luiza');
    base.alunos[0].telefone = '(85) 98888-1234';
    await persistencia.dados.gravar(CHAVES.base, base);

    const recarregados = criarServicosLocais(persistencia);
    await recarregados.auth.entrar(contasDemo.find((conta) => conta.alunoId === 'luiza')!);
    expect((await recarregados.aluno.contexto()).candidatura).toBeNull();
    expect((await recarregados.aluno.contexto()).matriculas).toHaveLength(1);
    await expect(recarregados.documentos.baixar('cand-ana', 'passport')).rejects.toMatchObject({
      chave: 'errors.notFound',
    });
    await recarregados.auth.entrar(contasDemo[0]);
    const contexto = await recarregados.aluno.contexto();
    expect(contexto.aluno.telefone).toBe('(85) 98888-1234');
    expect(
      contexto.candidatura?.documentos.find((doc) => doc.chave === 'passport')?.anexo?.id,
    ).toBe(anexo.id);
    expect((await recarregados.documentos.baixar('cand-ana', 'passport')).nome).toBe(
      'passaporte.pdf',
    );
    await recarregados.auth.entrar(contasDemo[1]);
    await recarregados.alunos.criar({
      nome: 'Novo Aluno',
      matricula: '9999999',
      telefone: '(85) 98888-5678',
      email: 'novo@example.com',
    });
    const salvos = (await persistencia.dados.ler(CHAVES.base)) as BaseDados;
    expect(salvos.alunos.filter((aluno) => aluno.id === 'luiza')).toHaveLength(1);
    expect(salvos.matriculas.filter((matricula) => matricula.alunoId === 'luiza')).toHaveLength(1);
    expect(salvos.candidaturas).toEqual(contexto.candidatura ? [contexto.candidatura] : []);
    expect(salvos.alunos).toHaveLength(criarFixtures().alunos.length + 1);
  });
});
