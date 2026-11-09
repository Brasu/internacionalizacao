import type { Persistencia } from '../shared/persistence';
import { CHAVES, criarPersistenciaMemoria } from '../shared/persistence';
import { contasDemo } from './fixtures';
import { criarRepositorios } from './repositories';
import type { Repositorios } from './repositories';
import { ErroAplicacao, Mensagem } from './models';
import type {
  Aviso,
  Sessao,
  NovoAluno,
  NovaInstituicao,
  NovoConvenio,
  Idioma,
  Filtros,
  Oportunidade,
  CanalAtendimento,
  Solicitacao,
  SituacaoIntercambio,
  DadosEdital,
  Candidatura,
  Convenio,
  Instituicao,
} from './models';
import { estaVigente, validarAluno, validarConvenio, validarInstituicao } from './rules';
import type { ArmazenamentoArquivos } from '../shared/file-storage';
import { DOCUMENTOS_CANDIDATURA, validarArquivo } from './documents';
import { situacaoInscricoes, validarEdital } from './admissions';
export interface PersistenciaSessao {
  obter(): Promise<Sessao | null>;
  salvar(sessao: Sessao): Promise<void>;
  limpar(): Promise<void>;
}
function opcoesCandidatura(
  candidatura: Candidatura | null,
  convenios: Convenio[],
  instituicoes: Instituicao[],
) {
  if (!candidatura) return [];
  return [candidatura.convenioId, candidatura.segundaOpcaoConvenioId].flatMap((id, indice) => {
    if (!id) return [];
    const convenio = convenios.find((c) => c.id === id) ?? null;
    const instituicao = instituicoes.find((i) => i.id === convenio?.instituicaoId) ?? null;
    return [{ ordem: indice + 1, convenio, instituicao }];
  });
}
export interface RepositorioPreferencias {
  obterIdioma(): Promise<Idioma>;
  definirIdioma(idioma: Idioma): Promise<void>;
}
export function montarServicos(
  repos: Repositorios,
  sessoes: PersistenciaSessao,
  preferencias: RepositorioPreferencias,
  arquivos: ArmazenamentoArquivos,
  agora: () => Date = () => new Date(),
) {
  const auth = {
    async obterSessao() {
      return sessoes.obter();
    },
    async entrar(dados: { identificador: string; senha: string }) {
      const conta = contasDemo.find(
        (c) =>
          c.identificador ===
            (c.perfil === 'dri'
              ? dados.identificador.trim().toLowerCase()
              : dados.identificador.trim()) && c.senha === dados.senha,
      );
      if (!conta) throw new ErroAplicacao('errors.credentials');
      const sessao: Sessao = {
        usuarioId: conta.id,
        perfil: conta.perfil,
        nome: conta.nome,
        alunoId: 'alunoId' in conta ? conta.alunoId : undefined,
      };
      await sessoes.salvar(sessao);
      return sessao;
    },
    async sair() {
      await sessoes.limpar();
    },
    async exigirSessao() {
      const sessao = await sessoes.obter();
      if (!sessao) throw new ErroAplicacao('errors.unauthenticated');
      return sessao;
    },
    async exigirAluno() {
      const sessao = await auth.exigirSessao();
      if (sessao.perfil !== 'aluno' || !sessao.alunoId) throw new ErroAplicacao('errors.forbidden');
      return { ...sessao, alunoId: sessao.alunoId };
    },
    async exigirDri() {
      const sessao = await auth.exigirSessao();
      if (sessao.perfil !== 'dri') throw new ErroAplicacao('errors.forbidden');
      return sessao;
    },
  };
  function avisoDaSessao(aviso: Aviso, sessao: Sessao) {
    return aviso.perfil === 'dri'
      ? sessao.perfil === 'dri' && aviso.usuarioId === sessao.usuarioId
      : sessao.perfil === 'aluno' && aviso.alunoId === sessao.alunoId;
  }
  async function listarAvisos() {
    const sessao = await auth.exigirSessao();
    return (await repos.avisos.listar())
      .filter((aviso) => avisoDaSessao(aviso, sessao))
      .sort((a, b) => a.data.localeCompare(b.data));
  }
  async function oportunidades(filtros: Filtros = {}): Promise<Oportunidade[]> {
    const sessao = await auth.exigirAluno();
    const [matriculas, cursos, convenios, instituicoes] = await Promise.all([
      repos.matriculas.listar(),
      repos.cursos.listar(),
      repos.convenios.listar(),
      repos.instituicoes.listar(),
    ]);
    const cursosAtivos = new Set(
      matriculas.filter((m) => m.alunoId === sessao.alunoId && m.ativa).map((m) => m.cursoId),
    );
    return instituicoes.flatMap((instituicao) => {
      if (filtros.pais && filtros.pais !== instituicao.paisCodigo) return [];
      const acessiveis = convenios.filter(
        (c) =>
          c.instituicaoId === instituicao.id &&
          c.ativo &&
          estaVigente(c, agora()) &&
          (!filtros.duracao || String(c.duracaoMeses) === filtros.duracao) &&
          c.cursosIds.some(
            (id) =>
              cursosAtivos.has(id) &&
              (!filtros.area || cursos.find((curso) => curso.id === id)?.area === filtros.area),
          ),
      );
      return acessiveis.length ? [{ instituicao, convenios: acessiveis }] : [];
    });
  }
  async function contextoAluno() {
    const sessao = await auth.exigirAluno();
    const [aluno, matriculas, cursos, candidaturas, avisos, convenios, instituicoes] =
      await Promise.all([
        repos.alunos.obter(sessao.alunoId),
        repos.matriculas.listar(),
        repos.cursos.listar(),
        repos.candidaturas.listar(),
        listarAvisos(),
        repos.convenios.listar(),
        repos.instituicoes.listar(),
      ]);
    if (!aluno) throw new ErroAplicacao('errors.notFound');
    const candidatura = candidaturas.find((c) => c.alunoId === sessao.alunoId) ?? null;
    const convenio = convenios.find((c) => c.id === candidatura?.convenioId) ?? null;
    return {
      aluno,
      matriculas: matriculas.filter((m) => m.alunoId === sessao.alunoId),
      cursos,
      candidatura,
      convenio,
      opcoes: opcoesCandidatura(candidatura, convenios, instituicoes),
      instituicao: instituicoes.find((i) => i.id === convenio?.instituicaoId) ?? null,
      avisos,
    };
  }
  async function exigirDocumento(candidaturaId: string, chave: string, permitirDri = false) {
    const sessao = permitirDri ? await auth.exigirSessao() : await auth.exigirAluno();
    const candidatura = await repos.candidaturas.obter(candidaturaId);
    if (!candidatura || (sessao.perfil !== 'dri' && candidatura.alunoId !== sessao.alunoId))
      throw new ErroAplicacao('errors.notFound');
    if (!DOCUMENTOS_CANDIDATURA.some((item) => item === chave))
      throw new ErroAplicacao('errors.notFound');
    return candidatura.documentos.find((doc) => doc.chave === chave)!;
  }
  async function listarCandidaturas() {
    await auth.exigirDri();
    const [candidaturas, alunos, convenios, instituicoes] = await Promise.all([
      repos.candidaturas.listar(),
      repos.alunos.listar(),
      repos.convenios.listar(),
      repos.instituicoes.listar(),
    ]);
    return candidaturas.flatMap((candidatura) => {
      const aluno = alunos.find((item) => item.id === candidatura.alunoId);
      if (!aluno) return [];
      const convenio = convenios.find((item) => item.id === candidatura.convenioId) ?? null;
      const instituicao = instituicoes.find((item) => item.id === convenio?.instituicaoId) ?? null;
      return [
        {
          candidatura,
          aluno,
          convenio,
          instituicao,
          opcoes: opcoesCandidatura(candidatura, convenios, instituicoes),
        },
      ];
    });
  }
  return {
    auth,
    preferencias,
    oportunidades: {
      listar: oportunidades,
      async obter(id: string) {
        const oportunidade = (await oportunidades()).find((o) => o.instituicao.id === id);
        if (!oportunidade) throw new ErroAplicacao('errors.notFound');
        return oportunidade;
      },
    },
    aluno: { contexto: contextoAluno },
    edital: {
      async obter() {
        await auth.exigirSessao();
        const edital = await repos.edital.obter();
        return { edital, situacao: situacaoInscricoes(edital, agora()) };
      },
      async salvar(dados: DadosEdital) {
        await auth.exigirDri();
        return repos.edital.salvar(validarEdital(dados));
      },
    },
    candidaturas: {
      listar: listarCandidaturas,
      async iniciar(dados: {
        convenioId: string;
        segundaOpcaoConvenioId?: string;
        editalId: string;
        aceite: boolean;
      }) {
        const sessao = await auth.exigirAluno();
        if (dados.aceite !== true)
          throw new ErroAplicacao('errors.form', { aceite: 'admission.acceptRequired' });
        return repos.candidaturas.iniciar(
          sessao.alunoId,
          dados.convenioId,
          dados.editalId,
          dados.segundaOpcaoConvenioId,
        );
      },
      async obter(id: string) {
        const contexto = (await listarCandidaturas()).find((item) => item.candidatura.id === id);
        if (!contexto) throw new ErroAplicacao('errors.notFound');
        return contexto;
      },
    },
    documentos: {
      async anexar(candidaturaId: string, chave: string, arquivo: File) {
        await exigirDocumento(candidaturaId, chave);
        const dados = validarArquivo(arquivo);
        const anexo = { ...dados, id: crypto.randomUUID(), enviadoEm: agora().toISOString() };
        await arquivos.gravar(anexo.id, arquivo);
        let anterior;
        try {
          anterior = await repos.candidaturas.atualizarDocumento(
            candidaturaId,
            { chave, recebido: false, anexo },
            anexo.enviadoEm,
          );
        } catch (erro) {
          await arquivos.remover(anexo.id).catch(() => undefined);
          throw erro;
        }
        if (anterior.anexo) await arquivos.remover(anterior.anexo.id).catch(() => undefined);
        return anexo;
      },
      async remover(candidaturaId: string, chave: string) {
        await exigirDocumento(candidaturaId, chave);
        const anterior = await repos.candidaturas.atualizarDocumento(
          candidaturaId,
          { chave, recebido: false },
          agora().toISOString(),
        );
        if (anterior.anexo) await arquivos.remover(anterior.anexo.id).catch(() => undefined);
      },
      async baixar(candidaturaId: string, chave: string) {
        const documento = await exigirDocumento(candidaturaId, chave, true);
        if (!documento.anexo) throw new ErroAplicacao('documents.fileUnavailable');
        const arquivo = await arquivos.ler(documento.anexo.id);
        if (!arquivo) throw new ErroAplicacao('documents.fileUnavailable');
        return { arquivo, nome: documento.anexo.nome };
      },
      async revisar(
        candidaturaId: string,
        chave: string,
        anexoId: string,
        situacao: string,
        orientacao = '',
      ) {
        const sessao = await auth.exigirDri();
        const documento = await exigirDocumento(candidaturaId, chave, true);
        if (!documento.anexo) throw new ErroAplicacao('review.noFile');
        if (!(await arquivos.ler(documento.anexo.id)))
          throw new ErroAplicacao('documents.fileUnavailable');
        if (situacao !== 'aprovado' && situacao !== 'correcao')
          throw new ErroAplicacao('errors.form');
        const texto = orientacao.trim();
        if (situacao === 'correcao' && !texto)
          throw new ErroAplicacao('review.reasonRequired', { orientacao: 'review.reasonRequired' });
        if (texto.length > 2000)
          throw new ErroAplicacao('review.reasonLong', { orientacao: 'review.reasonLong' });
        return repos.candidaturas.revisarDocumento(candidaturaId, chave, {
          anexoId,
          situacao,
          orientacao: texto,
          revisadoEm: agora().toISOString(),
          revisadoPor: sessao.nome,
        });
      },
    },
    alunos: {
      async listar() {
        await auth.exigirDri();
        return repos.alunos.listar();
      },
      async criar(dados: NovoAluno) {
        await auth.exigirDri();
        const validado = validarAluno(dados);
        if ((await repos.alunos.listar()).some((a) => a.matricula === validado.matricula))
          throw new ErroAplicacao('errors.form', { matricula: 'errors.duplicateEnrollment' });
        return repos.alunos.criar(validado);
      },
    },
    catalogo: {
      async obter() {
        await auth.exigirDri();
        const [instituicoes, cursos, convenios] = await Promise.all([
          repos.instituicoes.listar(),
          repos.cursos.listar(),
          repos.convenios.listar(),
        ]);
        return { instituicoes, cursos, convenios };
      },
    },
    instituicoes: {
      async salvar(id: string | undefined, dados: NovaInstituicao) {
        await auth.exigirDri();
        const validado = validarInstituicao(dados);
        return id ? repos.instituicoes.atualizar(id, validado) : repos.instituicoes.criar(validado);
      },
    },
    convenios: {
      async salvar(id: string | undefined, dados: NovoConvenio) {
        await auth.exigirDri();
        const [instituicoes, cursos] = await Promise.all([
          repos.instituicoes.listar(),
          repos.cursos.listar(),
        ]);
        const validado = validarConvenio(
          dados,
          instituicoes.map((i) => i.id),
          cursos.map((c) => c.id),
        );
        return id ? repos.convenios.atualizar(id, validado) : repos.convenios.criar(validado);
      },
      async definirAtivo(id: string, ativo: boolean) {
        await auth.exigirDri();
        const convenio = await repos.convenios.obter(id);
        if (!convenio) throw new ErroAplicacao('errors.notFound');
        return repos.convenios.atualizar(id, { ...convenio, ativo });
      },
    },
    intercambios: {
      async listar(situacao?: SituacaoIntercambio) {
        await auth.exigirDri();
        const [itens, alunos, convenios, instituicoes] = await Promise.all([
          repos.intercambios.listar(),
          repos.alunos.listar(),
          repos.convenios.listar(),
          repos.instituicoes.listar(),
        ]);
        return itens
          .filter((i) => !situacao || i.situacao === situacao)
          .map((item) => {
            const aluno = alunos.find((a) => a.id === item.alunoId);
            const convenio = convenios.find((c) => c.id === item.convenioId);
            const instituicao = instituicoes.find((i) => i.id === convenio?.instituicaoId);
            return {
              ...item,
              alunoNome: aluno?.nome ?? '—',
              matricula: aluno?.matricula ?? '—',
              instituicaoNome: instituicao?.nome ?? '—',
              paisCodigo: instituicao?.paisCodigo ?? '',
            };
          });
      },
    },
    avisos: {
      listar: listarAvisos,
      async marcarComoLido(id: string) {
        const sessao = await auth.exigirSessao();
        const aviso = await repos.avisos.obter(id);
        if (!aviso || !avisoDaSessao(aviso, sessao)) throw new ErroAplicacao('errors.notFound');
        return repos.avisos.atualizar(id, { ...aviso, lido: true });
      },
    },
    atendimento: {
      async listar() {
        const sessao = await auth.exigirSessao();
        const itens = await repos.solicitacoes.listar();
        return itens
          .filter((s) => sessao.perfil === 'dri' || s.alunoId === sessao.alunoId)
          .reverse();
      },
      async obter(id: string) {
        const sessao = await auth.exigirSessao();
        const item = await repos.solicitacoes.obter(id);
        if (!item || (sessao.perfil === 'aluno' && item.alunoId !== sessao.alunoId))
          throw new ErroAplicacao('errors.notFound');
        return item;
      },
      async criar(dados: { canal: CanalAtendimento; assunto: string; mensagem: string }) {
        const sessao = await auth.exigirAluno();
        if (
          !['portal', 'email', 'whatsapp'].includes(dados.canal) ||
          !dados.assunto.trim() ||
          !dados.mensagem.trim()
        )
          throw new ErroAplicacao('errors.required');
        const quantidade = (await repos.solicitacoes.listar()).length;
        return repos.solicitacoes.criar({
          alunoId: sessao.alunoId,
          canal: dados.canal,
          assunto: dados.assunto.trim(),
          protocolo: `INT-${String(quantidade + 1).padStart(4, '0')}`,
          situacao: 'aberta',
          mensagens: [
            {
              id: crypto.randomUUID(),
              autor: 'aluno',
              texto: dados.mensagem.trim(),
              data: agora().toISOString(),
            },
          ],
        });
      },
      async responder(id: string, texto: string) {
        await auth.exigirDri();
        if (!texto.trim()) throw new ErroAplicacao('errors.required');
        const item = await repos.solicitacoes.obter(id);
        if (!item) throw new ErroAplicacao('errors.notFound');
        const mensagem: Mensagem = {
          id: crypto.randomUUID(),
          autor: 'dri',
          texto: texto.trim(),
          data: agora().toISOString(),
        };
        const atualizado: Solicitacao = {
          ...item,
          situacao: 'respondida',
          mensagens: [
            ...item.mensagens,
            mensagem,
          ],
        };
        return repos.solicitacoes.atualizar(id, atualizado);
      },
    },
    async restaurar() {
      await arquivos.limpar();
      await repos.restaurar();
      await auth.sair();
    },
  };
}
export function criarServicosLocais(
  persistencia: Persistencia,
  agora: () => Date = () => new Date(),
) {
  const sessoes: PersistenciaSessao = {
    async obter() {
      const dado = await persistencia.sessao.ler(CHAVES.sessao);
      if (dado === null) return null;
      if (typeof dado !== 'object' || !('usuarioId' in dado))
        throw new ErroAplicacao('errors.storageInvalid');
      const conta = contasDemo.find((c) => c.id === dado.usuarioId);
      if (!conta) throw new ErroAplicacao('errors.storageInvalid');
      return {
        usuarioId: conta.id,
        perfil: conta.perfil,
        nome: conta.nome,
        alunoId: 'alunoId' in conta ? conta.alunoId : undefined,
      };
    },
    async salvar(sessao) {
      await persistencia.sessao.gravar(CHAVES.sessao, { usuarioId: sessao.usuarioId });
    },
    async limpar() {
      await persistencia.sessao.remover(CHAVES.sessao);
    },
  };
  const preferencias: RepositorioPreferencias = {
    async obterIdioma() {
      const valor = await persistencia.dados.ler(CHAVES.idioma);
      return valor === 'en' || valor === 'es' ? valor : 'pt';
    },
    async definirIdioma(idioma) {
      await persistencia.dados.gravar(CHAVES.idioma, idioma);
    },
  };
  return montarServicos(
    criarRepositorios(persistencia.dados, agora),
    sessoes,
    preferencias,
    persistencia.arquivos,
    agora,
  );
}
export function criarServicosEmMemoria(agora?: () => Date) {
  return criarServicosLocais(criarPersistenciaMemoria(), agora);
}
export type Servicos = ReturnType<typeof montarServicos>;
