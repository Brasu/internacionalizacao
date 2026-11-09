import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Eye, FileText, X } from 'lucide-react';
import { servicos } from '../app/services';
import { ErroAplicacao } from './models';
import type { DocumentoCandidatura } from './models';
import { formatarData, localidade } from './i18n';

export function DocumentFile({
  candidaturaId,
  documento,
}: {
  candidaturaId: string;
  documento: DocumentoCandidatura;
}) {
  const { t } = useTranslation();
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; tipo: string; nome: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titulo = t(`documents.${documento.chave}`);
  useEffect(() => {
    if (!preview) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      URL.revokeObjectURL(preview.url);
    };
  }, [preview]);
  async function abrir(visualizar: boolean) {
    try {
      setBusy(true);
      setErro('');
      const { arquivo, nome } = await servicos.documentos.baixar(candidaturaId, documento.chave);
      const url = URL.createObjectURL(arquivo);
      if (visualizar) {
        setPreview({ url, tipo: arquivo.type, nome });
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = nome;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      setErro(error instanceof ErroAplicacao ? error.chave : 'errors.generic');
    } finally {
      setBusy(false);
    }
  }
  const anexo = documento.anexo;
  if (!anexo) return null;
  return (
    <>
      <div className="attached-file">
        <FileText size={18} aria-hidden="true" />
        <div>
          <p>{anexo.nome}</p>
          <small>
            {new Intl.NumberFormat(localidade(), {
              style: 'unit',
              unit: anexo.tamanho < 1024 ? 'byte' : 'kilobyte',
              maximumFractionDigits: 1,
            }).format(anexo.tamanho < 1024 ? anexo.tamanho : anexo.tamanho / 1024)}
            {' · '}
            {formatarData(anexo.enviadoEm)}
          </small>
        </div>
      </div>
      <div className="document-actions">
        <button
          type="button"
          className="text-link"
          onClick={() => void abrir(true)}
          disabled={busy}
          aria-label={t('review.viewFor', { document: titulo })}
        >
          <Eye size={16} aria-hidden="true" />
          {t('review.view')}
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => void abrir(false)}
          disabled={busy}
          aria-label={t('documents.downloadFor', { document: titulo })}
        >
          <Download size={16} aria-hidden="true" />
          {t('documents.download')}
        </button>
      </div>
      {erro && (
        <p role="alert" className="field-error">
          {t(erro)}
        </p>
      )}
      <dialog
        ref={dialogRef}
        className="document-preview"
        aria-label={t('review.preview', { document: titulo })}
        onCancel={() => setPreview(null)}
        onClose={() => setPreview(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPreview(null);
        }}
      >
        {preview && (
          <div className="document-preview-content">
            <div className="section-heading">
              <h2>{preview.nome}</h2>
              <button
                type="button"
                className="button secondary"
                onClick={() => setPreview(null)}
                aria-label={t('review.closePreview')}
              >
                <X size={18} />
                {t('review.close')}
              </button>
            </div>
            {preview.tipo.startsWith('image/') ? (
              <img src={preview.url} alt={preview.nome} />
            ) : (
              <iframe src={preview.url} title={titulo} />
            )}
            <p className="small muted">{t('review.previewHelp')}</p>
            <button type="button" className="text-link" onClick={() => void abrir(false)}>
              <Download size={16} />
              {t('documents.download')}
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
