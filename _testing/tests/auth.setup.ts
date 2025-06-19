// tests/auth.setup.ts

import { test as setup, expect } from '@playwright/test';

const adminAuthFile = 'playwright/.auth/admin.json';
const baseURL = 'https://ery-app-turso.vercel.app';

setup('autenticar como administrador', async ({ page }) => {
  // 1. Navegar a la página de login
  await page.goto(`${baseURL}/login`);

  // 2. Llenar las credenciales del administrador
  // ¡Asegúrate de que estas credenciales sean correctas!
  await page.getByLabel('Correo Electrónico').fill('wilkidblox711@gmail.com');
  await page.getByLabel('Contraseña').fill('72078269');

  // 3. Hacer clic para iniciar sesión
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // 4. Esperar a que la página cargue y la URL sea la correcta después del login.
  // Esto es crucial para asegurar que la autenticación fue exitosa antes de guardar el estado.
  await page.waitForURL(`${baseURL}/my-dashboard`);
  await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible();

  // 5. Guardar el estado de la sesión (cookies, etc.) en el archivo.
  // Este archivo será usado por las otras pruebas.
  await page.context().storageState({ path: adminAuthFile });
});
