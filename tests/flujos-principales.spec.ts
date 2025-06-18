// tests/flujos-principales.spec.ts
import { test, expect } from '@playwright/test';

const baseURL = 'https://ery-app-turso.vercel.app';

test.describe('Flujo de Usuario Estándar', () => {
  test('debe permitir iniciar sesión y ver el dashboard personal', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.getByLabel('Correo Electrónico').fill('user1@tecsup.com');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(`${baseURL}/my-dashboard`);
    await expect(page).toHaveTitle(/Mi Dashboard/);
    await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible();
    await expect(page.getByText('Hábitos Activos')).toBeVisible();
  });
});

test.describe('Flujo de Administrador', () => {
  const adminAuthFile = 'playwright/.auth/admin.json';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(`${baseURL}/login`);
    await page.getByLabel('Correo Electrónico').fill('wilkidblox711@gmail.com');
    await page.getByLabel('Contraseña').fill('72078269');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL(`${baseURL}/my-dashboard`);
    await page.context().storageState({ path: adminAuthFile });
    await page.close();
  });

  test.use({ storageState: adminAuthFile });

  test('debe acceder al dashboard y luego a la Gestión de Usuarios para verificar la tabla', async ({ page }) => {
    // 1. Ir al dashboard
    await page.goto(`${baseURL}/my-dashboard`);
    await expect(page).toHaveTitle(/Mi Dashboard/);

    // 2. Ir a la Gestión de Usuarios
    await page.goto(`${baseURL}/admin/users`);

    // 3. Verificar encabezado
    await expect(
      page.getByRole('heading', { name: /Administrar Usuarios del Sistema|Gestión de Usuarios/i })
    ).toBeVisible();

    // 4. Verificar que la tabla tenga contenido
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 });
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // 5. Verificar la existencia de un usuario conocido
    await expect(page.getByText('jeanpiero.zea@tecsup.edu.pe')).toBeVisible();
  });
});
