import { useId } from 'react';
import { Link, useFetcher, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Check, MessageSquare } from 'lucide-react';
import { servicos } from '../../app/services';
import { proteger, erroFormulario } from '../../app/routing';
import { Badge, BackLink, EmptyState, Feedback, Field, PageTitle } from '../../shared/ui';
import { ApplicationCard, ApplicationChoices } from '../components';
import { DocumentFile } from '../document-file';
import { DocumentStatus, DocumentReviewFeedback } from '../document-status';
import { resumoDocumentos } from '../documents';
import type { DocumentoCandidatura } from '../models';
import { nomePais } from '../i18n';

export const applicationsLoader = proteger(async () => servicos.candidaturas.listar());
export const applicationReviewLoader = proteger(async ({ params }) =>
  servicos.candidaturas.obter(params.id ?? ''),
);
export const applicationReviewAction = proteger(async ({ request, params }) => {
  await servicos.auth.exigirDri();
  const form = await request.formData();
  try {
    await servicos.documentos.revisar(
      params.id ?? '',
      String(form.get('documento') ?? ''),
      String(form.get('anexoId') ?? ''),
      String(form.get('situacao') ?? ''),
      String(form.get('orientacao') ?? ''),
    );
    return { ok: true };
  } catch (erro) {
    return erroFormulario(erro);
  }
});

export function ApplicationsPage() {
  const candidaturas = useLoaderData<typeof applicationsLoader>();
  const { t } = useTranslation();
  return (
    <>
      <PageTitle title={t('nav.applications')} description={t('review.intro')} />
      {!candidaturas.length ? (
        <EmptyState />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('review.student')}</th>
                <th>{t('review.destination')}</th>
                <th>{t('review.period')}</th>
                <th>{t('application.documents')}</th>
                <th>{t('review.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {candidaturas.map(({ candidatura, aluno, instituicao, opcoes }) => {
                const resumo = resumoDocumentos(candidatura.documentos);
                return (
                  <tr key={candidatura.id}>
                    <td data-label={t('review.student')}>
                      <strong>{aluno.nome}</strong>
                      <p className="small muted">{aluno.matricula}</p>
                    </td>
                    <td data-label={t('review.destination')}>
                      {opcoes.length > 1 ? (
                        <ApplicationChoices opcoes={opcoes} />
                      ) : (
                        <>
                          {instituicao?.nome ?? '—'}
                          {instituicao && (
                            <p className="small muted">{nomePais(instituicao.paisCodigo)}</p>
                          )}
                        </>
                      )}
                    </td>
                    <td data-label={t('review.period')}>{candidatura.periodo}</td>
                    <td data-label={t('application.documents')}>
                      <Badge
                        tone={
                          resumo.correcoes
                            ? 'amber'
                            : resumo.aprovados === resumo.total
                              ? 'green'
                              : 'blue'
                        }
                      >
                        {t(
                          resumo.correcoes
                            ? 'review.needsCorrection'
                            : resumo.aprovados === resumo.total
                              ? 'review.allApproved'
                              : resumo.aguardando
                                ? 'review.waitingReview'
                                : 'review.waitingFiles',
                        )}
                      </Badge>
                      <p className="small muted section-note">{t('review.listProgress', resumo)}</p>
                    </td>
                    <td data-label={t('review.actions')}>
                      <Link className="text-link" to={`/dri/candidaturas/${candidatura.id}`}>
                        {t('review.open')}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function DocumentReview({
  candidaturaId,
  documento,
}: {
  candidaturaId: string;
  documento: DocumentoCandidatura;
}) {
  const { t } = useTranslation();
  const id = useId();
  const fetcher = useFetcher<typeof applicationReviewAction>();
  const busy = fetcher.state !== 'idle';
  const titulo = t(`documents.${documento.chave}`);
  return (
    <li className="document-upload" aria-labelledby={id} aria-busy={busy}>
      <div className="document-upload-heading">
        <h3 id={id}>{titulo}</h3>
        <DocumentStatus documento={documento} />
      </div>
      <p className="small muted">{t(`guide.document.${documento.chave}`)}</p>
      <DocumentFile candidaturaId={candidaturaId} documento={documento} />
      <DocumentReviewFeedback documento={documento} />
      {documento.anexo ? (
        <fetcher.Form
          method="post"
          action={`/dri/candidaturas/${candidaturaId}`}
          className="document-review-form"
          preventScrollReset
          noValidate
          aria-label={t('review.formFor', { document: titulo })}
        >
          <input type="hidden" name="documento" value={documento.chave} />
          <input type="hidden" name="anexoId" value={documento.anexo.id} />
          <Field
            label={t('review.reason')}
            error={
              fetcher.data && 'erros' in fetcher.data ? fetcher.data.erros?.orientacao : undefined
            }
          >
            <textarea
              key={documento.anexo.id}
              name="orientacao"
              rows={3}
              maxLength={2000}
              defaultValue={documento.revisao?.orientacao ?? ''}
              disabled={busy}
            />
          </Field>
          <p className="small muted">{t('review.reasonHelp')}</p>
          <div className="actions">
            <button
              type="submit"
              name="situacao"
              value="aprovado"
              className="button primary"
              disabled={busy}
            >
              <Check size={17} />
              {t('review.approve')}
            </button>
            <button
              type="submit"
              name="situacao"
              value="correcao"
              className="button secondary"
              disabled={busy}
            >
              <MessageSquare size={17} />
              {t('review.requestCorrection')}
            </button>
          </div>
          {!(fetcher.data && 'erros' in fetcher.data && fetcher.data.erros?.orientacao) && (
            <Feedback result={fetcher.data} />
          )}
        </fetcher.Form>
      ) : (
        <p className="small muted">{t('review.noFile')}</p>
      )}
    </li>
  );
}

export function ApplicationReviewPage() {
  const contexto = useLoaderData<typeof applicationReviewLoader>();
  const { candidatura, aluno } = contexto;
  const { t } = useTranslation();
  return (
    <>
      <BackLink to="/dri/candidaturas" />
      <PageTitle
        title={t('review.applicationOf', { name: aluno.nome })}
        description={`${t('field.enrollment')}: ${aluno.matricula} · ${aluno.email}`}
      />
      <ApplicationCard contexto={contexto} detailed />
      <section
        className="panel application-documents section-note"
        aria-labelledby="review-documents-title"
      >
        <h2 id="review-documents-title">{t('review.documents')}</h2>
        <p className="small muted section-note">{t('review.instructions')}</p>
        <p className="documents-demo-note">{t('review.local')}</p>
        <ul>
          {candidatura.documentos.map((documento) => (
            <DocumentReview
              key={documento.chave}
              candidaturaId={candidatura.id}
              documento={documento}
            />
          ))}
        </ul>
      </section>
    </>
  );
}
