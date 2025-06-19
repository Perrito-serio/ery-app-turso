// tests/auth-users.setup.ts
import { test as setup, expect } from '@playwright/test';

// Configurar autenticación para usuario estándar
setup('authenticate as standard user', async ({ page }) => {
  await page.goto('/login');
  
  // Llenar formulario de login para usuario estándar
  await page.getByLabel('Correo Electrónico').fill('user1@tecsup.com');
  await page.getByLabel('Contraseña').fill('password123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  
  // Esperar a que se complete el login
  await page.waitForURL('/my-dashboard');
  
  // Verificar que el usuario está autenticado
  await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible();
  
  // Guardar estado de autenticación
  await page.context().storageState({ path: 'playwright/.auth/usuario_estandar.json' });
});

// Configurar autenticación para moderador
setup('authenticate as moderator', async ({ page }) => {
  await page.goto('/login');
  
  // Llenar formulario de login para moderador
  await page.getByLabel('Correo Electrónico').fill('wilkidblox@hotmail.com');
  await page.getByLabel('Contraseña').fill('123456789');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  
  // Esperar a que se complete el login
  await page.waitForURL('/my-dashboard');
  
  // Verificar que el moderador está autenticado
  await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible();
  
  // Guardar estado de autenticación
  await page.context().storageState({ path: 'playwright/.auth/mod.json' });
});

// Configurar autenticación para usuario con rol específico de pruebas
setup('authenticate as test user', async ({ page }) => {
  await page.goto('/login');
  
  // Usar credenciales de usuario estándar existente para pruebas
  await page.getByLabel('Correo Electrónico').fill('user2@tecsup.com');
  await page.getByLabel('Contraseña').fill('password123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  
  // Esperar a que se complete el login
  await page.waitForURL('/my-dashboard');
  
  // Verificar autenticación
  await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible();
  
  // Guardar estado de autenticación
  await page.context().storageState({ path: 'playwright/.auth/test_user.json' });
});