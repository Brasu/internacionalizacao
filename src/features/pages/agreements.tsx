import { useEffect, useState } from 'react';
import { Form, Link, redirect, useActionData, useFetcher, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Building2 } from 'lucide-react';
import { servicos } from '../../app/services';
import { proteger, erroFormulario, valoresFormulario } from '../../app/routing';
import { ErroAplicacao } from '../models';
import { estaVigente, dataLocal } from '../rules';
import { nomePais, nomeIdioma, formatarData } from '../i18n';
import {
  PageTitle,
  LinkButton,
  Badge,
  SavedFeedback,
  EmptyState,
  Field,
  Feedback,
  SubmitButton,
  Button,
} from '../../shared/ui';
export const agreementsLoader = proteger(async () => servicos.catalogo.obter());
export const agreementFormLoader = proteger(async ({ params }) => {
  const catalogo = await servicos.catalogo.obter();
  const convenio = params.id ? catalogo.convenios.find((c) => c.id === params.id) : undefined;
  if (params.id && !convenio) throw new ErroAplicacao('errors.notFound');
  return { ...catalogo, convenio };
});
export const agreementAction = proteger(async ({ request, params }) => {
  await servicos.auth.exigirDri();
  const valores = await request.formData();
  const intent = String(valores.get('intent') ?? 'convenio');
  try {
    if (intent === 'instituicao') {
      const item = await servicos.instituicoes.salvar(
        String(valores.get('instituicaoEditId') || '') || undefined,
        {
          nome: String(valores.get('nome') ?? '').trim(),
          paisCodigo: String(valores.get('paisCodigo') ?? ''),
          cidade: String(valores.get('cidade') ?? '').trim(),
          site: String(valores.get('site') ?? '').trim(),
          emailInternacional: String(valores.get('emailInternacional') ?? '').trim(),
        },
      );
      return { ok: true, id: item.id };
    }
    if (intent === 'status') {
      await servicos.convenios.definirAtivo(
        String(valores.get('id') ?? ''),
        valores.get('ativo') === 'true',
      );
      return { ok: true };
    }
    await servicos.convenios.salvar(params.id, {
      instituicaoId: String(valores.get('instituicaoId') ?? ''),
      cursosIds: valores.getAll('cursosIds').map(String),
      duracaoMeses: Number(valores.get('duracaoMeses')),
      idiomaEnsino: String(valores.get('idiomaEnsino') ?? '').trim(),
      inicioVigencia: String(valores.get('inicioVigencia') ?? ''),
      fimVigencia: String(valores.get('fimVigencia') ?? ''),
      ativo: valores.get('ativo') === 'on',
      observacoes: String(valores.get('observacoes') ?? '').trim(),
    });
    return redirect('/dri/convenios?salvo=1');
  } catch (erro) {
    return erroFormulario(erro, valoresFormulario(valores));
  }
});
export function AgreementsPage() {
  const { instituicoes, cursos, convenios } = useLoaderData<typeof agreementsLoader>();
  const { t } = useTranslation();
  const fetcher = useFetcher<typeof agreementAction>();
  return (
    <>
      <PageTitle
        title={t('agreements.title')}
        description={t('agreements.subtitle')}
        action={
          <LinkButton to="/dri/convenios/novo">
            <Plus size={17} />
            {t('agreements.new')}
          </LinkButton>
        }
      />
      <SavedFeedback />
      <Feedback result={fetcher.data} />
      <div className="table-wrap">
        {!convenios.length ? (
          <EmptyState />
        ) : (
          <table className="agreements-table">
            <thead>
              <tr>
                <th>{t('field.institution')}</th>
                <th>{t('field.courses')}</th>
                <th>{t('filter.duration')}</th>
                <th>{t('agreements.status')}</th>
                <th>{t('agreements.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {convenios.map((c) => {
                const i = instituicoes.find((i) => i.id === c.instituicaoId);
                return (
                  <tr key={c.id}>
                    <td data-label={t('field.institution')}>
                      <strong>{i?.nome}</strong>
                      <small className="cell-sub">
                        {i?.cidade} · {nomePais(i?.paisCodigo ?? 'BR')}
                      </small>
                    </td>
                    <td data-label={t('field.courses')}>
                      {c.cursosIds
                        .map((id) => t(cursos.find((curso) => curso.id === id)?.nome ?? ''))
                        .join(', ')}
                    </td>
                    <td data-label={t('filter.duration')}>
                      {t('duration.months', { count: c.duracaoMeses })}
                      <small className="cell-sub">{nomeIdioma(c.idiomaEnsino)}</small>
                    </td>
                    <td data-label={t('agreements.status')}>
                      <Badge
                        tone={!c.ativo ? 'neutral' : estaVigente(c, new Date()) ? 'green' : 'amber'}
                      >
                        {t(
                          !c.ativo
                            ? 'agreements.inactive'
                            : estaVigente(c, new Date())
                              ? 'agreements.active'
                              : 'agreements.outside',
                        )}
                      </Badge>
                      <small className="cell-sub">{formatarData(c.fimVigencia)}</small>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link className="text-link" to={`/dri/convenios/${c.id}/editar`}>
                          <Pencil size={14} />
                          {t('agreements.editAction')}
                        </Link>
                        <fetcher.Form method="post">
                          <input type="hidden" name="intent" value="status" />
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="ativo" value={String(!c.ativo)} />
                          <button
                            className="text-link"
                            type="submit"
                            disabled={fetcher.state !== 'idle'}
                          >
                            {t(c.ativo ? 'agreements.deactivate' : 'agreements.activate')}
                          </button>
                        </fetcher.Form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="small muted section-note">{t('agreements.history')}</p>
    </>
  );
}
export function AgreementFormPage() {
  const { instituicoes, cursos, convenio } = useLoaderData<typeof agreementFormLoader>();
  const resultado = useActionData<typeof agreementAction>();
  const fetcher = useFetcher<typeof agreementAction>();
  const { t } = useTranslation();
  const [instituicaoId, setInstituicaoId] = useState(convenio?.instituicaoId ?? '');
  const [editarInstituicao, setEditarInstituicao] = useState(convenio?.instituicaoId ?? '');
  useEffect(() => {
    if (fetcher.data && 'id' in fetcher.data && fetcher.data.id) {
      setInstituicaoId(fetcher.data.id);
      setEditarInstituicao(fetcher.data.id);
    }
  }, [fetcher.data]);
  const instituicao = instituicoes.find((i) => i.id === editarInstituicao);
  const erros = resultado && 'erros' in resultado ? resultado.erros : undefined;
  const errosInstituicao = fetcher.data && 'erros' in fetcher.data ? fetcher.data.erros : undefined;
  return (
    <>
      <PageTitle
        title={t(convenio ? 'agreements.edit' : 'agreements.new')}
        description={t('agreements.subtitle')}
      />
      <Feedback result={resultado} />
      <div className="agreement-form-layout">
        <section>
          <Form method="post" className="form-grid max-form" noValidate>
            <input type="hidden" name="intent" value="convenio" />
            <div className="full">
              <Field label={t('field.institution')} error={erros?.instituicaoId}>
                <select
                  name="instituicaoId"
                  value={instituicaoId}
                  onChange={(e) => setInstituicaoId(e.target.value)}
                  aria-invalid={Boolean(erros?.instituicaoId)}
                >
                  <option value="">{t('agreements.select')}</option>
                  {instituicoes.map((i) => (
                    <option value={i.id} key={i.id}>
                      {i.nome} · {nomePais(i.paisCodigo)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <fieldset className="course-options full">
              <legend>{t('field.courses')}</legend>
              {cursos.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    name="cursosIds"
                    value={c.id}
                    defaultChecked={convenio?.cursosIds.includes(c.id)}
                  />
                  <span>{t(c.nome)}</span>
                </label>
              ))}
              {erros?.cursosIds && (
                <p className="field-error" role="alert">
                  {t(erros.cursosIds)}
                </p>
              )}
            </fieldset>
            <Field
              name="duracaoMeses"
              label={t('agreements.months')}
              type="number"
              min="1"
              step="1"
              defaultValue={convenio?.duracaoMeses ?? 6}
              error={erros?.duracaoMeses}
              required
            />
            <Field label={t('university.language')} error={erros?.idiomaEnsino}>
              <select name="idiomaEnsino" defaultValue={convenio?.idiomaEnsino ?? 'pt'}>
                {['pt', 'en', 'es', 'fr', 'de', 'it'].map((idioma) => (
                  <option value={idioma} key={idioma}>
                    {nomeIdioma(idioma)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              name="inicioVigencia"
              label={t('field.start')}
              type="date"
              defaultValue={convenio?.inicioVigencia ?? dataLocal(new Date())}
              error={erros?.inicioVigencia}
              required
            />
            <Field
              name="fimVigencia"
              label={t('field.end')}
              type="date"
              defaultValue={convenio?.fimVigencia ?? `${new Date().getFullYear() + 1}-12-31`}
              error={erros?.fimVigencia}
              required
            />
            <div className="full">
              <Field label={`${t('field.notes')} · ${t('field.optional')}`}>
                <textarea name="observacoes" rows={3} defaultValue={convenio?.observacoes ?? ''} />
              </Field>
            </div>
            <label className="check-field full">
              <input type="checkbox" name="ativo" defaultChecked={convenio?.ativo ?? true} />
              <span>{t('agreements.available')}</span>
            </label>
            <div className="actions full">
              <SubmitButton>{t(convenio ? 'app.save' : 'agreements.new')}</SubmitButton>
              <LinkButton to="/dri/convenios" variant="secondary">
                {t('app.cancel')}
              </LinkButton>
            </div>
          </Form>
        </section>
        <aside className="institution-editor">
          <details>
            <summary>
              <Building2 size={19} />
              {t('agreements.institutionForm')}
            </summary>
            <div className="institution-editor-content">
              <p className="small muted">{t('agreements.sharedInstitution')}</p>
              <Field label={t('agreements.existing')}>
                <select
                  value={editarInstituicao}
                  onChange={(e) => setEditarInstituicao(e.target.value)}
                >
                  <option value="">{t('agreements.newInstitution')}</option>
                  {instituicoes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Feedback result={fetcher.data} />
              {fetcher.data && 'ok' in fetcher.data && fetcher.data.ok && (
                <p className="small success-text" role="status">
                  {t('agreements.institutionSaved')}
                </p>
              )}
              <fetcher.Form method="post" className="form-stack" key={editarInstituicao} noValidate>
                <input type="hidden" name="intent" value="instituicao" />
                <input type="hidden" name="instituicaoEditId" value={editarInstituicao} />
                <Field
                  label={t('field.institutionName')}
                  name="nome"
                  defaultValue={instituicao?.nome ?? ''}
                  error={errosInstituicao?.nome}
                  required
                />
                <Field label={t('filter.country')} error={errosInstituicao?.paisCodigo}>
                  <select name="paisCodigo" defaultValue={instituicao?.paisCodigo ?? 'PT'}>
                    {[
                      'PT',
                      'ES',
                      'CA',
                      'US',
                      'FR',
                      'DE',
                      'IT',
                      'AR',
                      'CL',
                      'MX',
                      'BR',
                      'GB',
                      'AU',
                      'JP',
                    ].map((p) => (
                      <option key={p} value={p}>
                        {nomePais(p)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={t('field.city')}
                  name="cidade"
                  defaultValue={instituicao?.cidade ?? ''}
                  error={errosInstituicao?.cidade}
                  required
                />
                <Field
                  label={`${t('university.website')} · ${t('field.optional')}`}
                  name="site"
                  type="url"
                  defaultValue={instituicao?.site ?? ''}
                  error={errosInstituicao?.site}
                />
                <Field
                  label={`${t('university.contact')} · ${t('field.optional')}`}
                  name="emailInternacional"
                  type="email"
                  defaultValue={instituicao?.emailInternacional ?? ''}
                  error={errosInstituicao?.emailInternacional}
                />
                <Button type="submit" disabled={fetcher.state !== 'idle'}>
                  {t(fetcher.state !== 'idle' ? 'app.saving' : 'agreements.saveInstitution')}
                </Button>
              </fetcher.Form>
            </div>
          </details>
        </aside>
      </div>
    </>
  );
}
