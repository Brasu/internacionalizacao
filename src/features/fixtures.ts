import type { Aluno, Aviso, BaseDados, Matricula } from './models';
import { normalizarDocumentos } from './documents';
import { criarEditalDemo } from './admissions';
export const alunoSemCandidatura: Aluno = {
  id: 'luiza',
  nome: 'Luiza Martins',
  matricula: '2612759',
  telefone: '(85) 99999-0003',
  email: 'luiza@example.com',
};
export const matriculaSemCandidatura: Matricula = {
  id: 'mat-luiza',
  alunoId: alunoSemCandidatura.id,
  cursoId: 'computacao',
  ativa: true,
  percentualConcluido: 45,
  mediaGlobal: 8.5,
  reprovacoes: 0,
};
export const contasDemo = [
  {
    id: 'usuario-ana',
    perfil: 'aluno' as const,
    nome: 'Carol',
    alunoId: 'ana',
    identificador: '2612758',
    senha: 'Aluno123!',
  },
  {
    id: 'usuario-dri',
    perfil: 'dri' as const,
    nome: 'Equipe DRI',
    identificador: 'dri@exemplo.com',
    senha: 'Dri123!',
  },
  {
    id: 'usuario-luiza',
    perfil: 'aluno' as const,
    nome: alunoSemCandidatura.nome,
    alunoId: alunoSemCandidatura.id,
    identificador: alunoSemCandidatura.matricula,
    senha: 'Aluno123!',
  },
];
export function criarAvisosDri(hoje = new Date()): Aviso[] {
  const ano = hoje.getFullYear();
  const usuarioId = contasDemo.find((conta) => conta.perfil === 'dri')!.id;
  return [
    {
      id: 'av-dri-1',
      perfil: 'dri',
      usuarioId,
      tipo: 'atualizacaoConvenios',
      data: `${ano}-11-10`,
      lido: false,
    },
    {
      id: 'av-dri-2',
      perfil: 'dri',
      usuarioId,
      tipo: 'documentosPendentes',
      data: `${ano}-11-13`,
      lido: false,
    },
    {
      id: 'av-dri-3',
      perfil: 'dri',
      usuarioId,
      tipo: 'vigenciaConvenios',
      data: `${ano}-11-20`,
      lido: false,
    },
  ];
}
export function criarFixtures(hoje = new Date()): BaseDados {
  const ano = hoje.getFullYear();
  const vigente = {
    inicioVigencia: `${ano}-01-01`,
    fimVigencia: `${ano + 1}-12-31`,
    ativo: true,
    observacoes: '',
  };
  return {
    versao: 1,
    edital: criarEditalDemo(hoje),
    alunos: [
      {
        id: 'ana',
        nome: 'Carol',
        matricula: '2612758',
        telefone: '(85) 99999-0001',
        email: 'aluno@exemplo.com',
      },
      {
        id: 'bruno',
        nome: 'Bruno Lima',
        matricula: '25100002',
        telefone: '(85) 99999-0002',
        email: 'bruno@example.com',
      },
      { ...alunoSemCandidatura },
    ],
    cursos: [
      { id: 'computacao', nome: 'course.computing', area: 'computing' },
      { id: 'administracao', nome: 'course.business', area: 'business' },
      { id: 'direito', nome: 'course.law', area: 'law' },
    ],
    matriculas: [
      {
        id: 'mat-ana',
        alunoId: 'ana',
        cursoId: 'computacao',
        ativa: true,
        percentualConcluido: 50,
        mediaGlobal: 8.2,
        reprovacoes: 0,
      },
      {
        id: 'mat-ana-inativa',
        alunoId: 'ana',
        cursoId: 'administracao',
        ativa: false,
        percentualConcluido: 20,
        mediaGlobal: 7,
        reprovacoes: 0,
      },
      {
        id: 'mat-bruno',
        alunoId: 'bruno',
        cursoId: 'administracao',
        ativa: true,
        percentualConcluido: 25,
        mediaGlobal: 6.5,
        reprovacoes: 1,
      },
      { ...matriculaSemCandidatura },
    ],
    instituicoes: [
      {
        id: 'lisboa',
        nome: 'Instituição demonstrativa de Lisboa',
        paisCodigo: 'PT',
        cidade: 'Lisboa',
        site: 'https://example.com/lisboa',
        emailInternacional: 'lisboa@example.com',
      },
      {
        id: 'madri',
        nome: 'Instituição demonstrativa de Madri',
        paisCodigo: 'ES',
        cidade: 'Madri',
        site: 'https://example.com/madri',
        emailInternacional: 'madri@example.com',
      },
      {
        id: 'montreal',
        nome: 'Instituição demonstrativa de Montreal',
        paisCodigo: 'CA',
        cidade: 'Montreal',
        site: 'https://example.com/montreal',
        emailInternacional: 'montreal@example.com',
      },
      {
        id: 'porto',
        nome: 'Instituição demonstrativa do Porto',
        paisCodigo: 'PT',
        cidade: 'Porto',
        site: 'https://example.com/porto',
        emailInternacional: 'porto@example.com',
      },
    ],
    convenios: [
      {
        id: 'conv-lisboa',
        instituicaoId: 'lisboa',
        cursosIds: ['computacao'],
        duracaoMeses: 6,
        idiomaEnsino: 'pt',
        ...vigente,
      },
      {
        id: 'conv-madri',
        instituicaoId: 'madri',
        cursosIds: ['computacao', 'administracao'],
        duracaoMeses: 12,
        idiomaEnsino: 'es',
        ...vigente,
      },
      {
        id: 'conv-montreal',
        instituicaoId: 'montreal',
        cursosIds: ['computacao'],
        duracaoMeses: 6,
        idiomaEnsino: 'en',
        ...vigente,
      },
      {
        id: 'conv-porto',
        instituicaoId: 'porto',
        cursosIds: ['administracao'],
        duracaoMeses: 6,
        idiomaEnsino: 'pt',
        ...vigente,
      },
      {
        id: 'conv-lisboa-inativo',
        instituicaoId: 'lisboa',
        cursosIds: ['computacao'],
        duracaoMeses: 12,
        idiomaEnsino: 'pt',
        ...vigente,
        ativo: false,
      },
    ],
    candidaturas: [
      {
        id: 'cand-ana',
        alunoId: 'ana',
        convenioId: 'conv-lisboa',
        periodo: `${ano + 1}.1`,
        etapaAtual: 1,
        atualizadaEm: `${ano}-11-08T10:00:00-03:00`,
        documentos: normalizarDocumentos([]),
      },
    ],
    intercambios: [
      {
        id: 'inter-ana',
        alunoId: 'ana',
        convenioId: 'conv-lisboa',
        periodo: `${ano + 1}.1`,
        situacao: 'andamento',
      },
      {
        id: 'inter-bruno',
        alunoId: 'bruno',
        convenioId: 'conv-porto',
        periodo: `${ano - 1}.2`,
        situacao: 'finalizado',
      },
    ],
    avisos: [
      {
        id: 'av-1',
        perfil: 'aluno',
        alunoId: 'ana',
        tipo: 'documentos',
        data: `${ano}-11-13`,
        lido: false,
      },
      {
        id: 'av-2',
        perfil: 'aluno',
        alunoId: 'ana',
        tipo: 'integracao',
        data: `${ano}-11-20`,
        lido: false,
      },
      {
        id: 'av-3',
        perfil: 'aluno',
        alunoId: 'ana',
        tipo: 'aula',
        data: `${ano}-11-23`,
        lido: true,
      },
      {
        id: 'av-4',
        perfil: 'aluno',
        alunoId: 'ana',
        tipo: 'feriado',
        data: `${ano}-12-08`,
        lido: true,
      },
      {
        id: 'av-5',
        perfil: 'aluno',
        alunoId: 'ana',
        tipo: 'inicio',
        data: `${ano + 1}-02-01`,
        lido: true,
      },
      {
        id: 'av-6',
        perfil: 'aluno',
        alunoId: 'ana',
        tipo: 'matricula',
        data: `${ano + 1}-01-20`,
        lido: true,
      },
      ...criarAvisosDri(hoje),
    ],
    solicitacoes: [
      {
        id: 'sol-1',
        alunoId: 'ana',
        protocolo: 'INT-0001',
        canal: 'email',
        assunto: 'demo.subject',
        situacao: 'aberta',
        mensagens: [
          {
            id: 'msg-1',
            autor: 'aluno',
            texto: 'demo.message',
            data: `${ano}-11-08T09:00:00-03:00`,
          },
        ],
      },
    ],
  };
}
