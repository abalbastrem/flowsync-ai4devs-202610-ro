import { defineConfig } from '@playwright/test'

// Ports and database of their own: these tests never touch the development data.
const API_PORT = 3334
const APP_PORT = 5174

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: 0,
  workers: 1,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
  },
  // NFR-6 is one pass before the test week, not every PR (see the Definition of
  // Done): E2E_ALL_BROWSERS=1 runs it. Otherwise one browser: Edge on Windows,
  // where it is already there, and Chromium elsewhere.
  projects: process.env.E2E_ALL_BROWSERS
    ? [
        { name: 'chromium', use: { browserName: 'chromium' } },
        { name: 'firefox', use: { browserName: 'firefox' } },
        { name: 'webkit', use: { browserName: 'webkit' } },
      ]
    : [
        {
          name: 'default',
          use: {
            browserName: 'chromium',
            channel:
              !isCI && process.platform === 'win32' ? 'msedge' : undefined,
          },
        },
      ],
  webServer: [
    {
      command: 'node ace migration:fresh && node ace serve',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}`,
      env: {
        PORT: String(API_PORT),
        DB_FILE: 'e2e.sqlite3',
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}`,
      env: {
        VITE_API_URL: `http://localhost:${API_PORT}`,
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
