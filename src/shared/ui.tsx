import { cloneElement, isValidElement, useId } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode } from 'react';
import { Link, useLocation, useNavigation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Check, Inbox } from 'lucide-react';
import type { ResultadoFormulario } from '../features/models';
export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function LinkButton({
  to,
  children,
  variant = 'primary',
}: {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <Link className={`button ${variant}`} to={to}>
      {children}
    </Link>
  );
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({
  label,
  error,
  children,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const labelId = useId();
  const errorId = useId();
  const accessibility = {
    'aria-labelledby': labelId,
    'aria-describedby': error ? errorId : undefined,
    'aria-invalid': Boolean(error),
  };
  const control = isValidElement(children) ? (
    cloneElement(children as ReactElement<typeof accessibility>, accessibility)
  ) : (
    <input {...props} {...accessibility} />
  );
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {control}
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {t(error)}
        </span>
      )}
    </label>
  );
}
export function Feedback({ result }: { result?: ResultadoFormulario }) {
  const { t } = useTranslation();
  if (result?.erro)
    return (
      <div className="feedback error" role="alert">
        <AlertCircle size={18} />
        <span>{t(result.erro)}</span>
      </div>
    );
  if (result?.ok)
    return (
      <div className="feedback success" role="status">
        <Check size={18} />
        <span>{t('app.saved')}</span>
      </div>
    );
  return null;
}
export function SavedFeedback() {
  const { search } = useLocation();
  return new URLSearchParams(search).has('salvo') ? <Feedback result={{ ok: true }} /> : null;
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'blue';
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function EmptyState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="empty" role="status">
      <Inbox size={27} />
      <p>{message ?? t('app.empty')}</p>
    </div>
  );
}
export function SubmitButton({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  return (
    <Button type="submit" disabled={navigation.state !== 'idle'}>
      {navigation.state !== 'idle' ? t('app.saving') : children}
    </Button>
  );
}
export function BackLink({ to }: { to: string }) {
  const { t } = useTranslation();
  return (
    <Link className="text-link back-link" to={to}>
      <ArrowLeft size={16} />
      {t('app.back')}
    </Link>
  );
}
