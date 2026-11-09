import type { DocumentoCandidatura } from './models';
import { ErroAplicacao } from './models';

export const DOCUMENTOS_CANDIDATURA = [
  'form',
  'recommendation',
  'motivation',
  'photo',
  'passport',
  'transcript',
  'cv',
  'responsibility',
  'proficiency',
  'payment',
  'visa',
] as const;
export const LIMITE_ARQUIVO = 5 * 1024 * 1024;
export const FORMATOS_ARQUIVO = '.pdf,.jpg,.jpeg,.png';

export function situacaoDocumento(documento: DocumentoCandidatura) {
  if (!documento.anexo) return documento.recebido ? 'recebido' : 'pendente';
  if (documento.revisao?.anexoId === documento.anexo.id) return documento.revisao.situacao;
  return 'enviado';
}

export function resumoDocumentos(documentos: DocumentoCandidatura[]) {
  return {
    total: documentos.length,
    enviados: documentos.filter((doc) => doc.anexo || doc.recebido).length,
    aprovados: documentos.filter((doc) => situacaoDocumento(doc) === 'aprovado').length,
    correcoes: documentos.filter((doc) => situacaoDocumento(doc) === 'correcao').length,
    aguardando: documentos.filter((doc) => situacaoDocumento(doc) === 'enviado').length,
  };
}

export function normalizarDocumentos(documentos: DocumentoCandidatura[]): DocumentoCandidatura[] {
  return DOCUMENTOS_CANDIDATURA.map((chave) => {
    const anterior = documentos.find(
      (doc) => doc.chave === chave || (chave === 'proficiency' && doc.chave === 'certificate'),
    );
    return anterior ? { ...anterior, chave } : { chave, recebido: false };
  });
}

export function validarArquivo(arquivo: File) {
  if (!arquivo.size) throw new ErroAplicacao('documents.emptyFile');
  if (arquivo.size > LIMITE_ARQUIVO) throw new ErroAplicacao('documents.tooLarge');
  const extensao = arquivo.name.split('.').pop()?.toLowerCase();
  const tipos: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  const tipo = extensao ? tipos[extensao] : undefined;
  if (!tipo || (arquivo.type && arquivo.type !== tipo))
    throw new ErroAplicacao('documents.invalidType');
  return {
    nome: arquivo.name.split(/[\\/]/).pop()!.slice(0, 200),
    tipo,
    tamanho: arquivo.size,
  };
}
