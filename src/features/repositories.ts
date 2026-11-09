import type { ArmazenamentoJson } from '../shared/persistence';
import { CHAVES } from '../shared/persistence';
import {
  alunoSemCandidatura,
  contasDemo,
  criarAvisosDri,
  criarFixtures,
  matriculaSemCandidatura,
} from './fixtures';
import { ErroAplicacao } from './models';
import type { BaseDados, DadosEdital, DocumentoCandidatura, RevisaoDocumento } from './models';
import { normalizarDocumentos } from './documents';
import { criarEditalDemo, prepararCandidatura } from './admissions';
type DadosRepositorio<T> = T extends { id: string } ? Omit<T, 'id'> : never;
export interface Repositorio<T extends { id: string }> {
  listar(): Promise<T[]>;
  obter(id: string): Promise<T | null>;
  criar(dados: DadosRepositorio<T>): Promise<T>;
  atualizar(id: string, dados: DadosRepositorio<T>): Promise<T>;
}
const registro = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown) => typeof v === 'string';
const numero = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const opcionalNumero = (v: unknown) => v === null || numero(v);
const textos = (v: unknown) => Array.isArray(v) && v.every(texto);
const campos = (v: Record<string, unknown>, nomes: string[]) => nomes.every((k) => texto(v[k]));
const editalValido = (v: unknown) =>
  registro(v) &&
  campos(v, [
    'id',
    'numero',
    'titulo',
    'periodo',
    'inicioInscricoes',
    'fimInscricoes',
    'descricao',
    'url',
  ]) &&
  typeof v.publicado === 'boolean';
function validarBase(v: unknown): v is BaseDados {
  if (!registro(v) || v.versao !== 1) return false;
  if (v.edital !== undefined && !editalValido(v.edital)) return false;
  const validadores: Record<string, (item: Record<string, unknown>) => boolean> = {
    alunos: (x) => campos(x, ['nome', 'matricula', 'telefone', 'email']),
    cursos: (x) => campos(x, ['nome', 'area']),
    matriculas: (x) =>
      campos(x, ['alunoId', 'cursoId']) &&
      typeof x.ativa === 'boolean' &&
      ['percentualConcluido', 'mediaGlobal', 'reprovacoes'].every((k) => opcionalNumero(x[k])),
    instituicoes: (x) => campos(x, ['nome', 'paisCodigo', 'cidade', 'site', 'emailInternacional']),
    convenios: (x) =>
      campos(x, [
        'instituicaoId',
        'idiomaEnsino',
        'inicioVigencia',
        'fimVigencia',
        'observacoes',
      ]) &&
      textos(x.cursosIds) &&
      numero(x.duracaoMeses) &&
      typeof x.ativo === 'boolean',
    candidaturas: (x) =>
      campos(x, ['alunoId', 'convenioId', 'periodo', 'atualizadaEm']) &&
      (x.segundaOpcaoConvenioId === undefined || texto(x.segundaOpcaoConvenioId)) &&
      (x.edital === undefined || editalValido(x.edital)) &&
      Number.isInteger(x.etapaAtual) &&
      Number(x.etapaAtual) >= 0 &&
      Number(x.etapaAtual) <= 3 &&
      Array.isArray(x.documentos) &&
      x.documentos.every(
        (d) =>
          registro(d) &&
          texto(d.chave) &&
          typeof d.recebido === 'boolean' &&
          (d.revisao === undefined ||
            (registro(d.revisao) &&
              campos(d.revisao, ['anexoId', 'orientacao', 'revisadoEm', 'revisadoPor']) &&
              ['aprovado', 'correcao'].includes(String(d.revisao.situacao)))) &&
          (d.anexo === undefined ||
            (registro(d.anexo) &&
              campos(d.anexo, ['id', 'nome', 'tipo', 'enviadoEm']) &&
              numero(d.anexo.tamanho) &&
              Number(d.anexo.tamanho) > 0)),
      ),
    intercambios: (x) =>
      campos(x, ['alunoId', 'convenioId', 'periodo']) &&
      ['andamento', 'finalizado'].includes(String(x.situacao)),
    avisos: (x) =>
      texto(x.data) &&
      typeof x.lido === 'boolean' &&
      (((x.perfil === undefined || x.perfil === 'aluno') &&
        texto(x.alunoId) &&
        ['documentos', 'integracao', 'aula', 'feriado', 'inicio', 'matricula'].includes(
          String(x.tipo),
        )) ||
        (x.perfil === 'dri' &&
          texto(x.usuarioId) &&
          ['atualizacaoConvenios', 'documentosPendentes', 'vigenciaConvenios'].includes(
            String(x.tipo),
          ))),
    solicitacoes: (x) =>
      campos(x, ['alunoId', 'protocolo', 'assunto']) &&
      ['portal', 'email', 'whatsapp'].includes(String(x.canal)) &&
      ['aberta', 'respondida'].includes(String(x.situacao)) &&
      Array.isArray(x.mensagens) &&
      x.mensagens.every(
        (m) =>
          registro(m) &&
          campos(m, ['id', 'texto', 'data']) &&
          ['aluno', 'dri'].includes(String(m.autor)),
      ),
  };
  return Object.entries(validadores).every(([chave, validar]) => {
    const lista = v[chave];
    return (
      Array.isArray(lista) &&
      lista.every((x) => registro(x) && texto(x.id) && validar(x)) &&
      new Set(lista.map((x) => (x as { id: string }).id)).size === lista.length
    );
  });
}
export function criarRepositorios(store: ArmazenamentoJson, agora: () => Date = () => new Date()) {
  let fila: Promise<unknown> = Promise.resolve();
  async function ler(): Promise<BaseDados> {
    const dados = await store.ler(CHAVES.base);
    if (dados === null) return criarFixtures(agora());
    if (!validarBase(dados)) throw new ErroAplicacao('errors.storageInvalid');
    for (const aviso of dados.avisos) aviso.perfil ??= 'aluno';
    for (const aviso of criarAvisosDri(agora())) {
      if (!dados.avisos.some((item) => item.id === aviso.id)) dados.avisos.push(aviso);
    }
    dados.edital ??= criarEditalDemo(agora());
    if (!dados.alunos.some((aluno) => aluno.id === alunoSemCandidatura.id)) {
      dados.alunos.push({ ...alunoSemCandidatura });
    }
    if (!dados.matriculas.some((matricula) => matricula.id === matriculaSemCandidatura.id)) {
      dados.matriculas.push({ ...matriculaSemCandidatura });
    }
    const contaAluno = contasDemo.find((conta) => conta.perfil === 'aluno');
    const alunoLegado = dados.alunos.find((aluno) => aluno.id === contaAluno?.alunoId);
    if (contaAluno && alunoLegado?.nome === 'Ana Costa' && alunoLegado.matricula === '26100001') {
      alunoLegado.nome = contaAluno.nome;
      alunoLegado.matricula = contaAluno.identificador;
    }
    for (const candidatura of dados.candidaturas) {
      candidatura.documentos = normalizarDocumentos(candidatura.documentos);
    }
    return dados;
  }
  function alterar<T>(operacao: (base: BaseDados) => T): Promise<T> {
    const trabalho = fila.then(async () => {
      const base = await ler();
      const resultado = operacao(base);
      await store.gravar(CHAVES.base, base);
      return structuredClone(resultado);
    });
    fila = trabalho.catch(() => undefined);
    return trabalho;
  }
  function tabela<T extends { id: string }>(seletor: (base: BaseDados) => T[]): Repositorio<T> {
    return {
      async listar() {
        return seletor(await ler());
      },
      async obter(id) {
        return seletor(await ler()).find((item) => item.id === id) ?? null;
      },
      async criar(dados) {
        return alterar((base) => {
          const item = { ...dados, id: crypto.randomUUID() } as unknown as T;
          seletor(base).push(item);
          return item;
        });
      },
      async atualizar(id, dados) {
        return alterar((base) => {
          const lista = seletor(base);
          const indice = lista.findIndex((item) => item.id === id);
          if (indice < 0) throw new ErroAplicacao('errors.notFound');
          lista[indice] = { ...dados, id } as unknown as T;
          return lista[indice];
        });
      },
    };
  }
  return {
    edital: {
      async obter() {
        return (await ler()).edital;
      },
      async salvar(dados: DadosEdital) {
        return alterar((base) => {
          base.edital = { ...dados, id: crypto.randomUUID() };
          return base.edital;
        });
      },
    },
    alunos: tabela((base) => base.alunos),
    cursos: tabela((base) => base.cursos),
    matriculas: tabela((base) => base.matriculas),
    instituicoes: tabela((base) => base.instituicoes),
    convenios: tabela((base) => base.convenios),
    candidaturas: {
      ...tabela((base) => base.candidaturas),
      async iniciar(
        alunoId: string,
        convenioId: string,
        editalId: string,
        segundaOpcaoConvenioId = '',
      ) {
        return alterar((base) => {
          const dados = prepararCandidatura(
            base,
            alunoId,
            convenioId,
            editalId,
            agora(),
            segundaOpcaoConvenioId,
          );
          const candidatura = { ...dados, id: crypto.randomUUID() };
          base.candidaturas.push(candidatura);
          return candidatura;
        });
      },
      async atualizarDocumento(id: string, documento: DocumentoCandidatura, data: string) {
        return alterar((base) => {
          const candidatura = base.candidaturas.find((item) => item.id === id);
          const anterior = candidatura?.documentos.find((doc) => doc.chave === documento.chave);
          if (!candidatura || !anterior) throw new ErroAplicacao('errors.notFound');
          candidatura.documentos = candidatura.documentos.map((doc) =>
            doc.chave === documento.chave ? documento : doc,
          );
          candidatura.atualizadaEm = data;
          return anterior;
        });
      },
      async revisarDocumento(id: string, chave: string, revisao: RevisaoDocumento) {
        return alterar((base) => {
          const candidatura = base.candidaturas.find((item) => item.id === id);
          const documento = candidatura?.documentos.find((doc) => doc.chave === chave);
          if (!candidatura || !documento) throw new ErroAplicacao('errors.notFound');
          if (!documento.anexo || documento.anexo.id !== revisao.anexoId)
            throw new ErroAplicacao('review.changed');
          documento.revisao = revisao;
          candidatura.atualizadaEm = revisao.revisadoEm;
          return documento;
        });
      },
    },
    intercambios: tabela((base) => base.intercambios),
    avisos: tabela((base) => base.avisos),
    solicitacoes: tabela((base) => base.solicitacoes),
    async restaurar() {
      await fila;
      await store.remover(CHAVES.base);
    },
  };
}
export type Repositorios = ReturnType<typeof criarRepositorios>;
