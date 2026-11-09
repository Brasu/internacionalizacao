import type {
  Convenio,
  Matricula,
  NovoAluno,
  NovoConvenio,
  NovaInstituicao,
  ErrosCampos,
} from './models';
import { ErroAplicacao } from './models';
export function dataLocal(hoje: Date) {
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}
export function estaVigente(convenio: Convenio, hoje: Date) {
  const data = dataLocal(hoje);
  return convenio.inicioVigencia <= data && convenio.fimVigencia >= data;
}
export function avaliarElegibilidade(m: Matricula) {
  if (m.percentualConcluido === null || m.mediaGlobal === null || m.reprovacoes === null)
    return { situacao: 'inconclusiva' as const, criterios: null };
  const criterios = {
    active: m.ativa,
    completion: m.percentualConcluido >= 30 && m.percentualConcluido <= 70,
    grade: m.mediaGlobal >= 7,
    failures: m.reprovacoes === 0,
  };
  return {
    situacao: Object.values(criterios).every(Boolean)
      ? ('elegivel' as const)
      : ('inelegivel' as const),
    criterios,
  };
}
function verificar(erros: ErrosCampos) {
  if (Object.keys(erros).length) throw new ErroAplicacao('errors.form', erros);
}
export function validarAluno(dados: NovoAluno) {
  const erros: ErrosCampos = {};
  for (const campo of ['nome', 'matricula', 'telefone', 'email'] as const)
    if (!dados[campo].trim()) erros[campo] = 'errors.required';
  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) erros.email = 'errors.email';
  verificar(erros);
  return Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, v.trim()])) as NovoAluno;
}
export function validarInstituicao(d: NovaInstituicao) {
  const erros: ErrosCampos = {};
  for (const campo of ['nome', 'paisCodigo', 'cidade'] as const)
    if (!d[campo].trim()) erros[campo] = 'errors.required';
  if (!/^[A-Z]{2}$/.test(d.paisCodigo)) erros.paisCodigo = 'errors.country';
  if (d.site) {
    try {
      const url = new URL(d.site);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
    } catch {
      erros.site = 'errors.url';
    }
  }
  if (d.emailInternacional && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.emailInternacional))
    erros.emailInternacional = 'errors.email';
  verificar(erros);
  return d;
}
function dataValida(data: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(data) &&
    !Number.isNaN(Date.parse(data)) &&
    new Date(data).toISOString().slice(0, 10) === data
  );
}
export function validarConvenio(d: NovoConvenio, instituicoesIds: string[], cursosIds: string[]) {
  const erros: ErrosCampos = {};
  if (!instituicoesIds.includes(d.instituicaoId)) erros.instituicaoId = 'errors.institution';
  if (!d.cursosIds.length || !d.cursosIds.every((id) => cursosIds.includes(id)))
    erros.cursosIds = 'errors.courses';
  if (!Number.isInteger(d.duracaoMeses) || d.duracaoMeses <= 0)
    erros.duracaoMeses = 'errors.duration';
  if (!d.idiomaEnsino.trim()) erros.idiomaEnsino = 'errors.required';
  if (!dataValida(d.inicioVigencia)) erros.inicioVigencia = 'errors.date';
  if (!dataValida(d.fimVigencia) || d.fimVigencia < d.inicioVigencia)
    erros.fimVigencia = 'errors.validity';
  verificar(erros);
  return { ...d, cursosIds: [...new Set(d.cursosIds)] };
}
