import { Form, redirect, useActionData, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { servicos } from '../../app/services';
import { proteger, erroFormulario, valoresFormulario } from '../../app/routing';
import {
  BackLink,
  Button,
  Feedback,
  Field,
  LinkButton,
  PageTitle,
  SavedFeedback,
  SubmitButton,
} from '../../shared/ui';
import { EditalSummary } from '../edital-summary';
import { nomeIdioma, nomePais } from '../i18n';

export const editalLoader = proteger(async () => {
  await servicos.auth.exigirDri();
  return servicos.edital.obter();
});
export const editalAction = proteger(async ({ request }) => {
  await servicos.auth.exigirDri();
  const valores = valoresFormulario(await request.formData());
  try {
    await servicos.edital.salvar({
      numero: valores.numero ?? '',
      titulo: valores.titulo ?? '',
      periodo: valores.periodo ?? '',
      inicioInscricoes: valores.inicioInscricoes ?? '',
      fimInscricoes: valores.fimInscricoes ?? '',
      descricao: valores.descricao ?? '',
      url: valores.url ?? '',
      publicado: valores.publicado === 'on',
    });
    return redirect('/dri/edital?salvo=1');
  } catch (erro) {
    return erroFormulario(erro, valores);
  }
});

export function EditalPage() {
  const { edital, situacao } = useLoaderData<typeof editalLoader>();
  const result = useActionData<typeof editalAction>();
  const { t } = useTranslation();
  const valor = (campo: keyof typeof edital) => result?.valores?.[campo] ?? String(edital[campo]);
  return (
    <>
      <PageTitle title={t('admission.manage')} description={t('admission.manageIntro')} />
      <SavedFeedback />
      <Feedback result={result} />
      <div className="admission-layout">
        <section className="panel">
          <h2>{t('admission.noticeData')}</h2>
          <Form method="post" className="form-grid section-note" noValidate key={edital.id}>
            <Field
              label={t('admission.number')}
              name="numero"
              defaultValue={valor('numero')}
              error={result?.erros?.numero}
              required
              maxLength={160}
            />
            <Field
              label={t('admission.term')}
              name="periodo"
              defaultValue={valor('periodo')}
              error={result?.erros?.periodo}
              placeholder="2027.1"
              required
            />
            <div className="full">
              <Field
                label={t('admission.title')}
                name="titulo"
                defaultValue={valor('titulo')}
                error={result?.erros?.titulo}
                required
                maxLength={160}
              />
            </div>
            <Field
              label={t('admission.opens')}
              name="inicioInscricoes"
              type="date"
              defaultValue={valor('inicioInscricoes')}
              error={result?.erros?.inicioInscricoes}
              required
            />
            <Field
              label={t('admission.closes')}
              name="fimInscricoes"
              type="date"
              defaultValue={valor('fimInscricoes')}
              error={result?.erros?.fimInscricoes}
              required
            />
            <p className="small muted full">{t('admission.timezone')}</p>
            <div className="full">
              <Field label={t('admission.description')} error={result?.erros?.descricao}>
                <textarea
                  name="descricao"
                  rows={4}
                  maxLength={2000}
                  defaultValue={valor('descricao')}
                />
              </Field>
            </div>
            <div className="full">
              <Field
                label={t('admission.url')}
                name="url"
                type="url"
                defaultValue={valor('url')}
                error={result?.erros?.url}
                placeholder="https://"
              />
            </div>
            <label className="check-field full">
              <input
                type="checkbox"
                name="publicado"
                defaultChecked={
                  result?.valores ? result.valores.publicado === 'on' : edital.publicado
                }
              />
              {t('admission.published')}
            </label>
            <div className="actions full">
              <SubmitButton>{t('admission.save')}</SubmitButton>
              <LinkButton to="/dri" variant="secondary">
                {t('app.cancel')}
              </LinkButton>
            </div>
          </Form>
        </section>
        <aside className="panel">
          <h2>{t('admission.currentNotice')}</h2>
          <EditalSummary edital={edital} situacao={situacao} />
        </aside>
      </div>
    </>
  );
}

export const newApplicationLoader = proteger(async () => {
  const contexto = await servicos.aluno.contexto();
  if (contexto.candidatura) throw redirect('/aluno/candidatura');
  const [inscricoes, oportunidades] = await Promise.all([
    servicos.edital.obter(),
    servicos.oportunidades.listar(),
  ]);
  return { contexto, oportunidades, ...inscricoes };
});
export const newApplicationAction = proteger(async ({ request }) => {
  await servicos.auth.exigirAluno();
  const valores = valoresFormulario(await request.formData());
  try {
    await servicos.candidaturas.iniciar({
      convenioId: valores.convenioId ?? '',
      segundaOpcaoConvenioId: valores.segundaOpcaoConvenioId ?? '',
      editalId: valores.editalId ?? '',
      aceite: valores.aceite === 'on',
    });
    return redirect('/aluno/candidatura?salvo=1');
  } catch (erro) {
    return erroFormulario(erro, valores);
  }
});

export function NewApplicationPage() {
  const { contexto, edital, situacao, oportunidades } =
    useLoaderData<typeof newApplicationLoader>();
  const result = useActionData<typeof newApplicationAction>();
  const { t } = useTranslation();
  const aberta = situacao === 'abertas';
  return (
    <>
      <BackLink to="/aluno" />
      <PageTitle title={t('admission.new')} description={t('admission.newIntro')} />
      <Feedback result={result} />
      {!aberta && (
        <div className="feedback info" role="status">
          {t('admission.closed')}
        </div>
      )}
      <div className="admission-layout">
        <section className="panel">
          <h2>{t('admission.studentData')}</h2>
          <dl className="edital-facts section-note">
            <div>
              <dt>{t('field.name')}</dt>
              <dd>{contexto.aluno.nome}</dd>
            </div>
            <div>
              <dt>{t('field.enrollment')}</dt>
              <dd>{contexto.aluno.matricula}</dd>
            </div>
            <div>
              <dt>{t('field.email')}</dt>
              <dd>{contexto.aluno.email}</dd>
            </div>
          </dl>
          <Form method="post" className="form-stack section-note" noValidate>
            <input type="hidden" name="editalId" value={edital.id} />
            {(['convenioId', 'segundaOpcaoConvenioId'] as const).map((campo, indice) => (
              <Field
                key={campo}
                label={t(indice === 0 ? 'admission.firstChoice' : 'admission.secondChoice')}
                error={result?.erros?.[campo]}
              >
                <select
                  name={campo}
                  defaultValue={result?.valores?.[campo] ?? ''}
                  required={indice === 0}
                >
                  <option value="">
                    {t(indice === 0 ? 'admission.chooseDestination' : 'admission.noSecondChoice')}
                  </option>
                  {oportunidades.flatMap((o) =>
                    o.convenios.map((c) => (
                      <option key={c.id} value={c.id}>
                        {o.instituicao.nome} · {nomePais(o.instituicao.paisCodigo)} ·{' '}
                        {t('duration.months', { count: c.duracaoMeses })} ·{' '}
                        {nomeIdioma(c.idiomaEnsino)}
                      </option>
                    )),
                  )}
                </select>
              </Field>
            ))}
            {!oportunidades.length && (
              <p className="small muted">{t('admission.noDestinations')}</p>
            )}
            <label className="check-field">
              <input
                name="aceite"
                type="checkbox"
                required
                defaultChecked={result?.valores?.aceite === 'on'}
              />
              {t('admission.accept')}
            </label>
            {result?.erros?.aceite && (
              <p className="field-error" role="alert">
                {t(result.erros.aceite)}
              </p>
            )}
            <p className="small muted">{t('admission.nextStep')}</p>
            <div className="actions">
              {aberta && oportunidades.length ? (
                <SubmitButton>{t('admission.create')}</SubmitButton>
              ) : (
                <Button disabled>{t('admission.create')}</Button>
              )}
              <LinkButton to="/aluno" variant="secondary">
                {t('app.cancel')}
              </LinkButton>
            </div>
          </Form>
        </section>
        <aside className="panel">
          <h2>{t('admission.currentNotice')}</h2>
          <EditalSummary edital={edital} situacao={situacao} />
        </aside>
      </div>
    </>
  );
}
