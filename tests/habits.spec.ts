// tests/habits.spec.ts
import { test, expect } from '@playwright/test';

// Usar el estado de sesión de un usuario estándar
test.use({ storageState: 'playwright/.auth/usuario_estandar.json' });

test.describe('Gestión de Hábitos', () => {
  
  test('El usuario puede crear un hábito de tipo "Sí/No"', async ({ page }) => {
    await page.goto('/habits');

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

  test('El usuario puede registrar el progreso de un hábito', async ({ page }) => {
    // Asumiendo que el hábito "Leer 15 minutos" ya existe
    await page.goto('/habits');
    const habitCard = page.locator('.habit-card:has-text("Leer 15 minutos")');
    await habitCard.locator('button:has-text("Marcar como Hecho")').click();

    // La UI debería mostrar una confirmación (esto depende de la implementación)
    // Por ejemplo, podríamos esperar que el botón se deshabilite o cambie de texto.
    await expect(habitCard.locator('button')).toBeDisabled(); 
  });
});
