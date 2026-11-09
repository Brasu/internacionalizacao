import { createBrowserRouter, createHashRouter } from 'react-router';
import { documentsAction } from '../features/application-documents';
import i18n from '../features/i18n';
import {
  driHomeLoader,
  DriHomePage,
  newStudentLoader,
  NewStudentPage,
  studentAction,
  studentsLoader,
  StudentsPage,
} from '../features/pages/admin';
import {
  editalAction,
  editalLoader,
  EditalPage,
  newApplicationAction,
  newApplicationLoader,
  NewApplicationPage,
} from '../features/pages/admissions';
import {
  agreementAction,
  agreementFormLoader,
  AgreementFormPage,
  agreementsLoader,
  AgreementsPage,
} from '../features/pages/agreements';
import {
  applicationReviewAction,
  applicationReviewLoader,
  ApplicationReviewPage,
  applicationsLoader,
  ApplicationsPage,
} from '../features/pages/applications';
import {
  ErrorPage,
  loginAction,
  loginLoader,
  LoginPage,
  logoutAction,
  notFoundLoader,
  rootLoader,
} from '../features/pages/auth';
import {
  contactAction,
  contactDetailLoader,
  ContactDetailPage,
  contactLoader,
  ContactPage,
} from '../features/pages/contact';
import { AppLayout, driLayoutLoader, studentLayoutLoader } from '../features/pages/layout';
import { noticesAction, noticesLoader, NoticesPage } from '../features/pages/notices';
import { reportsLoader, ReportsPage } from '../features/pages/reports';
import {
  ApplicationPage,
  contextLoader,
  EligibilityPage,
  homeLoader,
  HomePage,
  SupportPage,
  universitiesLoader,
  UniversitiesPage,
  universityLoader,
  UniversityPage,
} from '../features/pages/student';
import { RouterLayout } from '../shared/navigation-scroll';

function RouteLoading() {
  return (
    <main className="loading-page" role="status">
      <img src={`${import.meta.env.BASE_URL}unifor-blue.svg`} alt="Unifor" />
      <p>{i18n.t('app.loading')}</p>
    </main>
  );
}

const criarRouter =
  import.meta.env.VITE_ROUTER_MODE === 'hash' ? createHashRouter : createBrowserRouter;
export const router = criarRouter([
  {
    Component: RouterLayout,
    HydrateFallback: RouteLoading,
    children: [
      { path: '/', loader: rootLoader, ErrorBoundary: ErrorPage, HydrateFallback: RouteLoading },
      {
        path: '/login',
        loader: loginLoader,
        action: loginAction,
        Component: LoginPage,
        ErrorBoundary: ErrorPage,
        HydrateFallback: RouteLoading,
      },
      {
        path: '/sair',
        action: logoutAction,
        ErrorBoundary: ErrorPage,
        HydrateFallback: RouteLoading,
      },
      { path: '/acesso-negado', element: <ErrorPage forbidden /> },
      {
        path: '/aluno',
        loader: studentLayoutLoader,
        Component: AppLayout,
        ErrorBoundary: ErrorPage,
        HydrateFallback: RouteLoading,
        children: [
          { index: true, loader: homeLoader, Component: HomePage },
          { path: 'universidades', loader: universitiesLoader, Component: UniversitiesPage },
          { path: 'universidades/:id', loader: universityLoader, Component: UniversityPage },
          { path: 'elegibilidade', loader: contextLoader, Component: EligibilityPage },
          {
            path: 'candidatura/nova',
            loader: newApplicationLoader,
            action: newApplicationAction,
            Component: NewApplicationPage,
          },
          {
            path: 'candidatura',
            loader: contextLoader,
            action: documentsAction,
            Component: ApplicationPage,
          },
          { path: 'apoio', loader: contextLoader, Component: SupportPage },
          { path: 'avisos', loader: noticesLoader, action: noticesAction, Component: NoticesPage },
          {
            path: 'atendimento',
            loader: contactLoader,
            action: contactAction,
            Component: ContactPage,
          },
          { path: 'atendimento/:id', loader: contactDetailLoader, Component: ContactDetailPage },
        ],
      },
      {
        path: '/dri',
        loader: driLayoutLoader,
        Component: AppLayout,
        ErrorBoundary: ErrorPage,
        HydrateFallback: RouteLoading,
        children: [
          { index: true, loader: driHomeLoader, Component: DriHomePage },
          { path: 'avisos', loader: noticesLoader, action: noticesAction, Component: NoticesPage },
          { path: 'edital', loader: editalLoader, action: editalAction, Component: EditalPage },
          { path: 'candidaturas', loader: applicationsLoader, Component: ApplicationsPage },
          {
            path: 'candidaturas/:id',
            loader: applicationReviewLoader,
            action: applicationReviewAction,
            Component: ApplicationReviewPage,
          },
          { path: 'alunos', loader: studentsLoader, Component: StudentsPage },
          {
            path: 'alunos/novo',
            loader: newStudentLoader,
            action: studentAction,
            Component: NewStudentPage,
          },
          {
            path: 'convenios',
            loader: agreementsLoader,
            action: agreementAction,
            Component: AgreementsPage,
          },
          {
            path: 'convenios/novo',
            loader: agreementFormLoader,
            action: agreementAction,
            Component: AgreementFormPage,
          },
          {
            path: 'convenios/:id/editar',
            loader: agreementFormLoader,
            action: agreementAction,
            Component: AgreementFormPage,
          },
          { path: 'relatorios', loader: reportsLoader, Component: ReportsPage },
          { path: 'atendimento', loader: contactLoader, Component: ContactPage },
          {
            path: 'atendimento/:id',
            loader: contactDetailLoader,
            action: contactAction,
            Component: ContactDetailPage,
          },
        ],
      },
      {
        path: '*',
        loader: notFoundLoader,
        ErrorBoundary: ErrorPage,
        HydrateFallback: RouteLoading,
      },
    ],
  },
]);
