import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import '../features/i18n';
import { Field } from './ui';
it('associa rótulo ao campo e anuncia erros de validação', () => {
  render(<Field label="Matrícula" name="matricula" error="errors.required" />);
  expect(screen.getByLabelText(/Matrícula/)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveTextContent('Preencha este campo.');
});
