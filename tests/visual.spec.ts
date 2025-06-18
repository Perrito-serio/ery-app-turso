// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Regresión Visual', () => {

  test('La página de Login se mantiene consistente', async ({ page }) => {
    await page.goto('/login');
    // Compara la captura de pantalla con la guardada en la carpeta de snapshots
    await expect(page).toHaveScreenshot('login-page.png');
  });

  test('El dashboard del admin se ve correctamente', async ({ page }) => {
    // Usamos la sesión del admin para esta prueba
    await page.goto('/admin/users', { waitUntil: 'networkidle' });
    // Tomamos una captura del área de la tabla de usuarios
    const usersTable = page.locator('table');
    await expect(usersTable).toHaveScreenshot('admin-users-table.png', {
        mask: [page.locator('.user-id')], // Ocultamos los IDs para que la prueba no falle si cambian
    });
  });
});