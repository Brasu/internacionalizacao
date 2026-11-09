import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch(existsSync(chrome) ? { executablePath: chrome } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
  await page.goto(`${base}/login`);
  await page.getByRole('button', { name: 'Preencher acesso de aluno' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('heading', { name: 'Olá, Carol!' }).waitFor();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const medicoes = [];
  for (let i = 0; i < 5; i++) {
    const inicio = performance.now();
    await page.goto(`${base}/aluno/universidades`);
    await page.locator('.university-card').nth(2).waitFor();
    medicoes.push(Math.round(performance.now() - inicio));
  }
  console.log(
    JSON.stringify(
      {
        browser: browser.version(),
        base,
        cache: 'desativado',
        throttling: false,
        medicoesMs: medicoes,
        maximoMs: Math.max(...medicoes),
        aprovadoLocalmente: medicoes.every((ms) => ms < 2000),
      },
      null,
      2,
    ),
  );
  if (medicoes.some((ms) => ms >= 2000)) process.exitCode = 1;
} finally {
  await browser.close();
}
