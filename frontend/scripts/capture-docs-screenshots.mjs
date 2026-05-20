import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'public', 'docs', 'screenshots');
const baseUrl = process.env.DOCS_BASE_URL ?? 'http://127.0.0.1:5173/';

const shots = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'docentes', label: 'Docentes' },
  { name: 'celulas-sedes', label: 'Células y sedes' },
  { name: 'facultades', label: 'Facultades' },
  { name: 'programas', label: 'Programas' },
  { name: 'periodos', label: 'Períodos' },
  { name: 'materias', label: 'Materias' },
  { name: 'clases', label: 'Clases' },
  { name: 'plantillas', label: 'Plantillas de clases' },
  { name: 'asignaciones', label: 'Asignaciones' },
  { name: 'horario-sede', label: 'Horario por sede' },
  { name: 'mapa', label: 'Mapa de sedes' },
];

async function waitForApp(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(600);
}

async function navigate(page, label) {
  const navItem = page.locator('nav').getByText(label, { exact: true });
  await navItem.click();
  await waitForApp(page);
}

async function save(page, name) {
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: false,
  });
}

async function openModalIfAvailable(page, buttonLabel, outputName) {
  const button = page.getByRole('button', { name: buttonLabel, exact: true });
  if (await button.count()) {
    await button.click();
    await page.waitForTimeout(500);
    await save(page, outputName);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});

page.setDefaultTimeout(10000);

try {
  await page.goto(baseUrl);
  await waitForApp(page);

  for (const shot of shots) {
    await navigate(page, shot.label);
    await save(page, shot.name);
  }

  await navigate(page, 'Clases');
  await openModalIfAvailable(page, 'Generar clases', 'clases-generador');

  await navigate(page, 'Plantillas de clases');
  await openModalIfAvailable(page, 'Nueva plantilla', 'plantillas-modal');

  console.log(`Capturas generadas en ${path.relative(root, outputDir)}`);
} finally {
  await browser.close();
}
