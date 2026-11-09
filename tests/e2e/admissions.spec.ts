import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function entrar(page: Page, perfil: 'dri' | 'luiza') {
  await page.goto('/login');
  await page
    .getByRole('button', {
      name:
        perfil === 'dri' ? 'Preencher acesso da DRI' : 'Preencher acesso de aluno sem candidatura',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(perfil === 'dri' ? /\/dri$/ : /\/aluno$/);
}
async function sair(page: Page) {
  await page.getByLabel('Conta e demonstração').click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test('DRI configura edital, controla prazo e revisa uma candidatura criada pelo aluno', async ({
  page,
}) => {
  const ano = new Date().getFullYear();
  const errors: string[] = [];
  page.on('pageerror', (erro) => errors.push(erro.message));
  await entrar(page, 'dri');
  await page.getByRole('link', { name: 'Configurar edital', exact: true }).click();
  await expect(page).toHaveURL(/\/dri\/edital$/);
  await page.getByLabel('Número do edital', { exact: true }).fill('DEMO-42');
  await page.getByLabel('Título do edital', { exact: true }).fill('Mobilidade de teste');
  await page.getByLabel('Semestre de destino', { exact: true }).fill(`${ano + 1}.2`);
  await page.getByLabel('Início das inscrições', { exact: true }).fill(`${ano}-12-31`);
  await page.getByLabel('Fim das inscrições', { exact: true }).fill(`${ano}-01-01`);
  await page.getByRole('button', { name: 'Salvar edital', exact: true }).click();
  await expect(page.getByRole('alert').last()).toContainText(
    'O fim das inscrições deve ser uma data válida',
  );
  await page.getByLabel('Início das inscrições', { exact: true }).fill(`${ano - 1}-01-01`);
  await page.getByLabel('Fim das inscrições', { exact: true }).fill(`${ano - 1}-12-31`);
  await page
    .getByLabel('Orientações do edital', { exact: true })
    .fill('Prepare seus documentos para este processo de demonstração.');
  await page
    .getByLabel('Link do edital (opcional)', { exact: true })
    .fill('https://example.com/edital');
  await page.getByRole('button', { name: 'Salvar edital', exact: true }).click();
  await expect(page.getByText('Dados salvos com sucesso.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Número do edital', { exact: true })).toHaveValue('DEMO-42');
  await sair(page);
  await entrar(page, 'luiza');
  await expect(page.getByText('Inscrições encerradas', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Iniciar nova candidatura', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nova candidatura', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Iniciar candidatura', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('Não é possível iniciar a candidatura agora.', { exact: false }),
  ).toBeVisible();
  await page.goto('/dri/edital');
  await expect(page).toHaveURL('/acesso-negado');
  await page.goto('/aluno');
  await sair(page);

  await entrar(page, 'dri');
  await page.goto('/dri/edital');
  await page.getByLabel('Início das inscrições', { exact: true }).fill(`${ano}-01-01`);
  await page.getByLabel('Fim das inscrições', { exact: true }).fill(`${ano}-12-31`);
  await page.getByRole('button', { name: 'Salvar edital', exact: true }).click();
  await expect(page.getByText('Inscrições abertas', { exact: true })).toBeVisible();
  await sair(page);
  await entrar(page, 'luiza');
  await expect(
    page.getByText('Edital DEMO-42 · Mobilidade de teste', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Iniciar nova candidatura', exact: true }).click();
  await expect(page.getByLabel('Semestre de destino', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Consultar edital completo', exact: true }),
  ).toHaveAttribute('href', 'https://example.com/edital');
  await page.getByRole('button', { name: 'Iniciar candidatura', exact: true }).click();
  await expect(page.getByRole('alert').last()).toContainText('Confirme a leitura');
  await page.getByLabel('Primeira opção', { exact: true }).selectOption('conv-lisboa');
  await page.getByLabel('Segunda opção', { exact: true }).selectOption('conv-lisboa');
  await page.getByRole('checkbox', { name: 'Li as orientações do edital', exact: false }).check();
  await page.getByRole('button', { name: 'Iniciar candidatura', exact: true }).click();
  await expect(page.getByRole('alert').last()).toContainText(
    'A segunda opção deve ser diferente da primeira.',
  );
  await expect(page.getByLabel('Primeira opção', { exact: true })).toHaveValue('conv-lisboa');
  await page.getByLabel('Segunda opção', { exact: true }).selectOption('conv-madri');
  await page.getByRole('button', { name: 'Iniciar candidatura', exact: true }).click();
  await expect(page).toHaveURL(/\/aluno\/candidatura\?salvo=1$/);
  await expect(page.locator('.document-upload')).toHaveCount(11);
  await expect(page.locator('.application-choices > div').nth(0)).toContainText('Lisboa');
  await expect(page.locator('.application-choices > div').nth(1)).toContainText('Madri');
  const historico = page.getByRole('listitem', { name: 'Histórico acadêmico', exact: true });
  await page.getByLabel('Arquivo para Histórico acadêmico', { exact: true }).setInputFiles({
    name: 'historico-luiza.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nHistorico\n%%EOF'),
  });
  await historico
    .getByRole('button', { name: 'Enviar documento de Histórico acadêmico', exact: true })
    .click();
  await expect(historico.getByText('Aguardando análise', { exact: true })).toBeVisible();
  await page.reload();
  await expect(historico).toContainText('historico-luiza.pdf');
  await expect(page.locator('.application-choices dt')).toHaveText([
    'Primeira opção',
    'Segunda opção',
  ]);
  await page.goto('/aluno');
  await expect(page.locator('.application-card')).toContainText(`${ano + 1}.2`);
  await expect(page.locator('.application-guide')).toHaveCount(0);
  await page.goto('/aluno/candidatura/nova');
  await expect(page).toHaveURL(/\/aluno\/candidatura$/);
  await sair(page);

  await entrar(page, 'dri');
  await page.goto('/dri/candidaturas');
  const candidatura = page.getByRole('row').filter({ hasText: 'Luiza Martins' });
  await expect(candidatura).toHaveCount(1);
  await expect(candidatura.locator('.application-choices > div').nth(0)).toContainText('Lisboa');
  await expect(candidatura.locator('.application-choices > div').nth(1)).toContainText('Madri');
  await candidatura.getByRole('link', { name: 'Ver candidatura', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Candidatura de Luiza Martins', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.application-choices dt')).toHaveText([
    'Primeira opção',
    'Segunda opção',
  ]);
  await historico.getByRole('button', { name: 'Aprovar documento', exact: true }).click();
  await expect(historico.getByText('Aprovado', { exact: true })).toBeVisible();
  await sair(page);
  await entrar(page, 'luiza');
  await page.goto('/aluno/candidatura');
  await expect(historico.getByText('Aprovado', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('nova candidatura e configuração de edital funcionam no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrar(page, 'luiza');
  await page.getByRole('link', { name: 'Iniciar nova candidatura', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nova candidatura', exact: true })).toBeVisible();
  await expect(page.getByLabel('Segunda opção', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Semestre de destino', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Primeira opção', { exact: true }).selectOption('conv-madri');
  await page.getByRole('checkbox', { name: 'Li as orientações do edital', exact: false }).check();
  await page.getByRole('button', { name: 'Iniciar candidatura', exact: true }).click();
  await expect(page.locator('.application-card')).toContainText('Madri');
  await sair(page);
  await entrar(page, 'dri');
  await page.getByRole('link', { name: 'Configurar edital', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole('checkbox', { name: 'Publicar edital para os alunos', exact: true })
    .uncheck();
  await page.getByRole('button', { name: 'Salvar edital', exact: true }).click();
  await expect(page.getByText('Edital ainda não publicado', { exact: true })).toBeVisible();
});
