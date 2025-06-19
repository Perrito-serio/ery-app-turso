// tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accesibilidad', () => {

  test('La página de registro no debe tener violaciones de accesibilidad graves', async ({ page }) => {
    await page.goto('/register');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) // Estándares a verificar
      .analyze();
    
    // Verificamos que no haya violaciones en los resultados del escaneo
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('El modal de creación de hábitos debe ser accesible', async ({ page }) => {
    await page.goto('/habits');
    await page.click('button:has-text("Crear Hábito")');
    
    // Esperar a que el modal esté visible
    await expect(page.locator('.create-habit-modal')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.create-habit-modal') // Analizar solo el contenido del modal
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
