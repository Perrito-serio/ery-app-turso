// tests/roles-permissions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Control de Acceso - Usuario Estándar', () => {
  // Usar el estado de sesión de usuario estándar
  test.use({ storageState: 'playwright/.auth/usuario_estandar.json' });
  
  test('Usuario estándar puede acceder a su dashboard', async ({ page }) => {
    await page.goto('/my-dashboard');
    await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible();
  });
  
  test('Usuario estándar puede acceder a gestión de hábitos', async ({ page }) => {
    await page.goto('/habits');
    await expect(page.getByRole('heading', { name: /Mis Hábitos|Panel de Hábitos/i })).toBeVisible();
  });
  
  test('Usuario estándar NO puede acceder a gestión de usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Debería redirigir al login o mostrar error de acceso
    await expect(page).toHaveURL(/\/login|\/$/);
  });
  
  test('Usuario estándar NO puede acceder a rutas de administración', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Verificar que no puede acceder
    await expect(page).not.toHaveURL('/admin/users');
  });
  
  test('API de admin devuelve 401/403 para usuario estándar', async ({ page }) => {
    // Navegar primero para establecer cookies
    await page.goto('/my-dashboard');
    await page.waitForLoadState('networkidle');
    
    // Intentar acceder a API de admin
    const response = await page.request.get('/api/admin/users');
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Control de Acceso - Moderador', () => {
  // Usar el estado de sesión de moderador
  test.use({ storageState: 'playwright/.auth/mod.json' });
  
  test('Moderador puede acceder a su dashboard', async ({ page }) => {
    await page.goto('/my-dashboard');
    await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible();
  });
  
  test('Moderador puede acceder a funciones de moderación', async ({ page }) => {
    await page.goto('/moderate');
    
    // Verificar que puede acceder a la página de moderación
    // (ajustar según la implementación específica)
    await expect(page).toHaveURL('/moderate');
  });
  
  test('Moderador tiene acceso limitado a gestión de usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Los moderadores pueden ver usuarios pero con funcionalidades limitadas
    // (esto depende de la implementación específica)
    const hasAccess = await page.locator('body').textContent();
    
    // Verificar que no es redirigido al login
    await expect(page).not.toHaveURL('/login');
  });
});

test.describe('Control de Acceso - Administrador', () => {
  // Usar el estado de sesión de administrador
  test.use({ storageState: 'playwright/.auth/admin.json' });
  
  test('Administrador tiene acceso completo a gestión de usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    
    await expect(page.getByRole('heading', { name: /Administrar Usuarios|Gestión de Usuarios/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });
  
  test('Administrador puede acceder a todas las rutas', async ({ page }) => {
    const routes = ['/my-dashboard', '/habits', '/admin/users', '/moderate'];
    
    for (const route of routes) {
      await page.goto(route);
      // Verificar que no es redirigido al login
      await expect(page).not.toHaveURL('/login');
    }
  });
  
  test('API de admin funciona correctamente para administrador', async ({ page }) => {
    await page.goto('/admin/users');
    
    const response = await page.request.get('/api/admin/users');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('users');
  });
});

test.describe('Tests de API - Autorización', () => {
  
  test('Endpoints protegidos requieren autenticación', async ({ request }) => {
    const protectedEndpoints = [
      '/api/habits',
      '/api/dashboard',
      '/api/admin/users',
      '/api/profile'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });
  
  test('Endpoints de admin requieren rol de administrador', async ({ page }) => {
    // Usar sesión de usuario estándar
    await page.goto('/login');
    await page.getByLabel('Correo Electrónico').fill('user1@tecsup.com');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('/my-dashboard');
    
    // Intentar acceder a endpoints de admin
    const adminEndpoints = [
      '/api/admin/users',
      '/api/admin/users/1/toggle-active',
      '/api/admin/users/1/roles'
    ];
    
    for (const endpoint of adminEndpoints) {
      const response = await page.request.get(endpoint);
      expect([401, 403]).toContain(response.status());
    }
  });
});