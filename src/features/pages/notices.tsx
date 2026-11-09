import { useFetcher, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { servicos } from '../../app/services';
import { erroFormulario, proteger } from '../../app/routing';
import { Badge, EmptyState, Feedback, PageTitle } from '../../shared/ui';
import { formatarData } from '../i18n';

export const noticesLoader = proteger(async () => {
  const sessao = await servicos.auth.exigirSessao();
  return { perfil: sessao.perfil, avisos: await servicos.avisos.listar() };
});

export const noticesAction = proteger(async ({ request }) => {
  const form = await request.formData();
  try {
    await servicos.avisos.marcarComoLido(String(form.get('avisoId') ?? ''));
    return { ok: true };
  } catch (erro) {
    return erroFormulario(erro);
  }
});

export function NoticesPage() {
  const { perfil, avisos } = useLoaderData<typeof noticesLoader>();
  const { t } = useTranslation();
  const fetcher = useFetcher<typeof noticesAction>();
  return (
    <>
      <PageTitle
        title={t('nav.notices')}
        description={t(perfil === 'dri' ? 'notices.driIntro' : 'support.calendarText')}
      />
      <Feedback result={fetcher.data} />
      <section className="panel">
        {!avisos.length && <EmptyState />}
        {avisos.map((aviso) => (
          <article key={aviso.id} className="notice-full">
            <time className="date-block" dateTime={aviso.data}>
              <strong>{formatarData(aviso.data, { day: '2-digit' })}</strong>
              <span>{formatarData(aviso.data, { month: 'short' })}</span>
            </time>
            <div>
              <h2>{t(`notices.${aviso.tipo}`)}</h2>
              <p>{t(`notices.${aviso.tipo}Text`)}</p>
              <small className="muted">{formatarData(aviso.data)}</small>
            </div>
            {aviso.lido ? (
              <Badge tone="neutral">{t('notices.done')}</Badge>
            ) : (
              <fetcher.Form method="post">
                <input type="hidden" name="avisoId" value={aviso.id} />
                <button className="text-link" type="submit" disabled={fetcher.state !== 'idle'}>
                  {t('notices.read')}
                </button>
              </fetcher.Form>
            )}
          </article>
        ))}
      </section>
    </>
  );
}
