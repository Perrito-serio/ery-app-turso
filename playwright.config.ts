// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'https://ery-app-turso.vercel.app/',
    trace: 'on-first-retry',
  },

  projects: [
    // 1. Definir un proyecto de "setup" que se ejecutará primero.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // 2. Definir los proyectos de navegador que dependen del setup.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usar el estado de autenticación guardado por el setup.
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'], // ¡Esta línea es clave!
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],
});
