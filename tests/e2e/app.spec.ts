import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function entrar(page: Page, perfil: 'aluno' | 'dri') {
  await page.goto('/login');
  await page
    .getByRole('button', {
      name: perfil === 'aluno' ? 'Preencher acesso de aluno' : 'Preencher acesso da DRI',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${perfil}$`));
}
async function sair(page: Page) {
  await page.getByLabel('Conta e demonstração').click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
}
test('autenticação, destinos, candidatura, idiomas, avisos e apoio', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/aluno/candidatura');
  await expect(page).toHaveURL(/login\?retorno/);
  await page.getByLabel('Matrícula ou e-mail', { exact: true }).fill('2612758');
  await page.getByLabel('Senha', { exact: true }).fill('errada');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Matrícula, e-mail ou senha incorretos');
  await page.getByRole('button', { name: 'Preencher acesso de aluno', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/aluno\/candidatura$/);
  await expect(page.getByRole('heading', { name: 'Documentos solicitados' })).toBeVisible();
  await page.goto('/aluno');
  await expect(page.getByRole('heading', { name: 'Olá, Carol!' })).toBeVisible();
  const guia = page.getByRole('region', { name: 'Como se candidatar', exact: true });
  await expect(guia).toHaveCount(0);
  await expect(page.locator('.university-card')).toHaveCount(0);
  await page.getByRole('link', { name: 'Universidades', exact: true }).click();
  await expect(page).toHaveURL(/\/aluno\/universidades$/);
  await expect(page.locator('.university-card')).toHaveCount(3);
  await page.getByLabel('País', { exact: true }).selectOption('ES');
  await expect(page.locator('.university-card')).toHaveCount(1);
  await expect(page.locator('.university-card')).toContainText('Madri');
  await page.reload();
  await expect(page.getByLabel('País', { exact: true })).toHaveValue('ES');
  await page.getByRole('link', { name: 'Limpar filtros' }).click();
  await expect(page.locator('.university-card')).toHaveCount(3);
  await page.getByLabel('Duração', { exact: true }).selectOption('12');
  await expect(page.locator('.university-card')).toHaveCount(1);
  await page.goto('/aluno');
  await page.getByRole('link', { name: 'Ver critérios' }).click();
  await expect(page.getByRole('heading', { name: 'Verificação de elegibilidade' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Engenharia de Computação', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Administração', exact: true })).toHaveCount(0);
  await page.getByLabel('Idioma', { exact: true }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Eligibility check' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Language', { exact: true })).toHaveValue('en');
  await page.getByLabel('Language', { exact: true }).selectOption('es');
  await expect(page.getByRole('heading', { name: 'Verificación de elegibilidad' })).toBeVisible();
  await page.getByLabel('Idioma', { exact: true }).selectOption('pt');
  await page.goto('/aluno');
  await page.getByLabel('Idioma', { exact: true }).selectOption('en');
  await expect(page.getByRole('region', { name: 'How to apply', exact: true })).toHaveCount(0);
  await page.getByLabel('Language', { exact: true }).selectOption('es');
  await expect(page.getByRole('region', { name: 'Cómo postularte', exact: true })).toHaveCount(0);
  await page.getByLabel('Idioma', { exact: true }).selectOption('pt');
  await page.goto('/aluno/avisos');
  await page.getByRole('button', { name: 'Marcar como lido', exact: true }).first().click();
  await expect(page.getByRole('link', { name: 'Avisos (1)', exact: true })).toBeVisible();
  await page.goto('/aluno/apoio');
  for (const name of [
    'Instituição de destino',
    'Calendário acadêmico',
    'Transporte',
    'Alimentação',
    'Serviços de apoio',
  ])
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.goto('/dri/convenios');
  await expect(page).toHaveURL('/acesso-negado');
  await page.goto('/aluno/universidades/porto');
  await expect(page.getByRole('heading', { name: 'Não encontramos este conteúdo.' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('DRI cria instituição e convênio, aluno consulta e inativação preserva candidatura', async ({
  page,
}) => {
  await entrar(page, 'dri');
  await page.goto('/dri/convenios/novo');
  await page.getByText('Cadastrar ou editar instituição', { exact: true }).click();
  const aux = page.locator('.institution-editor');
  await aux.getByLabel('Nome da instituição').fill('Instituição Validação');
  await aux.getByLabel('Cidade', { exact: true }).fill('Lisboa');
  await aux.getByRole('button', { name: 'Salvar instituição', exact: true }).click();
  await expect(aux.getByRole('status').last()).toContainText('Instituição salva');
  await page.getByLabel('Engenharia de Computação', { exact: true }).check();
  await page.getByLabel('Duração em meses', { exact: true }).fill('9');
  await page.getByRole('button', { name: 'Cadastrar convênio', exact: true }).click();
  await expect(page).toHaveURL(/\/dri\/convenios\?salvo/);
  await expect(page.getByRole('row').filter({ hasText: 'Instituição Validação' })).toContainText(
    '9 meses',
  );
  await sair(page);
  await entrar(page, 'aluno');
  await page.goto('/aluno/universidades');
  await expect(
    page.locator('.university-card').filter({ hasText: 'Instituição Validação' }),
  ).toBeVisible();
  await sair(page);
  await entrar(page, 'dri');
  await page.goto('/dri/convenios');
  const row = page.getByRole('row').filter({ hasText: 'Instituição Validação' });
  await row.getByRole('link', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Duração em meses', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Instituição Validação' })).toContainText(
    '10 meses',
  );
  await page
    .getByRole('row')
    .filter({ hasText: 'Instituição Validação' })
    .getByRole('button', { name: 'Inativar', exact: true })
    .click();
  await expect(page.getByRole('row').filter({ hasText: 'Instituição Validação' })).toContainText(
    'Inativo',
  );
  await sair(page);
  await entrar(page, 'aluno');
  await page.goto('/aluno/universidades');
  await expect(
    page.locator('.university-card').filter({ hasText: 'Instituição Validação' }),
  ).toHaveCount(0);
  await page.goto('/aluno/candidatura');
  await expect(page.getByRole('heading', { name: 'Documentos solicitados' })).toBeVisible();
});
test('cadastro, relatórios PDF e atendimento dos dois perfis', async ({ page }) => {
  await entrar(page, 'dri');
  await page.goto('/dri/alunos/novo');
  await page.getByLabel('Nome completo', { exact: true }).fill('Estudante E2E');
  await page.getByLabel('Matrícula', { exact: true }).fill('88800001');
  await page.getByLabel('Telefone', { exact: true }).fill('85999990000');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByRole('button', { name: 'Cadastrar aluno', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Estudante E2E', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name: 'Estudante E2E', exact: true })).toBeVisible();
  await page.goto('/dri/relatorios');
  await page.getByLabel('Situação', { exact: true }).selectOption('finalizado');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar relatório PDF', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs('test-results/relatorio.pdf');
  expect(download.suggestedFilename()).toBe('internacionalizacao-intercambios.pdf');
  await sair(page);
  await entrar(page, 'aluno');
  await page.goto('/aluno/atendimento');
  await page.getByLabel('Canal de origem').selectOption('whatsapp');
  await page.getByLabel('Assunto', { exact: true }).fill('Dúvida E2E');
  await page.getByLabel('Mensagem', { exact: true }).fill('Gostaria de uma orientação.');
  await page.getByRole('button', { name: 'Enviar solicitação', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Dúvida E2E/ })).toBeVisible();
  await sair(page);
  await entrar(page, 'dri');
  await page.goto('/dri/atendimento');
  await page.getByRole('link', { name: 'Dúvida E2E', exact: true }).click();
  await page.getByLabel('Mensagem', { exact: true }).fill('Resposta demonstrativa E2E');
  await page.getByRole('button', { name: 'Enviar resposta', exact: true }).click();
  await sair(page);
  await entrar(page, 'aluno');
  await page.goto('/aluno/atendimento');
  await page.getByRole('link', { name: 'Dúvida E2E', exact: true }).click();
  await expect(page.getByText('Resposta demonstrativa E2E', { exact: true })).toBeVisible();
});
test('layout responsivo sem transbordamento e menu mobile', async ({ page }) => {
  await entrar(page, 'aluno');
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/aluno');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width < 650) {
      await page.goto('/aluno/avisos');
      const aviso = page.locator('.notice-full').first();
      const texto = await aviso.locator(':scope > div').boundingBox();
      const acao = await aviso
        .getByRole('button', { name: 'Marcar como lido', exact: true })
        .boundingBox();
      expect(texto!.width).toBeGreaterThan(180);
      expect(acao!.y).toBeGreaterThanOrEqual(texto!.y + texto!.height);
      await page.goto('/aluno');
    }
    if (width < 650) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await page.getByRole('link', { name: 'Universidades', exact: true }).click();
      await expect(page).toHaveURL(/\/aluno\/universidades$/);
    }
  }
});

test('aluno anexa, baixa, substitui e remove documentos com persistência após reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrar(page, 'aluno');
  await page.goto('/aluno/candidatura');
  await expect(page.locator('.document-upload')).toHaveCount(11);
  const historico = page.getByRole('listitem', { name: 'Histórico acadêmico', exact: true });
  const campo = page.getByLabel('Arquivo para Histórico acadêmico', { exact: true });
  const arquivo = {
    name: 'historico.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nDocumento de teste\n%%EOF'),
  };
  await campo.setInputFiles(arquivo);
  await expect(historico.getByText('Pendente', { exact: true })).toBeVisible();
  await expect(page.getByText('0 de 11 enviados', { exact: true })).toBeVisible();
  await expect(historico.locator('.selected-file')).toContainText('historico.pdf');
  await page.reload();
  await expect(historico.locator('.selected-file')).toHaveCount(0);
  await campo.setInputFiles(arquivo);
  await historico
    .getByRole('button', { name: 'Enviar documento de Histórico acadêmico', exact: true })
    .click();
  await expect(historico.getByText('Aguardando análise', { exact: true })).toBeVisible();
  await expect(historico).toContainText('historico.pdf');
  await expect(page.getByText('1 de 11 enviados', { exact: true })).toBeVisible();
  await page.reload();
  await expect(historico).toContainText('historico.pdf');
  const downloadPromise = page.waitForEvent('download');
  await historico
    .getByRole('button', { name: 'Baixar arquivo de Histórico acadêmico', exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('historico.pdf');
  expect(await readFile((await download.path())!)).toEqual(arquivo.buffer);
  await campo.setInputFiles({
    name: 'incorreto.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('texto'),
  });
  await historico
    .getByRole('button', { name: 'Enviar documento de Histórico acadêmico', exact: true })
    .click();
  await expect(historico.getByRole('alert')).toContainText('Use um arquivo PDF, JPG ou PNG.');
  await expect(historico).toContainText('historico.pdf');
  await campo.setInputFiles({ ...arquivo, name: 'historico-atualizado.pdf' });
  await expect(historico.locator('.attached-file')).toContainText('historico.pdf');
  await historico
    .getByRole('button', { name: 'Enviar documento de Histórico acadêmico', exact: true })
    .click();
  await expect(historico.locator('.attached-file')).toContainText('historico-atualizado.pdf');
  await expect(historico.getByRole('alert')).toHaveCount(0);
  await historico
    .getByRole('button', { name: 'Remover arquivo de Histórico acadêmico', exact: true })
    .click();
  await expect(historico.getByText('Pendente', { exact: true })).toBeVisible();
  await expect(historico).not.toContainText('historico-atualizado.pdf');
  await page.reload();
  await expect(historico.getByText('Pendente', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('DRI visualiza arquivos, aprova e pede correção; aluno acompanha e reenvia', async ({
  page,
}) => {
  const historicoArquivo = {
    name: 'historico.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nHistorico\n%%EOF'),
  };
  const passaporteArquivo = {
    name: 'passaporte.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=',
      'base64',
    ),
  };
  const historico = page.getByRole('listitem', { name: 'Histórico acadêmico', exact: true });
  const passaporte = page.getByRole('listitem', { name: 'Passaporte', exact: true });
  await entrar(page, 'aluno');
  await page.goto('/aluno/candidatura');
  for (const [nome, arquivo] of [
    ['Histórico acadêmico', historicoArquivo],
    ['Passaporte', passaporteArquivo],
  ] as const) {
    await page.getByLabel(`Arquivo para ${nome}`, { exact: true }).setInputFiles(arquivo);
    await page.getByRole('button', { name: `Enviar documento de ${nome}`, exact: true }).click();
    await expect(
      page
        .getByRole('listitem', { name: nome, exact: true })
        .getByText('Aguardando análise', { exact: true }),
    ).toBeVisible();
  }
  await page.goto('/dri/candidaturas');
  await expect(page).toHaveURL('/acesso-negado');
  await page.goto('/aluno/candidatura');
  await sair(page);
  await entrar(page, 'dri');
  await page
    .locator('.admin-shortcuts')
    .getByRole('link', { name: /Candidaturas/ })
    .click();
  await expect(page).toHaveURL(/\/dri\/candidaturas$/);
  await expect(page.getByRole('row').filter({ hasText: 'Carol' })).toContainText(
    '2 de 11 enviados',
  );
  await page.getByRole('link', { name: 'Ver candidatura', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Candidatura de Carol', exact: true }),
  ).toBeVisible();
  await passaporte
    .getByRole('button', { name: 'Visualizar arquivo de Passaporte', exact: true })
    .click();
  const preview = page.getByRole('dialog', { name: 'Prévia de Passaporte', exact: true });
  await expect(preview).toBeVisible();
  await expect
    .poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1);
  await page.keyboard.press('Escape');
  await expect(preview).not.toBeVisible();
  const baixar = page.waitForEvent('download');
  await passaporte
    .getByRole('button', { name: 'Baixar arquivo de Passaporte', exact: true })
    .click();
  expect(await readFile((await (await baixar).path())!)).toEqual(passaporteArquivo.buffer);
  await passaporte.getByRole('button', { name: 'Aprovar documento', exact: true }).click();
  await expect(passaporte.getByText('Aprovado', { exact: true })).toBeVisible();
  await historico.getByRole('button', { name: 'Pedir correção', exact: true }).click();
  await expect(historico.getByRole('alert')).toContainText('Informe o que precisa ser corrigido.');
  await historico
    .getByLabel('Orientação para o aluno', { exact: true })
    .fill('Envie o histórico completo, com todas as páginas legíveis.');
  await historico.getByRole('button', { name: 'Pedir correção', exact: true }).click();
  await expect(historico.getByText('Correção solicitada', { exact: true })).toBeVisible();
  await page.reload();
  await expect(passaporte.getByText('Aprovado', { exact: true })).toBeVisible();
  await expect(historico).toContainText('todas as páginas legíveis');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await sair(page);
  await entrar(page, 'aluno');
  await expect(page.getByText('Correção solicitada', { exact: true })).toBeVisible();
  await page.goto('/aluno/candidatura');
  await expect(passaporte.getByText('Aprovado', { exact: true })).toBeVisible();
  await expect(historico.getByText('Correção solicitada', { exact: true })).toBeVisible();
  await expect(historico).toContainText('todas as páginas legíveis');
  await page
    .getByLabel('Arquivo para Histórico acadêmico', { exact: true })
    .setInputFiles({ ...historicoArquivo, name: 'historico-corrigido.pdf' });
  await historico
    .getByRole('button', { name: 'Enviar documento de Histórico acadêmico', exact: true })
    .click();
  await expect(historico.getByText('Aguardando análise', { exact: true })).toBeVisible();
  await expect(historico.getByText('Correção solicitada', { exact: true })).toHaveCount(0);
  await sair(page);
  await entrar(page, 'dri');
  await page.goto('/dri/candidaturas/cand-ana');
  await expect(historico).toContainText('historico-corrigido.pdf');
  await historico.getByRole('button', { name: 'Aprovar documento', exact: true }).click();
  await expect(historico.getByText('Aprovado', { exact: true })).toBeVisible();
  await sair(page);
  await entrar(page, 'aluno');
  await page.goto('/aluno/candidatura');
  await expect(historico.getByText('Aprovado', { exact: true })).toBeVisible();
  await expect(passaporte.getByText('Aprovado', { exact: true })).toBeVisible();
});

test('menus fecham ao clicar fora, mudar o foco, navegar ou pressionar Escape', async ({
  page,
}) => {
  for (const perfil of ['aluno', 'dri'] as const) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await entrar(page, perfil);
    const conta = page.getByLabel('Conta e demonstração');
    const dropdown = page.locator('.account-menu');
    await conta.click();
    await expect(dropdown).toHaveJSProperty('open', true);
    await dropdown.locator('strong').click();
    await expect(dropdown).toHaveJSProperty('open', true);
    await page.locator('main h1').click();
    await expect(dropdown).toHaveJSProperty('open', false);
    await conta.click();
    await page.keyboard.press('Escape');
    await expect(dropdown).toHaveJSProperty('open', false);
    await expect(conta).toBeFocused();
    await conta.click();
    await page
      .getByRole('navigation', { name: 'Menu', exact: true })
      .getByRole('link', { name: 'Início', exact: true })
      .focus();
    await expect(dropdown).toHaveJSProperty('open', false);

    await page.setViewportSize({ width: 390, height: 700 });
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.locator('main h1').click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await menu.click();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
    await conta.click();
    await menu.click();
    await expect(dropdown).toHaveJSProperty('open', false);
    await page
      .getByRole('navigation', { name: 'Menu', exact: true })
      .getByRole('link', { name: perfil === 'aluno' ? 'Universidades' : 'Convênios', exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${perfil}/${perfil === 'aluno' ? 'universidades' : 'convenios'}$`),
    );
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await sair(page);
  }
});

test('novas páginas abrem no topo e o histórico restaura a rolagem no celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await entrar(page, 'aluno');
  const apoio = page.getByRole('link', { name: 'Consultar informações', exact: true });
  await apoio.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const posicaoOrigem = await page.evaluate(() => window.scrollY);
  await apoio.click();
  await expect(page).toHaveURL(/\/aluno\/apoio$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.evaluate(() => window.scrollTo(0, 300));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
  await page.goBack();
  await expect(page).toHaveURL(/\/aluno$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(posicaoOrigem, 0);
  await page.goForward();
  await expect(page).toHaveURL(/\/aluno\/apoio$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
});

test('alterar filtros na mesma página mantém a posição de leitura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await entrar(page, 'aluno');
  await page.goto('/aluno/universidades');
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200);
  await page.getByLabel('País', { exact: true }).selectOption('ES');
  await expect(page.locator('.university-card')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200);
});
