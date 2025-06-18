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
    // Setup projects
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'setup-users', testMatch: /auth-users\.setup\.ts/ },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usar el estado de autenticación guardado por el setup.
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup', 'setup-users'],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup', 'setup-users'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup', 'setup-users'],
    },
  ],
});
