import { Form, Link, redirect, useActionData, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { UserPlus, FileText, Handshake, UsersRound, ArrowRight } from 'lucide-react';
import { servicos } from '../../app/services';
import { proteger, erroFormulario, valoresFormulario } from '../../app/routing';
import { NoticesCard } from '../components';
import {
  PageTitle,
  Field,
  Feedback,
  SubmitButton,
  SavedFeedback,
  LinkButton,
  EmptyState,
} from '../../shared/ui';
export const driHomeLoader = proteger(async () => {
  const [alunos, catalogo, atendimento, candidaturas, avisos] = await Promise.all([
    servicos.alunos.listar(),
    servicos.catalogo.obter(),
    servicos.atendimento.listar(),
    servicos.candidaturas.listar(),
    servicos.avisos.listar(),
  ]);
  return { alunos, catalogo, atendimento, candidaturas, avisos };
});
export const studentsLoader = proteger(async () => servicos.alunos.listar());
export const newStudentLoader = proteger(async () => {
  await servicos.auth.exigirDri();
  return null;
});
export const studentAction = proteger(async ({ request }) => {
  await servicos.auth.exigirDri();
  const valores = valoresFormulario(await request.formData());
  try {
    await servicos.alunos.criar({
      nome: valores.nome ?? '',
      matricula: valores.matricula ?? '',
      telefone: valores.telefone ?? '',
      email: valores.email ?? '',
    });
    return redirect('/dri/alunos?salvo=1');
  } catch (erro) {
    return erroFormulario(erro, valores);
  }
});
export function DriHomePage() {
  const { alunos, catalogo, atendimento, candidaturas, avisos } =
    useLoaderData<typeof driHomeLoader>();
  const { t } = useTranslation();
  return (
    <>
      <PageTitle title={t('dri.title')} description={t('dri.subtitle')} />
      <section className="panel section-heading">
        <div>
          <h2>{t('admission.manage')}</h2>
          <p className="small muted section-note">{t('admission.manageIntro')}</p>
        </div>
        <LinkButton to="/dri/edital" variant="secondary">
          {t('admission.configure')}
        </LinkButton>
      </section>
      <div className="admin-shortcuts">
        <Link to="/dri/candidaturas">
          <FileText />
          <span>
            <strong>{t('nav.applications')}</strong>
            <small>{candidaturas.length}</small>
          </span>
          <ArrowRight size={18} />
        </Link>
        <Link to="/dri/alunos">
          <UsersRound />
          <span>
            <strong>{t('dri.students')}</strong>
            <small>{alunos.length}</small>
          </span>
          <ArrowRight size={18} />
        </Link>
        <Link to="/dri/convenios">
          <Handshake />
          <span>
            <strong>{t('agreements.title')}</strong>
            <small>{catalogo.convenios.length}</small>
          </span>
          <ArrowRight size={18} />
        </Link>
        <Link to="/dri/atendimento">
          <FileText />
          <span>
            <strong>{t('contact.queue')}</strong>
            <small>{atendimento.filter((s) => s.situacao === 'aberta').length}</small>
          </span>
          <ArrowRight size={18} />
        </Link>
      </div>
      <div className="dashboard-split">
        <section className="panel">
          <div className="section-heading">
            <h2>{t('agreements.title')}</h2>
            <LinkButton to="/dri/convenios/novo">
              <Handshake size={17} />
              {t('agreements.new')}
            </LinkButton>
          </div>
          <p className="muted section-note">{t('agreements.subtitle')}</p>
          <Link to="/dri/convenios" className="text-link">
            {t('nav.agreements')}
            <ArrowRight size={16} />
          </Link>
        </section>
        <NoticesCard avisos={avisos} todosHref="/dri/avisos" />
      </div>
      <div className="detail-grid">
        <section className="panel">
          <h2>{t('dri.students')}</h2>
          <p className="muted section-note">{t('dri.studentInfo')}</p>
          <LinkButton to="/dri/alunos/novo" variant="secondary">
            <UserPlus size={17} />
            {t('dri.newStudent')}
          </LinkButton>
        </section>
        <section className="panel">
          <h2>{t('reports.title')}</h2>
          <p className="muted section-note">{t('reports.subtitle')}</p>
          <LinkButton to="/dri/relatorios" variant="secondary">
            {t('nav.reports')}
          </LinkButton>
        </section>
      </div>
    </>
  );
}
export function StudentsPage() {
  const alunos = useLoaderData<typeof studentsLoader>();
  const { t } = useTranslation();
  return (
    <>
      <PageTitle
        title={t('dri.students')}
        action={
          <LinkButton to="/dri/alunos/novo">
            <UserPlus size={17} />
            {t('dri.newStudent')}
          </LinkButton>
        }
      />
      <SavedFeedback />
      <div className="table-wrap">
        {!alunos.length ? (
          <EmptyState />
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('field.name')}</th>
                <th>{t('field.enrollment')}</th>
                <th>{t('field.phone')}</th>
                <th>{t('field.email')}</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id}>
                  <td data-label={t('field.name')}>{a.nome}</td>
                  <td data-label={t('field.enrollment')}>{a.matricula}</td>
                  <td data-label={t('field.phone')}>{a.telefone}</td>
                  <td data-label={t('field.email')}>{a.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
export function NewStudentPage() {
  const { t } = useTranslation();
  const result = useActionData<typeof studentAction>();
  return (
    <>
      <PageTitle title={t('dri.studentForm')} description={t('dri.studentInfo')} />
      <Feedback result={result} />
      <Form method="post" className="form-grid max-form" noValidate>
        {(['nome', 'matricula', 'telefone', 'email'] as const).map((campo, indice) => (
          <Field
            key={campo}
            label={t(['field.name', 'field.enrollment', 'field.phone', 'field.email'][indice])}
            name={campo}
            defaultValue={result && 'valores' in result ? result.valores?.[campo] : ''}
            error={result && 'erros' in result ? result.erros?.[campo] : undefined}
            type={campo === 'email' ? 'email' : campo === 'telefone' ? 'tel' : 'text'}
            required
            autoComplete="off"
          />
        ))}
        <div className="actions full">
          <SubmitButton>{t('dri.newStudent')}</SubmitButton>
          <LinkButton to="/dri/alunos" variant="secondary">
            {t('app.cancel')}
          </LinkButton>
        </div>
      </Form>
    </>
  );
}
