import { useEffect, useId, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Trash2, Upload } from 'lucide-react';
import { servicos } from '../app/services';
import { proteger, erroFormulario } from '../app/routing';
import { FORMATOS_ARQUIVO, resumoDocumentos, situacaoDocumento } from './documents';
import { ErroAplicacao } from './models';
import type { Candidatura, DocumentoCandidatura } from './models';
import { DocumentFile } from './document-file';
import { DocumentStatus, DocumentReviewFeedback } from './document-status';

export const documentsAction = proteger(async ({ request }) => {
  await servicos.auth.exigirAluno();
  const formulario = await request.formData();
  const candidaturaId = String(formulario.get('candidaturaId') ?? '');
  const chave = String(formulario.get('documento') ?? '');
  try {
    if (formulario.get('acao') === 'remover') {
      await servicos.documentos.remover(candidaturaId, chave);
      return { ok: true, mensagem: 'documents.removed' };
    }
    const arquivo = formulario.get('arquivo');
    if (!(arquivo instanceof File)) throw new ErroAplicacao('documents.emptyFile');
    await servicos.documentos.anexar(candidaturaId, chave, arquivo);
    return { ok: true, mensagem: 'documents.saved' };
  } catch (erro) {
    return erroFormulario(erro);
  }
});

function DocumentUpload({
  candidaturaId,
  documento,
}: {
  candidaturaId: string;
  documento: DocumentoCandidatura;
}) {
  const { t } = useTranslation();
  const fetcher = useFetcher<typeof documentsAction>();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [selecionado, setSelecionado] = useState<File | null>(null);
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const busy = fetcher.state !== 'idle';
  const titulo = t(`documents.${documento.chave}`);
  useEffect(() => {
    setSelecionado(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [documento.anexo?.id]);
  function enviar() {
    if (!selecionado) return;
    setMostrarResultado(true);
    const formulario = new FormData();
    formulario.set('candidaturaId', candidaturaId);
    formulario.set('documento', documento.chave);
    formulario.set('arquivo', selecionado);
    formulario.set('acao', 'anexar');
    void fetcher.submit(formulario, {
      method: 'post',
      action: '/aluno/candidatura',
      encType: 'multipart/form-data',
      preventScrollReset: true,
    });
  }
  return (
    <li className="document-upload" aria-labelledby={`${id}-title`} aria-busy={busy}>
      <div className="document-upload-heading">
        <h3 id={`${id}-title`}>{titulo}</h3>
        <DocumentStatus documento={documento} />
      </div>
      <p className="small muted">{t(`guide.document.${documento.chave}`)}</p>
      <DocumentReviewFeedback documento={documento} />
      <DocumentFile candidaturaId={candidaturaId} documento={documento} />
      <input
        id={id}
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept={FORMATOS_ARQUIVO}
        aria-label={t('documents.fileFor', { document: titulo })}
        disabled={busy}
        onChange={(event) => {
          const arquivo = event.currentTarget.files?.[0];
          if (!arquivo) return;
          setSelecionado(arquivo);
          setMostrarResultado(false);
        }}
      />
      {selecionado && (
        <div className="selected-file" role="status">
          <strong>{selecionado.name}</strong>
          <p>{t('documents.notSent')}</p>
          {situacaoDocumento(documento) === 'aprovado' && <p>{t('review.replaceApproved')}</p>}
        </div>
      )}
      <div className="document-actions">
        <button
          type="button"
          className="button secondary"
          aria-controls={id}
          aria-label={t(documento.anexo ? 'documents.replaceFor' : 'documents.attachFor', {
            document: titulo,
          })}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Upload size={16} aria-hidden="true" />
          {t(documento.anexo ? 'documents.replace' : 'documents.attach')}
        </button>
        {selecionado && (
          <>
            <button
              type="button"
              className="button primary"
              aria-label={t('documents.sendFor', { document: titulo })}
              onClick={enviar}
              disabled={busy}
            >
              {t(busy ? 'documents.saving' : 'documents.send')}
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setSelecionado(null);
                setMostrarResultado(false);
                if (inputRef.current) inputRef.current.value = '';
              }}
              disabled={busy}
            >
              {t('app.cancel')}
            </button>
          </>
        )}
        {documento.anexo && (
          <>
            <fetcher.Form
              method="post"
              action="/aluno/candidatura"
              preventScrollReset
              onSubmit={() => setMostrarResultado(true)}
            >
              <input type="hidden" name="candidaturaId" value={candidaturaId} />
              <input type="hidden" name="documento" value={documento.chave} />
              <input type="hidden" name="acao" value="remover" />
              <button
                type="submit"
                className="text-link"
                aria-label={t('documents.removeFor', { document: titulo })}
                disabled={busy}
              >
                <Trash2 size={16} aria-hidden="true" />
                {t('documents.remove')}
              </button>
            </fetcher.Form>
          </>
        )}
      </div>
      {mostrarResultado && fetcher.data && 'mensagem' in fetcher.data && !busy && (
        <p role="status" className="small success-text">
          {t(fetcher.data.mensagem)}
        </p>
      )}
      {mostrarResultado && fetcher.data && 'erro' in fetcher.data && fetcher.data.erro && !busy && (
        <p role="alert" className="field-error">
          {t(fetcher.data.erro)}
        </p>
      )}
    </li>
  );
}

export function ApplicationDocuments({ candidatura }: { candidatura: Candidatura }) {
  const { t } = useTranslation();
  const resumo = resumoDocumentos(candidatura.documentos);
  return (
    <section className="panel application-documents" aria-labelledby="documents-title">
      <div className="section-heading">
        <h2 id="documents-title">{t('application.documents')}</h2>
        <span className="small muted">
          {t('documents.count', {
            count: candidatura.documentos.filter((doc) => doc.anexo || doc.recebido).length,
            total: candidatura.documentos.length,
          })}
        </span>
      </div>
      <p className="small muted">{t('documents.instructions')}</p>
      <p className="document-progress">{t('review.progress', resumo)}</p>
      <p className="documents-demo-note">{t('documents.local')}</p>
      <ul>
        {candidatura.documentos.map((doc) => (
          <DocumentUpload key={doc.chave} candidaturaId={candidatura.id} documento={doc} />
        ))}
      </ul>
    </section>
  );
}
