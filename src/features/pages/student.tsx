import { Link, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ShieldCheck,
  X,
  Landmark,
  CalendarDays,
  Bus,
  Utensils,
  HandHeart,
  ExternalLink,
} from 'lucide-react';
import { servicos } from '../../app/services';
import { proteger } from '../../app/routing';
import {
  ApplicationCard,
  EligibilitySummary,
  NoticesCard,
  UniversityCards,
  UniversityFilters,
  HelpStrip,
} from '../components';
import { Badge, PageTitle, BackLink, EmptyState, SavedFeedback, LinkButton } from '../../shared/ui';
import { avaliarElegibilidade } from '../rules';
import { formatarData, nomePais, nomeIdioma, localidade } from '../i18n';
import { ApplicationGuide } from '../application-guide';
import { ApplicationDocuments } from '../application-documents';
export const homeLoader = proteger(async () => {
  const [contexto, inscricoes] = await Promise.all([
    servicos.aluno.contexto(),
    servicos.edital.obter(),
  ]);
  return { contexto, ...inscricoes };
});
export const universitiesLoader = proteger(async ({ request }) => {
  const p = new URL(request.url).searchParams;
  const [contexto, todas, oportunidades] = await Promise.all([
    servicos.aluno.contexto(),
    servicos.oportunidades.listar(),
    servicos.oportunidades.listar({
      pais: p.get('pais') || undefined,
      area: p.get('area') || undefined,
      duracao: p.get('duracao') || undefined,
    }),
  ]);
  return { contexto, todas, oportunidades };
});
export const universityLoader = proteger(async ({ params }) => ({
  oportunidade: await servicos.oportunidades.obter(params.id ?? ''),
}));
export const contextLoader = proteger(async () => servicos.aluno.contexto());
export function HomePage() {
  const { contexto, edital, situacao } = useLoaderData<typeof homeLoader>();
  const { t } = useTranslation();
  const ativas = contexto.matriculas.filter((m) => m.ativa);
  return (
    <>
      <PageTitle
        title={t('home.hello', { name: contexto.aluno.nome.split(' ')[0] })}
        description={`${ativas.map((m) => t(contexto.cursos.find((c) => c.id === m.cursoId)?.nome ?? '')).join(' / ')} · ${contexto.aluno.matricula}`}
        action={
          <Badge tone={ativas.length ? 'green' : 'amber'}>
            <Check size={14} />
            {t(ativas.length ? 'home.active' : 'home.inactive')}
          </Badge>
        }
      />
      <div
        className={`dashboard-overview${contexto.candidatura || contexto.avisos.length ? ' dashboard-split' : ''}`}
      >
        <div>
          {contexto.candidatura && <ApplicationCard contexto={contexto} />}
          <EligibilitySummary contexto={contexto} />
        </div>
        {(contexto.candidatura || contexto.avisos.length > 0) && (
          <NoticesCard avisos={contexto.avisos} />
        )}
      </div>
      {!contexto.candidatura && <ApplicationGuide edital={edital} situacao={situacao} />}
      <HelpStrip showDescription={false} />
    </>
  );
}
export function UniversitiesPage() {
  const { contexto, todas, oportunidades } = useLoaderData<typeof universitiesLoader>();
  const { t } = useTranslation();
  return (
    <>
      <PageTitle title={t('nav.universities')} description={t('home.options')} />
      <div className="feedback info">
        <ShieldCheck size={19} />
        {contexto.aluno.nome} · {contexto.aluno.matricula} ·{' '}
        {t(contexto.matriculas.some((m) => m.ativa) ? 'home.active' : 'home.inactive')}
      </div>
      <UniversityFilters oportunidades={todas} />
      <UniversityCards oportunidades={oportunidades} />
      <p className="small muted section-note">{t('app.exampleInfo')}</p>
      <HelpStrip />
    </>
  );
}
export function UniversityPage() {
  const { oportunidade: o } = useLoaderData<typeof universityLoader>();
  const { t } = useTranslation();
  return (
    <>
      <BackLink to="/aluno/universidades" />
      <PageTitle
        title={o.instituicao.nome}
        description={`${o.instituicao.cidade}, ${nomePais(o.instituicao.paisCodigo)}`}
      />
      <div className="feedback info">{t('app.exampleInfo')}</div>
      <section className="panel">
        <h2>{t('university.available')}</h2>
        <div className="agreement-options">
          {o.convenios.map((c) => (
            <article key={c.id}>
              <div className="section-heading">
                <h3>{t('duration.months', { count: c.duracaoMeses })}</h3>
                <Badge tone="green">{t('agreements.active')}</Badge>
              </div>
              <p>
                {t('university.language')}: {nomeIdioma(c.idiomaEnsino)}
              </p>
              <p>
                {t('university.validity')}: {formatarData(c.inicioVigencia)} —{' '}
                {formatarData(c.fimVigencia)}
              </p>
              {c.observacoes && <p>{c.observacoes}</p>}
            </article>
          ))}
        </div>
      </section>
      <div className="detail-grid">
        <section className="panel">
          <h2>{t('support.institution')}</h2>
          <p className="section-note">
            {o.instituicao.nome}
            <br />
            {o.instituicao.cidade}, {nomePais(o.instituicao.paisCodigo)}
          </p>
          {o.instituicao.site && (
            <a className="text-link" href={o.instituicao.site} target="_blank" rel="noreferrer">
              {t('university.website')}
              <ExternalLink size={14} />
            </a>
          )}
          {o.instituicao.emailInternacional && (
            <p className="small">
              {t('university.contact')}: {o.instituicao.emailInternacional}
            </p>
          )}
        </section>
        <section className="panel">
          <h2>{t('support.calendar')}</h2>
          <p className="section-note">{t('support.calendarText')}</p>
          <Link to="/aluno/avisos" className="text-link">
            {t('notices.all')}
          </Link>
        </section>
      </div>
      <HelpStrip />
    </>
  );
}
export function EligibilityPage() {
  const contexto = useLoaderData<typeof contextLoader>();
  const { t } = useTranslation();
  const matriculasAtivas = contexto.matriculas.filter((m) => m.ativa);
  return (
    <>
      <PageTitle title={t('eligibility.title')} description={t('eligibility.description')} />
      {!matriculasAtivas.length && <EmptyState message={t('filter.noEnrollment')} />}
      <div className="stack">
        {matriculasAtivas.map((m) => {
          const resultado = avaliarElegibilidade(m);
          return (
            <section className="panel" key={m.id}>
              <div className="section-heading">
                <h2>{t(contexto.cursos.find((c) => c.id === m.cursoId)?.nome ?? '')}</h2>
                <Badge tone={resultado.situacao === 'elegivel' ? 'green' : 'amber'}>
                  {t(`eligibility.${resultado.situacao}`)}
                </Badge>
              </div>
              <p className="small muted">
                {t('eligibility.values', {
                  completion: m.percentualConcluido ?? '—',
                  grade:
                    m.mediaGlobal === null
                      ? '—'
                      : new Intl.NumberFormat(localidade()).format(m.mediaGlobal),
                  failures: m.reprovacoes ?? '—',
                })}
              </p>
              {resultado.criterios && (
                <ul className="checklist">
                  {Object.entries(resultado.criterios).map(([key, valor]) => (
                    <li key={key} className={valor ? 'met' : 'unmet'}>
                      {valor ? <Check size={19} /> : <X size={19} />}
                      <span>{t(`eligibility.${key}`)}</span>
                      <small>{t(valor ? 'eligibility.met' : 'eligibility.unmet')}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
export function ApplicationPage() {
  const contexto = useLoaderData<typeof contextLoader>();
  const { t } = useTranslation();
  return (
    <>
      <PageTitle title={t('application.title')} description={t('documents.pageIntro')} />
      <SavedFeedback />
      <ApplicationCard contexto={contexto} detailed />
      {!contexto.candidatura && (
        <div className="actions section-note">
          <LinkButton to="/aluno/candidatura/nova">{t('guide.start')}</LinkButton>
        </div>
      )}
      {contexto.candidatura && (
        <div className="detail-grid application-details">
          <ApplicationDocuments candidatura={contexto.candidatura} />
          <NoticesCard avisos={contexto.avisos} />
        </div>
      )}
      <HelpStrip />
    </>
  );
}
export function SupportPage() {
  const contexto = useLoaderData<typeof contextLoader>();
  const { t } = useTranslation();
  const i = contexto.instituicao;
  return (
    <>
      <PageTitle
        title={t('nav.support')}
        description={i ? `${i.nome} · ${nomePais(i.paisCodigo)}` : t('support.general')}
      />
      <div className="feedback info">{t('support.disclaimer')}</div>
      <div className="support-grid">
        <section className="panel">
          <Landmark />
          <h2>{t('support.institution')}</h2>
          <p>{i ? `${i.nome} · ${i.cidade}, ${nomePais(i.paisCodigo)}` : t('support.general')}</p>
          {i?.site && (
            <a className="text-link" href={i.site} target="_blank" rel="noreferrer">
              {t('university.website')}
              <ExternalLink size={14} />
            </a>
          )}
        </section>
        <section className="panel">
          <CalendarDays />
          <h2>{t('support.calendar')}</h2>
          <p>{t('support.calendarText')}</p>
          <Link to="/aluno/avisos" className="text-link">
            {t('notices.all')}
          </Link>
        </section>
        <section className="panel">
          <Bus />
          <h2>{t('support.transport')}</h2>
          <p>{t('support.transportText', { city: i?.cidade ?? 'Fortaleza' })}</p>
        </section>
        <section className="panel">
          <Utensils />
          <h2>{t('support.food')}</h2>
          <p>{t('support.foodText')}</p>
        </section>
        <section className="panel">
          <HandHeart />
          <h2>{t('support.services')}</h2>
          <p>{t('support.servicesText')}</p>
        </section>
      </div>
      <HelpStrip />
    </>
  );
}
