export type Idioma = 'pt' | 'en' | 'es';
export type Perfil = 'aluno' | 'dri';
export type Sessao = { usuarioId: string; perfil: Perfil; nome: string; alunoId?: string };
export type NovoAluno = { nome: string; matricula: string; telefone: string; email: string };
export type Aluno = NovoAluno & { id: string };
export type Curso = { id: string; nome: string; area: string };
export type Matricula = {
  id: string;
  alunoId: string;
  cursoId: string;
  ativa: boolean;
  percentualConcluido: number | null;
  mediaGlobal: number | null;
  reprovacoes: number | null;
};
export type Instituicao = {
  id: string;
  nome: string;
  paisCodigo: string;
  cidade: string;
  site: string;
  emailInternacional: string;
};
export type NovaInstituicao = Omit<Instituicao, 'id'>;
export type Convenio = {
  id: string;
  instituicaoId: string;
  cursosIds: string[];
  duracaoMeses: number;
  idiomaEnsino: string;
  inicioVigencia: string;
  fimVigencia: string;
  ativo: boolean;
  observacoes: string;
};
export type NovoConvenio = Omit<Convenio, 'id'>;
export type Oportunidade = { instituicao: Instituicao; convenios: Convenio[] };
export type Filtros = { pais?: string; area?: string; duracao?: string };
export type Edital = {
  id: string;
  numero: string;
  titulo: string;
  periodo: string;
  inicioInscricoes: string;
  fimInscricoes: string;
  descricao: string;
  url: string;
  publicado: boolean;
};
export type DadosEdital = Omit<Edital, 'id'>;
export type AnexoDocumento = {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  enviadoEm: string;
};
export type RevisaoDocumento = {
  anexoId: string;
  situacao: 'aprovado' | 'correcao';
  orientacao: string;
  revisadoEm: string;
  revisadoPor: string;
};
export type DocumentoCandidatura = {
  chave: string;
  recebido: boolean;
  anexo?: AnexoDocumento;
  revisao?: RevisaoDocumento;
};
export type Candidatura = {
  id: string;
  alunoId: string;
  convenioId: string;
  segundaOpcaoConvenioId?: string;
  etapaAtual: number;
  periodo: string;
  atualizadaEm: string;
  documentos: DocumentoCandidatura[];
  edital?: Edital;
};
export type SituacaoIntercambio = 'andamento' | 'finalizado';
export type Intercambio = {
  id: string;
  alunoId: string;
  convenioId: string;
  periodo: string;
  situacao: SituacaoIntercambio;
};
export type TipoAvisoAluno =
  'documentos' | 'integracao' | 'aula' | 'feriado' | 'inicio' | 'matricula';
export type TipoAvisoDri = 'atualizacaoConvenios' | 'documentosPendentes' | 'vigenciaConvenios';
export type TipoAviso = TipoAvisoAluno | TipoAvisoDri;
export type Aviso = { id: string; data: string; lido: boolean } & (
  | { perfil: 'aluno'; alunoId: string; tipo: TipoAvisoAluno }
  | { perfil: 'dri'; usuarioId: string; tipo: TipoAvisoDri }
);
export type CanalAtendimento = 'portal' | 'email' | 'whatsapp';
export type Mensagem = { id: string; autor: Perfil; texto: string; data: string };
export type Solicitacao = {
  id: string;
  alunoId: string;
  protocolo: string;
  canal: CanalAtendimento;
  assunto: string;
  situacao: 'aberta' | 'respondida';
  mensagens: Mensagem[];
};
export type BaseDados = {
  versao: 1;
  edital: Edital;
  alunos: Aluno[];
  cursos: Curso[];
  matriculas: Matricula[];
  instituicoes: Instituicao[];
  convenios: Convenio[];
  candidaturas: Candidatura[];
  intercambios: Intercambio[];
  avisos: Aviso[];
  solicitacoes: Solicitacao[];
};
export type ErrosCampos = Record<string, string>;
export class ErroAplicacao extends Error {
  constructor(
    public chave: string,
    public campos: ErrosCampos = {},
  ) {
    super(chave);
  }
}
export type ResultadoFormulario = {
  erros?: ErrosCampos;
  erro?: string;
  ok?: boolean;
  id?: string;
  valores?: Record<string, string>;
};
