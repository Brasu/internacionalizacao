import { useState } from 'react';
import { Form, useLoaderData, useSubmit } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FileDown } from 'lucide-react';
import { servicos, APP_NAME } from '../../app/services';
import { proteger } from '../../app/routing';
import type { SituacaoIntercambio } from '../models';
import { PageTitle, Field, Button, EmptyState } from '../../shared/ui';
import i18n, { nomePais } from '../i18n';
export const reportsLoader = proteger(async ({ request }) => {
  const valor = new URL(request.url).searchParams.get('situacao');
  const situacao: SituacaoIntercambio | undefined =
    valor === 'andamento' || valor === 'finalizado' ? valor : undefined;
  return { itens: await servicos.intercambios.listar(situacao), situacao };
});
export function ReportsPage() {
  const { itens, situacao } = useLoaderData<typeof reportsLoader>();
  const { t } = useTranslation();
  const submit = useSubmit();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  async function baixar() {
    setBusy(true);
    setErro('');
    try {
      await servicos.auth.exigirDri();
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const documento = new jsPDF({ orientation: 'landscape' });
      documento.setTextColor(6, 73, 250);
      documento.setFontSize(20);
      documento.text(APP_NAME, 14, 18);
      documento.setTextColor(40);
      documento.setFontSize(10);
      documento.text(i18n.t('app.demo'), 14, 25);
      autoTable(documento, {
        startY: 32,
        headStyles: { fillColor: [6, 73, 250] },
        styles: { fontSize: 9 },
        head: [
          [
            t('field.name'),
            t('field.enrollment'),
            t('field.institution'),
            t('filter.country'),
            t('reports.term'),
            t('agreements.status'),
          ],
        ],
        body: itens.map((item) => [
          item.alunoNome,
          item.matricula,
          item.instituicaoNome,
          nomePais(item.paisCodigo),
          item.periodo,
          t(`reports.${item.situacao}`),
        ]),
      });
      documento.save('internacionalizacao-intercambios.pdf');
    } catch {
      setErro(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title={t('reports.title')}
        description={t('reports.subtitle')}
        action={
          <Button onClick={() => void baixar()} disabled={busy || !itens.length}>
            <FileDown size={18} />
            {t(busy ? 'reports.generating' : 'reports.pdf')}
          </Button>
        }
      />
      {erro && (
        <p className="feedback error" role="alert">
          {erro}
        </p>
      )}
      <Form method="get" className="report-filters" onChange={(e) => submit(e.currentTarget)}>
        <Field label={t('agreements.status')}>
          <select name="situacao" defaultValue={situacao ?? ''} key={situacao ?? 'all'}>
            <option value="">{t('filter.all')}</option>
            <option value="andamento">{t('reports.andamento')}</option>
            <option value="finalizado">{t('reports.finalizado')}</option>
          </select>
        </Field>
      </Form>
      <div className="table-wrap">
        {!itens.length ? (
          <EmptyState />
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('field.name')}</th>
                <th>{t('field.enrollment')}</th>
                <th>{t('field.institution')}</th>
                <th>{t('reports.term')}</th>
                <th>{t('agreements.status')}</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id}>
                  <td data-label={t('field.name')}>{i.alunoNome}</td>
                  <td data-label={t('field.enrollment')}>{i.matricula}</td>
                  <td data-label={t('field.institution')}>
                    {i.instituicaoNome}
                    <small className="cell-sub">{nomePais(i.paisCodigo)}</small>
                  </td>
                  <td data-label={t('reports.term')}>{i.periodo}</td>
                  <td data-label={t('agreements.status')}>{t(`reports.${i.situacao}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
