import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import './shared/styles.css';
import i18n from './features/i18n';
import { servicos } from './app/services';
import { router } from './app/router';
const root = ReactDOM.createRoot(document.getElementById('root')!);
async function iniciar() {
  const idioma = await servicos.preferencias.obterIdioma();
  await i18n.changeLanguage(idioma);
  document.documentElement.lang = idioma === 'pt' ? 'pt-BR' : idioma;
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}
void iniciar().catch(() =>
  root.render(
    <main className="error-page">
      <h1>{i18n.t('errors.storageRead')}</h1>
      <button className="button primary" onClick={() => window.location.reload()}>
        {i18n.t('app.loading')}
      </button>
    </main>,
  ),
);
