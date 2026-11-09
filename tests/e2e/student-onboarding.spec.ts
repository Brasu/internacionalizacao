import { test, expect } from '@playwright/test';

for (const largura of [1440, 390]) {
  test(`início separa candidatura e orientações em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto('/login');
    await expect(
      page.getByRole('button', { name: 'Preencher acesso de aluno sem candidatura', exact: true }),
    ).toContainText('Luiza Martins');
    await page.getByRole('button', { name: 'Preencher acesso de aluno', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Olá, Carol!' })).toBeVisible();
    await expect(page.locator('.application-card')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Como se candidatar', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('link', { name: 'Iniciar nova candidatura' })).toHaveCount(0);
    await page.getByLabel('Conta e demonstração').click();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();

    await page
      .getByRole('button', { name: 'Preencher acesso de aluno sem candidatura', exact: true })
      .click();
    await expect(page.getByLabel('Matrícula ou e-mail', { exact: true })).toHaveValue('2612759');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Olá, Luiza!' })).toBeVisible();
    const guia = page.getByRole('region', { name: 'Como se candidatar', exact: true });
    await expect(guia).toBeVisible();
    await expect(page.locator('.application-card')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Minha candidatura', exact: true })).toHaveCount(
      0,
    );
    await expect(guia.locator('.guide-documents li')).toHaveCount(11);
    for (const texto of [
      'seis meses de antecedência',
      'Inscrições abertas',
      'Mobilidade acadêmica internacional',
      'seis meses após o término do intercâmbio',
      'A taxa de inscrição não é reembolsável',
      'equivalência de conteúdo das disciplinas',
    ]) {
      await expect(guia).toContainText(texto);
    }
    const layout = await guia.evaluate((elemento) => {
      const inicio = elemento.querySelector('.guide-start')!;
      const retorno = elemento.querySelector('.guide-return')!;
      const texto = inicio.querySelector('p')!.getBoundingClientRect();
      const botao = inicio.querySelector('a')!.getBoundingClientRect();
      return {
        esquerda: inicio.getBoundingClientRect().left,
        retornoEsquerda: retorno.getBoundingClientRect().left,
        espaco: botao.top - texto.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(layout.espaco).toBeGreaterThanOrEqual(16);
    expect(layout.overflow).toBe(false);
    if (largura > 650) expect(layout.esquerda).toBeGreaterThan(layout.retornoEsquerda);
    await page.reload();
    await expect(guia).toBeVisible();
    await expect(page.locator('.application-card')).toHaveCount(0);
    await page.getByLabel('Idioma', { exact: true }).selectOption('en');
    await expect(page.getByRole('region', { name: 'How to apply', exact: true })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Start a new application', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Language', { exact: true }).selectOption('es');
    await expect(page.getByRole('region', { name: 'Cómo postularte', exact: true })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Iniciar una nueva candidatura', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Idioma', { exact: true }).selectOption('pt');
    await page.getByRole('link', { name: 'Iniciar nova candidatura', exact: true }).click();
    await expect(page).toHaveURL(/\/aluno\/candidatura\/nova$/);
    await expect(
      page.getByRole('heading', { name: 'Nova candidatura', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Primeira opção', { exact: true }).locator('option')).toHaveCount(
      4,
    );
  });
}
