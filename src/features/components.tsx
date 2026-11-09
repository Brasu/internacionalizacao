import { Form, Link, useSearchParams, useSubmit, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Check, ShieldCheck, Landmark, MessageCircle } from 'lucide-react';
import { Badge, EmptyState, Field, LinkButton } from '../shared/ui';
import { avaliarElegibilidade } from './rules';
import { resumoDocumentos } from './documents';
import { formatarData, nomePais } from './i18n';
import type { Oportunidade, Aviso } from './models';
import type { Servicos } from './services';
export type ContextoAluno = Awaited<ReturnType<Servicos['aluno']['contexto']>>;
export function ApplicationChoices({ opcoes }: { opcoes: ContextoAluno['opcoes'] }) {
  const { t } = useTranslation();
  return (
    <dl className="application-choices">
      {opcoes.map((opcao) => (
        <div key={opcao.ordem}>
          <dt>{t(opcao.ordem === 1 ? 'admission.firstChoice' : 'admission.secondChoice')}</dt>
          <dd>
            {opcao.instituicao?.nome ?? '—'}
            {opcao.convenio && (
              <> · {t('duration.months', { count: opcao.convenio.duracaoMeses })}</>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function ApplicationTimeline({ atual }: { atual: number }) {
  const { t } = useTranslation();
  return (
    <ol className="timeline" aria-label={t('application.title')}>
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className={i <= atual ? 'current' : ''}
          aria-current={i === atual ? 'step' : undefined}
        >
          <span>{i < atual ? <Check size={12} /> : i + 1}</span>
          <small>
            {i === 1 ? (
              <>
                <span className="step-label-full">{t('application.step1')}</span>
                <span className="step-label-short">{t('application.step1Short')}</span>
              </>
            ) : (
              t(`application.step${i}`)
            )}
          </small>
        </li>
      ))}
    </ol>
  );
}
export function ApplicationCard({
  contexto,
  detailed = false,
}: {
  contexto: Pick<ContextoAluno, 'candidatura' | 'convenio' | 'instituicao' | 'opcoes'>;
  detailed?: boolean;
}) {
  const { t } = useTranslation();
  const c = contexto.candidatura;
  const resumo = resumoDocumentos(c?.documentos ?? []);
  if (!c)
    return (
      <section className="panel">
        <h2>{t('application.title')}</h2>
        <EmptyState message={t('application.empty')} />
      </section>
    );
  return (
    <section className="panel application-card">
      <div className="section-heading">
        <h2>{t('application.title')}</h2>
        <Badge
          tone={resumo.correcoes ? 'amber' : resumo.aprovados === resumo.total ? 'green' : 'amber'}
        >
          {t(
            resumo.correcoes
              ? 'review.needsCorrection'
              : resumo.aprovados === resumo.total
                ? 'review.allApproved'
                : resumo.aguardando > 0
                  ? 'review.waitingReview'
                  : c.etapaAtual < 2
                    ? 'application.pending'
                    : c.etapaAtual === 2
                      ? 'application.review'
                      : 'application.result',
          )}
        </Badge>
      </div>
      <h3>{t('application.process', { term: c.periodo })}</h3>
      {contexto.opcoes.length > 1 ? (
        <ApplicationChoices opcoes={contexto.opcoes} />
      ) : (
        <p className="muted small">
          {contexto.instituicao?.cidade}, {nomePais(contexto.instituicao?.paisCodigo ?? 'PT')} ·{' '}
          {t('duration.months', { count: contexto.convenio?.duracaoMeses ?? 6 })}
        </p>
      )}
      <ApplicationTimeline atual={c.etapaAtual} />
      {resumo.enviados > 0 && <p className="document-progress">{t('review.progress', resumo)}</p>}
      {detailed ? (
        <p className="muted small">
          {t('application.updated', { date: formatarData(c.atualizadaEm) })}
        </p>
      ) : (
        <LinkButton to="/aluno/candidatura">{t('application.track')}</LinkButton>
      )}
    </section>
  );
}
export function EligibilitySummary({ contexto }: { contexto: ContextoAluno }) {
  const { t } = useTranslation();
  const ativa = contexto.matriculas.find((m) => m.ativa);
  const situacao = ativa ? avaliarElegibilidade(ativa).situacao : 'inelegivel';
  return (
    <div className="eligibility-summary">
      <ShieldCheck size={20} />
      <div>
        <strong>{t(`eligibility.${situacao}`)}</strong>
        <p>{t(situacao === 'elegivel' ? 'eligibility.criteria' : 'eligibility.description')}</p>
      </div>
      <Link className="text-link" to="/aluno/elegibilidade">
        {t('eligibility.view')}
      </Link>
    </div>
  );
}
export function NoticesCard({
  avisos,
  compact = true,
  todosHref = '/aluno/avisos',
}: {
  avisos: Aviso[];
  compact?: boolean;
  todosHref?: string;
}) {
  const { t } = useTranslation();
  const lista = compact ? avisos.filter((a) => !a.lido).slice(0, 2) : avisos;
  return (
    <section className="panel notices-card" aria-label={t('nav.notices')}>
      <h2>{t('nav.notices')}</h2>
      {lista.length === 0 && (
        <EmptyState message={compact ? t('notices.emptyUnread') : undefined} />
      )}
      {lista.map((aviso) => (
        <div className="notice-row" key={aviso.id}>
          <time className="date-block" dateTime={aviso.data}>
            <strong>{formatarData(aviso.data, { day: '2-digit' })}</strong>
            <span>{formatarData(aviso.data, { month: 'short' })}</span>
          </time>
          <div>
            <h3>{t(`notices.${aviso.tipo}`)}</h3>
            <p>{t(`notices.${aviso.tipo}Text`)}</p>
          </div>
        </div>
      ))}
      {compact && (
        <Link className="text-link" to={todosHref}>
          {t('notices.all')}
        </Link>
      )}
    </section>
  );
}
export function UniversityFilters({ oportunidades }: { oportunidades: Oportunidade[] }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const submit = useSubmit();
  const location = useLocation();
  const paises = [...new Set(oportunidades.map((o) => o.instituicao.paisCodigo))];
  const duracoes = [
    ...new Set(oportunidades.flatMap((o) => o.convenios.map((c) => c.duracaoMeses))),
  ].sort((a, b) => a - b);
  return (
    <Form
      method="get"
      action={location.pathname}
      className="filters"
      onChange={(e) => submit(e.currentTarget)}
    >
      <Field label={t('filter.country')}>
        <select name="pais" value={params.get('pais') ?? ''} onChange={() => undefined}>
          <option value="">{t('filter.all')}</option>
          {paises.map((p) => (
            <option key={p} value={p}>
              {nomePais(p)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('filter.area')}>
        <select name="area" value={params.get('area') ?? ''} onChange={() => undefined}>
          <option value="">{t('filter.all')}</option>
          {['computing', 'business', 'law'].map((a) => (
            <option key={a} value={a}>
              {t(`area.${a}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('filter.duration')}>
        <select name="duracao" value={params.get('duracao') ?? ''} onChange={() => undefined}>
          <option value="">{t('filter.all')}</option>
          {duracoes.map((d) => (
            <option key={d} value={d}>
              {t('duration.months', { count: d })}
            </option>
          ))}
        </select>
      </Field>
      {['pais', 'area', 'duracao'].some((k) => params.get(k)) && (
        <Link className="text-link filter-clear" to={location.pathname}>
          {t('filter.clear')}
        </Link>
      )}
    </Form>
  );
}
export function UniversityCards({ oportunidades }: { oportunidades: Oportunidade[] }) {
  const { t } = useTranslation();
  if (!oportunidades.length) return <EmptyState message={t('filter.empty')} />;
  return (
    <div className="university-grid">
      {oportunidades.map((o, indice) => (
        <article className="university-card" key={o.instituicao.id}>
          <div className={`university-cover cover-${indice % 3}`}>
            <Landmark size={28} />
            <span>{nomePais(o.instituicao.paisCodigo)}</span>
          </div>
          <div className="university-body">
            <h3>
              <Link to={`/aluno/universidades/${o.instituicao.id}`}>{o.instituicao.nome}</Link>
            </h3>
            <p>
              {o.instituicao.cidade} ·{' '}
              {[...new Set(o.convenios.map((c) => c.duracaoMeses))]
                .map((count) => t('duration.months', { count }))
                .join(' / ')}
            </p>
            <Link className="text-link" to={`/aluno/universidades/${o.instituicao.id}`}>
              {t('university.details')}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
export function HelpStrip({ showDescription = true }: { showDescription?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className={showDescription ? 'help-strip' : 'help-strip justify-end'}>
      {showDescription && <div></div>}
      <div className="actions">
        <Link className="text-link" to="/aluno/apoio">
          {t('home.support')}
        </Link>
        <LinkButton to="/aluno/atendimento" variant="secondary">
          <MessageCircle size={16} />
          {t('home.talk')}
        </LinkButton>
      </div>
    </div>
  );
}
