import { useTranslation } from 'react-i18next';
import { Badge } from '../shared/ui';
import type { DocumentoCandidatura } from './models';
import { situacaoDocumento } from './documents';
import { formatarData } from './i18n';

export function DocumentStatus({ documento }: { documento: DocumentoCandidatura }) {
  const { t } = useTranslation();
  const situacao = situacaoDocumento(documento);
  return (
    <Badge tone={situacao === 'aprovado' ? 'green' : situacao === 'enviado' ? 'blue' : 'amber'}>
      {t(`review.status.${situacao}`)}
    </Badge>
  );
}

export function DocumentReviewFeedback({ documento }: { documento: DocumentoCandidatura }) {
  const { t } = useTranslation();
  const revisao = documento.revisao;
  if (!revisao || !documento.anexo || revisao.anexoId !== documento.anexo.id) return null;
  return (
    <div className={`review-feedback ${revisao.situacao}`}>
      <strong>{t(revisao.situacao === 'correcao' ? 'review.guidance' : 'review.approval')}</strong>
      {revisao.orientacao && <p>{revisao.orientacao}</p>}
      <small>
        {revisao.revisadoPor} · {formatarData(revisao.revisadoEm)}
      </small>
    </div>
  );
}
