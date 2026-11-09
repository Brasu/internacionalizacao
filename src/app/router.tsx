import { createBrowserRouter, createHashRouter } from 'react-router';
import { RouterLayout } from '../shared/navigation-scroll';
import { documentsAction } from '../features/application-documents';
import {
  EditalPage,
  editalLoader,
  editalAction,
  NewApplicationPage,
  newApplicationLoader,
  newApplicationAction,
} from '../features/pages/admissions';
import {
  applicationsLoader,
  applicationReviewLoader,
  applicationReviewAction,
  ApplicationsPage,
  ApplicationReviewPage,
} from '../features/pages/applications';
import i18n from '../features/i18n';
function RouteLoading() {
  return (
    <main className="loading-page" role="status">
      <img src={`${import.meta.env.BASE_URL}unifor-blue.svg`} alt="Unifor" />
      <p>{i18n.t('app.loading')}</p>
    </main>
  );
}
import {
  LoginPage,
  loginLoader,
  loginAction,
  rootLoader,
  logoutAction,
  ErrorPage,
  notFoundLoader,
} from '../features/pages/auth';
import { AppLayout, studentLayoutLoader, driLayoutLoader } from '../features/pages/layout';
import {
  HomePage,
  homeLoader,
  UniversitiesPage,
  universitiesLoader,
  UniversityPage,
  universityLoader,
  EligibilityPage,
  contextLoader,
  ApplicationPage,
  SupportPage,
} from '../features/pages/student';
import { NoticesPage, noticesLoader, noticesAction } from '../features/pages/notices';
import {
  DriHomePage,
  driHomeLoader,
  StudentsPage,
  studentsLoader,
  NewStudentPage,
  newStudentLoader,
  studentAction,
} from '../features/pages/admin';
import {
  AgreementsPage,
  agreementsLoader,
  AgreementFormPage,
  agreementFormLoader,
  agreementAction,
} from '../features/pages/agreements';
import {
  ContactPage,
  contactLoader,
  contactAction,
  ContactDetailPage,
  contactDetailLoader,
} from '../features/pages/contact';
import { ReportsPage, reportsLoader } from '../features/pages/reports';
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
