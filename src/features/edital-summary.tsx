import { useTranslation } from 'react-i18next';
import { Badge } from '../shared/ui';
import { formatarData } from './i18n';
import type { Edital } from './models';
import type { SituacaoInscricoes } from './admissions';

export function EditalSummary({
  edital,
  situacao,
}: {
  edital: Edital;
  situacao: SituacaoInscricoes;
}) {
  const { t } = useTranslation();
  return (
    <div className="edital-summary">
      <Badge tone={situacao === 'abertas' ? 'green' : 'amber'}>{t(`admission.${situacao}`)}</Badge>
      {edital.publicado && (
        <>
          <p>
            <strong>
              {t('admission.noticeNumber', { number: edital.numero })} · {edital.titulo}
            </strong>
          </p>
          <dl className="edital-facts">
            <div>
              <dt>{t('admission.term')}</dt>
              <dd>{edital.periodo}</dd>
            </div>
            <div>
              <dt>{t('admission.opens')}</dt>
              <dd>{formatarData(edital.inicioInscricoes)}</dd>
            </div>
            <div>
              <dt>{t('admission.closes')}</dt>
              <dd>{formatarData(edital.fimInscricoes)}</dd>
            </div>
          </dl>
          <p className="small muted">{t('admission.timezone')}</p>
          {edital.descricao && <p className="small muted edital-description">{edital.descricao}</p>}
          {edital.url && (
            <a href={edital.url} target="_blank" rel="noreferrer" className="text-link">
              {t('admission.readNotice')}
            </a>
          )}
        </>
      )}
    </div>
  );
}
