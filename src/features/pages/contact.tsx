import { Form, Link, redirect, useActionData, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { MessagesSquare } from 'lucide-react';
import { servicos } from '../../app/services';
import { proteger, erroFormulario, valoresFormulario } from '../../app/routing';
import type { CanalAtendimento } from '../models';
import {
  PageTitle,
  Field,
  Feedback,
  SubmitButton,
  Badge,
  EmptyState,
  SavedFeedback,
  BackLink,
} from '../../shared/ui';
import { formatarData } from '../i18n';
export const contactLoader = proteger(async () => {
  const sessao = await servicos.auth.exigirSessao();
  const solicitacoes = await servicos.atendimento.listar();
  return { sessao, solicitacoes };
});
export const contactDetailLoader = proteger(async ({ params }) => ({
  sessao: await servicos.auth.exigirSessao(),
  solicitacao: await servicos.atendimento.obter(params.id ?? ''),
}));
export const contactAction = proteger(async ({ request, params }) => {
  const sessao = await servicos.auth.exigirSessao();
  const valores = valoresFormulario(await request.formData());
  try {
    if (params.id) {
      await servicos.atendimento.responder(params.id, valores.mensagem ?? '');
      return redirect(`/dri/atendimento/${params.id}?salvo=1`);
    }
    const item = await servicos.atendimento.criar({
      canal: valores.canal as CanalAtendimento,
      assunto: valores.assunto ?? '',
      mensagem: valores.mensagem ?? '',
    });
    return redirect(`/${sessao.perfil}/atendimento/${item.id}?salvo=1`);
  } catch (erro) {
    return erroFormulario(erro, valores);
  }
});
export function ContactPage() {
  const { sessao, solicitacoes } = useLoaderData<typeof contactLoader>();
  const { t } = useTranslation();
  const result = useActionData<typeof contactAction>();
  const dri = sessao.perfil === 'dri';
  return (
    <>
      <PageTitle
        title={t(dri ? 'contact.queue' : 'contact.title')}
        description={t('contact.subtitle')}
      />
      <div className="feedback info">
        <MessagesSquare size={20} />
        {t('contact.note')}
      </div>
      <div className={dri ? '' : 'detail-grid'}>
        {!dri && (
          <section className="panel">
            <h2>{t('contact.new')}</h2>
            <Feedback result={result} />
            <Form method="post" className="form-stack section-note">
              <Field label={t('contact.channel')}>
                <select name="canal">
                  {['portal', 'email', 'whatsapp'].map((c) => (
                    <option key={c} value={c}>
                      {t(`contact.${c}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('contact.subject')} name="assunto" required maxLength={200} />
              <Field label={t('contact.message')}>
                <textarea name="mensagem" rows={5} required />
              </Field>
              <SubmitButton>{t('contact.send')}</SubmitButton>
            </Form>
          </section>
        )}
        <section className="panel">
          <h2>{t(dri ? 'contact.queue' : 'contact.mine')}</h2>
          {solicitacoes.length === 0 && <EmptyState />}
          <div className="request-list">
            {solicitacoes.map((s) => (
              <article key={s.id}>
                <div className="section-heading">
                  <Link className="text-link" to={`/${sessao.perfil}/atendimento/${s.id}`}>
                    {s.protocolo}
                  </Link>
                  <Badge tone={s.situacao === 'aberta' ? 'amber' : 'green'}>
                    {t(`contact.${s.situacao}`)}
                  </Badge>
                </div>
                <h3>
                  <Link to={`/${sessao.perfil}/atendimento/${s.id}`}>
                    {s.assunto === 'demo.subject' ? t(s.assunto) : s.assunto}
                  </Link>
                </h3>
                <p className="small muted">{t(`contact.${s.canal}`)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
export function ContactDetailPage() {
  const { sessao, solicitacao: s } = useLoaderData<typeof contactDetailLoader>();
  const { t } = useTranslation();
  const result = useActionData<typeof contactAction>();
  return (
    <>
      <BackLink to={`/${sessao.perfil}/atendimento`} />
      <PageTitle
        title={`${s.protocolo} · ${s.assunto === 'demo.subject' ? t(s.assunto) : s.assunto}`}
        description={`${t(`contact.${s.canal}`)} · ${t(`contact.${s.situacao}`)}`}
      />
      <SavedFeedback />
      <div className="feedback info">{t('contact.note')}</div>
      <section className="panel">
        <h2>{t('contact.history')}</h2>
        <div className="message-list">
          {s.mensagens.map((m) => (
            <article key={m.id} className={`message message-${m.autor}`}>
              <div className="section-heading">
                <strong>{t(`role.${m.autor}`)}</strong>
                <time className="small muted">
                  {formatarData(m.data, {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <p>{m.texto === 'demo.message' ? t(m.texto) : m.texto}</p>
            </article>
          ))}
        </div>
      </section>
      {sessao.perfil === 'dri' && (
        <section className="panel section-note">
          <h2>{t('contact.reply')}</h2>
          <Feedback result={result} />
          <Form method="post" className="form-stack section-note">
            <Field label={t('contact.message')}>
              <textarea name="mensagem" rows={4} required />
            </Field>
            <div>
              <SubmitButton>{t('contact.sendReply')}</SubmitButton>
            </div>
          </Form>
        </section>
      )}
    </>
  );
}
