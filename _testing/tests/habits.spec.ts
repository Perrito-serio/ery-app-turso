// tests/habits.spec.ts
import { test, expect } from '@playwright/test';

// Usar el estado de sesión de un usuario estándar
test.use({ storageState: 'playwright/.auth/usuario_estandar.json' });

test.describe('Gestión de Hábitos', () => {
  
  test('El usuario puede crear un hábito de tipo "Sí/No"', async ({ page }) => {
    await page.goto('/habits');

    // Hacer clic en el botón para abrir el modal
    await page.getByRole('button', { name: '+ Crear Hábito' }).click();
    
    // Esperar a que el modal esté visible
    await expect(page.getByRole('heading', { name: 'Crear Nuevo Hábito' })).toBeVisible();

    // Llenar el formulario del modal
    await page.getByLabel('Nombre del Hábito').fill('Leer 15 minutos');
    await page.getByLabel('Descripción (opcional)').fill('Lectura diaria');
    await page.getByLabel('Tipo de Hábito').selectOption({ label: 'Sí / No (ej. Meditar)' });
    await page.getByRole('button', { name: 'Crear Hábito' }).click();

    // Verificar que el hábito aparece en la lista
    await expect(page.getByText('Leer 15 minutos')).toBeVisible();
  });

  test('Crear hábito "Medible Numérico"', async ({ page }) => {
    await page.goto('/habits');
    
    // Abrir modal de creación
    await page.getByRole('button', { name: '+ Crear Hábito' }).click();
    
    // Llenar formulario para hábito numérico
    await page.getByLabel('Nombre del hábito').fill('Beber agua');
    await page.getByLabel('Descripción').fill('Beber 8 vasos de agua al día');
    await page.getByLabel('Tipo de hábito').selectOption('MEDIBLE_NUMERICO');
    await page.getByLabel('Meta objetivo').fill('8');
    await page.getByLabel('Unidad de medida').fill('vasos');
    
    // Crear hábito
    await page.getByRole('button', { name: 'Crear Hábito' }).click();
    
    // Verificar que se creó exitosamente
    await expect(page.getByText('Beber agua')).toBeVisible();
  });
  
  test('Crear hábito "Mal Hábito"', async ({ page }) => {
    await page.goto('/habits');
    
    // Abrir modal de creación
    await page.getByRole('button', { name: '+ Crear Hábito' }).click();
    
    // Llenar formulario para mal hábito
    await page.getByLabel('Nombre del hábito').fill('Fumar');
    await page.getByLabel('Descripción').fill('Reducir el consumo de cigarrillos');
    await page.getByLabel('Tipo de hábito').selectOption('MAL_HABITO');
    
    // Crear hábito
    await page.getByRole('button', { name: 'Crear Hábito' }).click();
    
    // Verificar que se creó exitosamente
    await expect(page.getByText('Fumar')).toBeVisible();
  });
  
  test('Registrar progreso en hábito SI_NO', async ({ page }) => {
    await page.goto('/habits');
    
    // Buscar un hábito existente o crear uno nuevo
    const habitCard = page.locator('[data-testid="habit-card"]').first();
    
    if (await habitCard.count() === 0) {
      // Crear un hábito si no existe ninguno
      await page.getByRole('button', { name: '+ Crear Hábito' }).click();
      await page.getByLabel('Nombre del hábito').fill('Test Hábito');
      await page.getByLabel('Tipo de hábito').selectOption('SI_NO');
      await page.getByRole('button', { name: 'Crear Hábito' }).click();
    }
    
    // Marcar como completado
    await page.locator('[data-testid="complete-habit-btn"]').first().click();
    
    // Verificar que se registró el progreso
    await expect(page.locator('[data-testid="habit-completed"]').first()).toBeVisible();
  });
  
  test('Editar hábito existente', async ({ page }) => {
    await page.goto('/habits');
    
    // Buscar botón de editar en el primer hábito
    const editButton = page.locator('[data-testid="edit-habit-btn"]').first();
    
    if (await editButton.count() > 0) {
      await editButton.click();
      
      // Modificar el nombre
      await page.getByLabel('Nombre del hábito').fill('Hábito Editado');
      
      // Guardar cambios
      await page.getByRole('button', { name: 'Guardar Cambios' }).click();
      
      // Verificar que se guardó
      await expect(page.getByText('Hábito Editado')).toBeVisible();
    }
  });
  
  test('Eliminar hábito', async ({ page }) => {
    await page.goto('/habits');
    
    // Contar hábitos iniciales
    const initialCount = await page.locator('[data-testid="habit-card"]').count();
    
    if (initialCount > 0) {
      // Eliminar el primer hábito
      await page.locator('[data-testid="delete-habit-btn"]').first().click();
      
      // Confirmar eliminación
      await page.getByRole('button', { name: 'Confirmar' }).click();
      
      // Verificar que se eliminó
      const finalCount = await page.locator('[data-testid="habit-card"]').count();
      expect(finalCount).toBe(initialCount - 1);
    }
  });
  
  test('Validación de formulario - campos requeridos', async ({ page }) => {
    await page.goto('/habits');
    
    // Abrir modal de creación
    await page.getByRole('button', { name: '+ Crear Hábito' }).click();
    
    // Intentar crear sin llenar campos requeridos
    await page.getByRole('button', { name: 'Crear Hábito' }).click();
    
    // Verificar mensajes de error
    await expect(page.getByText('El nombre es requerido')).toBeVisible();
  });
});
