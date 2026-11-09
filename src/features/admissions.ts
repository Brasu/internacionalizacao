import type { BaseDados, Candidatura, DadosEdital, Edital, ErrosCampos } from './models';
import { ErroAplicacao } from './models';
import { avaliarElegibilidade, estaVigente } from './rules';
import { normalizarDocumentos } from './documents';

export function criarEditalDemo(hoje: Date): Edital {
  const ano = Number(dataInscricao(hoje).slice(0, 4));
  return {
    id: 'edital-demo',
    numero: `01/${ano}`,
    titulo: 'Mobilidade acadêmica internacional',
    periodo: `${ano + 1}.1`,
    inicioInscricoes: `${ano}-01-01`,
    fimInscricoes: `${ano}-12-31`,
    descricao:
      'Edital demonstrativo para intercâmbio acadêmico. Consulte os destinos disponíveis para seu curso e prepare os documentos solicitados.',
    url: '',
    publicado: true,
  };
}

export function dataInscricao(hoje: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(hoje);
}

export function situacaoInscricoes(edital: Edital, hoje: Date) {
  const data = dataInscricao(hoje);
  if (!edital.publicado) return 'naoPublicado' as const;
  if (data < edital.inicioInscricoes) return 'emBreve' as const;
  if (data > edital.fimInscricoes) return 'encerradas' as const;
  return 'abertas' as const;
}
export type SituacaoInscricoes = ReturnType<typeof situacaoInscricoes>;

function dataValida(data: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(data) &&
    Number.isFinite(Date.parse(data)) &&
    new Date(data).toISOString().slice(0, 10) === data
  );
}

export function validarEdital(dados: DadosEdital): DadosEdital {
  const d = { ...dados };
  const erros: ErrosCampos = {};
  for (const campo of [
    'numero',
    'titulo',
    'periodo',
    'inicioInscricoes',
    'fimInscricoes',
    'descricao',
    'url',
  ] as const) {
    d[campo] = d[campo].trim();
  }
  for (const campo of ['numero', 'titulo'] as const) {
    if (!d[campo]) erros[campo] = 'errors.required';
    else if (d[campo].length > 160) erros[campo] = 'admission.tooLong';
  }
  if (!/^\d{4}\.[12]$/.test(d.periodo)) erros.periodo = 'admission.invalidTerm';
  if (!dataValida(d.inicioInscricoes)) erros.inicioInscricoes = 'errors.date';
  if (!dataValida(d.fimInscricoes) || d.fimInscricoes < d.inicioInscricoes)
    erros.fimInscricoes = 'admission.invalidDates';
  if (d.descricao.length > 2000) erros.descricao = 'admission.tooLong';
  if (d.url) {
    try {
      if (!['https:', 'http:'].includes(new URL(d.url).protocol)) throw new Error();
    } catch {
      erros.url = 'errors.url';
    }
  }
  if (Object.keys(erros).length) throw new ErroAplicacao('errors.form', erros);
  return d;
}

export function prepararCandidatura(
  base: BaseDados,
  alunoId: string,
  convenioId: string,
  editalId: string,
  hoje: Date,
  segundaOpcaoConvenioId = '',
): Omit<Candidatura, 'id'> {
  if (base.candidaturas.some((c) => c.alunoId === alunoId))
    throw new ErroAplicacao('admission.exists');
  if (editalId !== base.edital.id) throw new ErroAplicacao('admission.changed');
  if (situacaoInscricoes(base.edital, hoje) !== 'abertas')
    throw new ErroAplicacao('admission.closed');
  if (segundaOpcaoConvenioId && segundaOpcaoConvenioId === convenioId) {
    throw new ErroAplicacao('errors.form', { segundaOpcaoConvenioId: 'admission.duplicateChoice' });
  }
  for (const [campo, id] of [
    ['convenioId', convenioId],
    ...(segundaOpcaoConvenioId ? [['segundaOpcaoConvenioId', segundaOpcaoConvenioId]] : []),
  ]) {
    const convenio = base.convenios.find((c) => c.id === id);
    if (
      !convenio ||
      !convenio.ativo ||
      !estaVigente(convenio, hoje) ||
      !base.instituicoes.some((i) => i.id === convenio.instituicaoId)
    ) {
      throw new ErroAplicacao('errors.form', { [campo]: 'admission.invalidDestination' });
    }
    const matriculas = base.matriculas.filter(
      (m) => m.alunoId === alunoId && convenio.cursosIds.includes(m.cursoId),
    );
    if (!matriculas.some((m) => avaliarElegibilidade(m).situacao === 'elegivel')) {
      throw new ErroAplicacao('admission.ineligible', { [campo]: 'admission.ineligible' });
    }
  }
  return {
    alunoId,
    convenioId,
    ...(segundaOpcaoConvenioId ? { segundaOpcaoConvenioId } : {}),
    periodo: base.edital.periodo,
    etapaAtual: 1,
    atualizadaEm: hoje.toISOString(),
    documentos: normalizarDocumentos([]),
    edital: structuredClone(base.edital),
  };
}
