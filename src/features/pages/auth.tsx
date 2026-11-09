import { useState } from 'react';
import {
  Form,
  redirect,
  useActionData,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
  Link,
} from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Globe2, ArrowRight, GraduationCap, UsersRound } from 'lucide-react';
import { servicos, APP_NAME } from '../../app/services';
import { destinoSeguro, erroFormulario } from '../../app/routing';
import { contasDemo } from '../fixtures';
import { ErroAplicacao } from '../models';
import { Button, Field, Feedback, LinkButton } from '../../shared/ui';
import { LanguagePicker, ResetDemo } from './layout';
export async function loginLoader() {
  const sessao = await servicos.auth.obterSessao();
  if (sessao) return redirect(sessao.perfil === 'dri' ? '/dri' : '/aluno');
  return null;
}
export async function loginAction({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  try {
    const sessao = await servicos.auth.entrar({
      identificador: String(form.get('identificador') ?? ''),
      senha: String(form.get('senha') ?? ''),
    });
    return redirect(destinoSeguro(new URL(request.url).searchParams.get('retorno'), sessao.perfil));
  } catch (erro) {
    return erroFormulario(erro);
  }
}
export async function rootLoader() {
  const sessao = await servicos.auth.obterSessao();
  return redirect(!sessao ? '/login' : sessao.perfil === 'dri' ? '/dri' : '/aluno');
}
export async function logoutAction() {
  await servicos.auth.sair();
  return redirect('/login');
}
export function LoginPage() {
  const { t } = useTranslation();
  const result = useActionData<typeof loginAction>();
  const navigation = useNavigation();
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  function preencher(indice: number) {
    setIdentificador(contasDemo[indice].identificador);
    setSenha(contasDemo[indice].senha);
  }
  return (
    <div className="login-page">
      <header className="login-top">
        <img src={`${import.meta.env.BASE_URL}unifor-blue.svg`} alt="Unifor" />
        <span>{APP_NAME}</span>
        <LanguagePicker />
      </header>
      <main className="login-content">
        <section className="login-intro">
          <Globe2 className="intro-symbol" size={48} />
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
          <div className="login-brand-line" />
          <p className="small">{t('app.footer')}</p>
        </section>
        <section className="login-form panel">
          <h2>{t('login.heading')}</h2>
          <p className="muted">{t('login.mock')}</p>
          <Feedback result={result} />
          <Form method="post" className="form-stack">
            <Field
              label={t('login.identifier')}
              name="identificador"
              type="text"
              autoComplete="username"
              required
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
            />
            <Field
              label={t('login.password')}
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <Button type="submit" disabled={navigation.state !== 'idle'}>
              {t('login.enter')}
              <ArrowRight size={17} />
            </Button>
          </Form>
          <div className="demo-accounts">
            <h3>{t('login.accounts')}</h3>
            {contasDemo.map((conta, indice) => (
              <button
                className="demo-account"
                type="button"
                key={conta.id}
                onClick={() => preencher(indice)}
                aria-label={t(
                  conta.perfil === 'dri'
                    ? 'login.dri'
                    : conta.alunoId === 'luiza'
                      ? 'login.studentNew'
                      : 'login.student',
                )}
              >
                {conta.perfil === 'aluno' ? <GraduationCap size={19} /> : <UsersRound size={19} />}
                <span>
                  <strong>{conta.nome}</strong>
                  <small>
                    {t(
                      conta.perfil === 'dri'
                        ? 'role.dri'
                        : conta.alunoId === 'luiza'
                          ? 'login.withoutApplication'
                          : 'login.withApplication',
                    )}
                  </small>
                  <small>{conta.identificador}</small>
                  <small>{conta.senha}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
          <ResetDemo />
        </section>
      </main>
      <footer className="login-footer">{t('app.demo')}</footer>
    </div>
  );
}
export function ErrorPage({ forbidden = false }: { forbidden?: boolean }) {
  const { t } = useTranslation();
  const erro = useRouteError();
  const chave = forbidden
    ? 'errors.forbidden'
    : erro instanceof ErroAplicacao
      ? erro.chave
      : isRouteErrorResponse(erro) && erro.status === 404
        ? 'errors.notFound'
        : 'errors.generic';
  return (
    <main className="error-page">
      <img src={`${import.meta.env.BASE_URL}unifor-blue.svg`} alt="Unifor" />
      <h1>{t(chave)}</h1>
      <LinkButton to="/">{t('app.home')}</LinkButton>
      <ResetDemo />
      <Link to="/login" className="text-link">
        {t('login.enter')}
      </Link>
    </main>
  );
}
export function notFoundLoader() {
  throw new Response('', { status: 404 });
}
