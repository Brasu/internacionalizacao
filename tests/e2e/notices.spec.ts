import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function entrar(page: Page, perfil: 'aluno' | 'dri') {
  await page.goto('/login');
  await page
    .getByRole('button', {
      name: perfil === 'dri' ? 'Preencher acesso da DRI' : 'Preencher acesso de aluno',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(`/${perfil}`);
}

async function sair(page: Page) {
  await page.getByLabel('Conta e demonstração').click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
}

test('DRI consulta avisos, registra leitura e preserva o estado ao entrar novamente', async ({
  page,
}) => {
  await entrar(page, 'dri');
  const card = page.getByRole('region', { name: 'Avisos', exact: true });
  await expect(card.locator('.notice-row h3')).toHaveText([
    'Atualizar dados dos convênios',
    'Documentos pendentes de análise',
  ]);
  await expect(page.getByRole('link', { name: 'Avisos (3)', exact: true })).toHaveAttribute(
    'href',
    '/dri/avisos',
  );
  await page.screenshot({ path: test.info().outputPath('dri-avisos-desktop.png'), fullPage: true });
  await card.getByRole('link', { name: 'Ver todos os avisos', exact: true }).click();
  await expect(page).toHaveURL('/dri/avisos');
  await expect(page.locator('.notice-full')).toHaveCount(3);
  await expect(page.getByText('Encontro de integração', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Marcar como lido', exact: true }).first().click();
  await expect(page.getByRole('link', { name: 'Avisos (2)', exact: true })).toBeVisible();
  await expect(page.locator('.notice-full').first()).toContainText('Lido');
  await page
    .getByRole('navigation', { name: 'Menu', exact: true })
    .getByRole('link', { name: 'Início', exact: true })
    .click();
  await expect(card.locator('.notice-row h3')).toHaveText([
    'Documentos pendentes de análise',
    'Revisar vigência dos convênios',
  ]);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Avisos (2)', exact: true })).toBeVisible();
  await sair(page);
  await entrar(page, 'dri');
  await expect(card.locator('.notice-row')).toHaveCount(2);
  await page.getByRole('link', { name: 'Avisos (2)', exact: true }).click();
  await expect(page.locator('.notice-full').first()).toContainText('Lido');
  await sair(page);
  await entrar(page, 'aluno');
  await expect(page.getByRole('link', { name: 'Avisos (2)', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Avisos (2)', exact: true }).click();
  await expect(page).toHaveURL('/aluno/avisos');
  await expect(
    page.getByRole('heading', { name: 'Prazo de documentação', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Atualizar dados dos convênios', { exact: true })).toHaveCount(0);
  await page.goto('/dri/avisos');
  await expect(page).toHaveURL('/acesso-negado');
});

test('avisos DRI se adaptam às telas e idiomas e mostram estado de leitura concluída', async ({
  page,
}) => {
  await entrar(page, 'dri');
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/dri');
    const convenios = await page.locator('.dashboard-split > .panel').first().boundingBox();
    const avisos = await page.getByRole('region', { name: 'Avisos', exact: true }).boundingBox();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width < 650) {
      expect(avisos!.y).toBeGreaterThanOrEqual(convenios!.y + convenios!.height);
    } else {
      expect(avisos!.x).toBeGreaterThanOrEqual(convenios!.x + convenios!.width);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath('dri-avisos-mobile.png'), fullPage: true });
  await page.getByRole('link', { name: 'Avisos (3)', exact: true }).click();
  const traducoes = [
    {
      idioma: 'en',
      titulos: [
        'Update agreement information',
        'Documents awaiting review',
        'Review agreement validity',
      ],
    },
    {
      idioma: 'es',
      titulos: [
        'Actualizar datos de los convenios',
        'Documentos pendientes de revisión',
        'Revisar la vigencia de los convenios',
      ],
    },
    {
      idioma: 'pt',
      titulos: [
        'Atualizar dados dos convênios',
        'Documentos pendentes de análise',
        'Revisar vigência dos convênios',
      ],
    },
  ];
  for (const { idioma, titulos } of traducoes) {
    await page.locator('.language-picker select').selectOption(idioma);
    await expect(page.locator('.notice-full h2')).toHaveText(titulos);
    await expect(page.locator('.notice-full p')).not.toContainText(['notices.']);
  }
  const primeiro = page.locator('.notice-full').first();
  const texto = await primeiro.locator(':scope > div').boundingBox();
  const acao = await primeiro
    .getByRole('button', { name: 'Marcar como lido', exact: true })
    .boundingBox();
  expect(acao!.y).toBeGreaterThanOrEqual(texto!.y + texto!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  for (const restantes of [2, 1, 0]) {
    await page.getByRole('button', { name: 'Marcar como lido', exact: true }).first().click();
    await expect(
      page.getByRole('link', { name: `Avisos (${restantes})`, exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator('.notice-full .badge')).toHaveText(['Lido', 'Lido', 'Lido']);
  await page.reload();
  await expect(page.locator('.notice-full .badge')).toHaveCount(3);
  await page.goto('/dri');
  const card = page.getByRole('region', { name: 'Avisos', exact: true });
  await expect(card.getByText('Nenhum aviso não lido.', { exact: true })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Ver todos os avisos', exact: true })).toBeVisible();
  await expect(page.locator('.notification-button > span')).toHaveCount(0);
  await sair(page);
  await entrar(page, 'dri');
  await expect(page.getByRole('link', { name: 'Avisos (0)', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Avisos (0)', exact: true }).click();
  await expect(page.locator('.notice-full .badge')).toHaveCount(3);
});
