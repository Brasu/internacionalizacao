import { useEffect, useRef, useState } from 'react';
import {
  Form,
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useHref,
  useLocation,
  useNavigation,
  useRevalidator,
} from 'react-router';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronDown, LogOut, Menu, RotateCcw } from 'lucide-react';
import { servicos, APP_NAME } from '../../app/services';
import { proteger } from '../../app/routing';
import type { Idioma } from '../models';
export const studentLayoutLoader = proteger(async () => {
  const sessao = await servicos.auth.exigirAluno();
  const avisos = await servicos.avisos.listar();
  return { sessao, naoLidos: avisos.filter((a) => !a.lido).length };
});
export const driLayoutLoader = proteger(async () => {
  const sessao = await servicos.auth.exigirDri();
  const avisos = await servicos.avisos.listar();
  return { sessao, naoLidos: avisos.filter((aviso) => !aviso.lido).length };
});
export function LanguagePicker() {
  const { i18n, t } = useTranslation();
  const [erro, setErro] = useState('');
  async function mudar(idioma: Idioma) {
    try {
      await servicos.preferencias.definirIdioma(idioma);
      await i18n.changeLanguage(idioma);
      document.documentElement.lang = idioma === 'pt' ? 'pt-BR' : idioma;
      setErro('');
    } catch {
      setErro(t('errors.storageWrite'));
    }
  }
  return (
    <div className="language-picker">
      <label>
        <span className="sr-only">{t('nav.language')}</span>
        <select
          aria-label={t('nav.language')}
          value={i18n.language}
          onChange={(e) => {
            const idioma = e.target.value;
            if (idioma === 'pt' || idioma === 'en' || idioma === 'es') void mudar(idioma);
          }}
        >
          <option value="pt">PT</option>
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
      </label>
      {erro && <span role="alert">{erro}</span>}
    </div>
  );
}
export function ResetDemo() {
  const { t } = useTranslation();
  const login = useHref('/login');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  async function restaurar() {
    if (!window.confirm(t('app.resetConfirm'))) return;
    try {
      setBusy(true);
      await servicos.restaurar();
      window.location.assign(login);
    } catch {
      setErro(t('errors.storageWrite'));
      setBusy(false);
    }
  }
  return (
    <div className="reset-demo">
      <button type="button" className="text-link" onClick={() => void restaurar()} disabled={busy}>
        <RotateCcw size={14} />
        {t('app.reset')}
      </button>
      {erro && <p role="alert">{erro}</p>}
    </div>
  );
}
export function AppLayout() {
  const { sessao, naoLidos } = useLoaderData<typeof studentLayoutLoader>();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const accountRef = useRef<HTMLDetailsElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function fecharFora(event: Event) {
      if (!(event.target instanceof Node)) return;
      const account = accountRef.current;
      if (account && !account.contains(event.target)) account.open = false;
      if (!navigationRef.current?.contains(event.target)) setMenu(false);
    }
    function fecharComEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const account = accountRef.current;
      if (account?.open) {
        account.open = false;
        account.querySelector('summary')?.focus();
      }
      if (menu) {
        setMenu(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('focusin', fecharFora);
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.removeEventListener('pointerdown', fecharFora);
      document.removeEventListener('focusin', fecharFora);
      document.removeEventListener('keydown', fecharComEscape);
    };
  }, [menu]);
  useEffect(() => {
    if (accountRef.current) accountRef.current.open = false;
    setMenu(false);
  }, [location.key]);
  const dri = sessao.perfil === 'dri';
  const links = dri
    ? [
        ['/dri', 'nav.home'],
        ['/dri/candidaturas', 'nav.applications'],
        ['/dri/edital', 'admission.manage'],
        ['/dri/alunos', 'nav.students'],
        ['/dri/convenios', 'nav.agreements'],
        ['/dri/relatorios', 'nav.reports'],
        ['/dri/atendimento', 'nav.contact'],
      ]
    : [
        ['/aluno', 'nav.home'],
        ['/aluno/universidades', 'nav.universities'],
        ['/aluno/candidatura', 'nav.application'],
        ['/aluno/apoio', 'nav.support'],
        ['/aluno/atendimento', 'nav.contact'],
      ];
  return (
    <div className="app-shell">
      <Link className="skip-link" to={`${location.pathname}${location.search}#conteudo`}>
        {t('nav.home')}
      </Link>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <img src={`${import.meta.env.BASE_URL}unifor-white.svg`} alt="Unifor" />
            <span>{APP_NAME}</span>
          </div>
          <div className="header-tools">
            <LanguagePicker />
            <Link
              to={dri ? '/dri/avisos' : '/aluno/avisos'}
              className="notification-button"
              aria-label={`${t('nav.notices')} (${naoLidos})`}
            >
              <Bell size={21} />
              {naoLidos > 0 && <span>{naoLidos}</span>}
            </Link>
            <details className="account-menu" ref={accountRef}>
              <summary aria-label={t('nav.account')}>
                <span className="avatar">
                  {dri
                    ? 'DRI'
                    : sessao.nome
                        .split(' ')
                        .filter(Boolean)
                        .map((parte) => parte[0])
                        .slice(0, 2)
                        .join('')}
                </span>
                <ChevronDown size={15} />
              </summary>
              <div className="account-dropdown">
                <strong>{sessao.nome}</strong>
                <small>{t(`role.${sessao.perfil}`)}</small>
                <Form method="post" action="/sair">
                  <button type="submit" className="text-link">
                    <LogOut size={15} />
                    {t('nav.logout')}
                  </button>
                </Form>
                <ResetDemo />
              </div>
            </details>
          </div>
        </div>
      </header>
      <nav
        ref={navigationRef}
        className={`main-nav ${menu ? 'expanded' : ''}`}
        aria-label={t('nav.menu')}
      >
        <button
          ref={menuButtonRef}
          className="mobile-menu"
          type="button"
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
        >
          <Menu size={19} />
          {t('nav.menu')}
        </button>
        <span className="mobile-profile">{t(`role.${sessao.perfil}`)}</span>
        <div className="nav-links">
          {links.map(([to, chave]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/aluno' || to === '/dri'}
              onClick={() => {
                setMenu(false);
                if (to === location.pathname) void revalidator.revalidate();
              }}
            >
              {t(chave)}
            </NavLink>
          ))}
        </div>
        <span className="nav-profile">{t(`role.${sessao.perfil}`)}</span>
      </nav>
      <div
        className={`navigation-progress ${navigation.state !== 'idle' ? 'busy' : ''}`}
        role="status"
        aria-label={navigation.state !== 'idle' ? t('app.loading') : undefined}
      />
      <main id="conteudo" className="main-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>
          {APP_NAME} · {t('app.footer')}
        </span>
        <span>{t('app.demo')}</span>
      </footer>
    </div>
  );
}
