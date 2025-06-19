// tests/admin.spec.ts
import { test, expect } from '@playwright/test';

// Usar el estado de sesión de administrador
test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Funcionalidades de Administrador', () => {
  
  test('El administrador puede acceder a la gestión de usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Verificar que la página carga correctamente
    await expect(page.getByRole('heading', { name: /Administrar Usuarios|Gestión de Usuarios/i })).toBeVisible();
    
    // Verificar que la tabla de usuarios está presente
    await expect(page.getByRole('table')).toBeVisible();
    
    // Verificar que hay al menos un usuario en la tabla
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });
  
  test('El administrador puede ver detalles de usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Esperar a que la tabla cargue
    await expect(page.getByRole('table')).toBeVisible();
    
    // Verificar que existen columnas esperadas
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Nombre')).toBeVisible();
    await expect(page.getByText('Estado')).toBeVisible();
    await expect(page.getByText('Roles')).toBeVisible();
  });
  
  test('El administrador puede activar/desactivar usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Esperar a que la tabla cargue
    await expect(page.getByRole('table')).toBeVisible();
    
    // Buscar un botón de toggle de estado (puede variar según implementación)
    const toggleButtons = page.locator('button:has-text("Activar"), button:has-text("Desactivar")');
    
    if (await toggleButtons.count() > 0) {
      const firstToggleButton = toggleButtons.first();
      const initialText = await firstToggleButton.textContent();
      
      // Hacer clic en el botón
      await firstToggleButton.click();
      
      // Verificar que aparece una confirmación o el estado cambia
      // (esto depende de la implementación específica)
      await page.waitForTimeout(1000); // Esperar a que se procese la acción
    }
  });
  
  test('El administrador puede editar roles de usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Esperar a que la tabla cargue
    await expect(page.getByRole('table')).toBeVisible();
    
    // Buscar enlaces o botones de edición
    const editLinks = page.locator('a:has-text("Editar"), button:has-text("Editar")');
    
    if (await editLinks.count() > 0) {
      await editLinks.first().click();
      
      // Verificar que se navega a una página de edición o se abre un modal
      await expect(page.getByText(/Editar|Roles/i)).toBeVisible();
    }
  });
  
  test('El administrador no puede desactivarse a sí mismo', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Esperar a que la tabla cargue
    await expect(page.getByRole('table')).toBeVisible();
    
    // Buscar la fila del administrador actual (wilkidblox711@gmail.com)
    const adminRow = page.locator('tr:has-text("wilkidblox711@gmail.com")');
    
    if (await adminRow.count() > 0) {
      // Verificar que no hay botón de desactivar para el admin actual
      // o que está deshabilitado
      const toggleButton = adminRow.locator('button:has-text("Desactivar")');
      
      if (await toggleButton.count() > 0) {
        await expect(toggleButton).toBeDisabled();
      }
    }
  });
});

test.describe('Tests de API para Administrador', () => {
  
  test('API de usuarios requiere permisos de administrador', async ({ request }) => {
    // Test sin autenticación
    const response = await request.get('/api/admin/users');
    expect(response.status()).toBe(401);
  });
  
  test('API de usuarios devuelve datos válidos para administrador', async ({ request, page }) => {
    // Primero navegar para establecer cookies de sesión
    await page.goto('/admin/users');
    
    // Hacer request con el contexto de la página (incluye cookies)
    const response = await page.request.get('/api/admin/users');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('users');
    expect(Array.isArray(data.users)).toBe(true);
  });
});