import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarDays, FileText, GraduationCap } from 'lucide-react';
import { LinkButton } from '../shared/ui';
import { DOCUMENTOS_CANDIDATURA } from './documents';
import { EditalSummary } from './edital-summary';
import type { Edital } from './models';
import type { SituacaoInscricoes } from './admissions';

export function ApplicationGuide({
  edital,
  situacao,
}: {
  edital: Edital;
  situacao: SituacaoInscricoes;
}) {
  const { t } = useTranslation();
  return (
    <section className="application-guide" aria-labelledby="application-guide-title">
      <div className="section-title">
        <h2 id="application-guide-title">{t('guide.title')}</h2>
        <p>{t('guide.intro')}</p>
      </div>
      <div className="application-guide-grid">
        <section className="panel guide-prepare">
          <h3>{t('guide.prepare')}</h3>
          <p className="guide-copy">{t('guide.prepareText')}</p>
          <p className="guide-copy">{t('guide.exceptions')}</p>
          <LinkButton to="/aluno/universidades" variant="secondary">
            {t('guide.destinations')}
          </LinkButton>
        </section>
        <section className="panel guide-dates">
          <h3 className="guide-heading">
            <CalendarDays size={20} aria-hidden="true" />
            {t('guide.periods')}
          </h3>
          <EditalSummary edital={edital} situacao={situacao} />
        </section>
        <section className="panel guide-documents">
          <h3 className="guide-heading">
            <FileText size={20} aria-hidden="true" />
            {t('guide.documents')}
          </h3>
          <ul>
            {DOCUMENTOS_CANDIDATURA.map((documento) => (
              <li key={documento}>{t(`guide.document.${documento}`)}</li>
            ))}
          </ul>
          <p className="guide-note">{t('guide.fee')}</p>
          <p className="guide-note">{t('guide.language')}</p>
          <Link to="/aluno/atendimento" className="text-link">
            {t('guide.confirm')}
          </Link>
        </section>
        <section className="panel guide-return">
          <h3 className="guide-heading">
            <GraduationCap size={20} aria-hidden="true" />
            {t('guide.return')}
          </h3>
          <p className="guide-copy">{t('guide.credit')}</p>
        </section>
        <section className="panel guide-start">
          <h3>{t('guide.startTitle')}</h3>
          <p className="guide-copy">{t('guide.startDescription')}</p>
          <LinkButton to="/aluno/candidatura/nova">
            {t('guide.start')}
            <ArrowRight size={16} aria-hidden="true" />
          </LinkButton>
        </section>
      </div>
    </section>
  );
}
