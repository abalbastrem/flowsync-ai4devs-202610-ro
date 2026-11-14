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
  // The json report is what the traceability matrix reads (docs/trazabilidad/config.json).
  reporter: [
    [isCI ? 'github' : 'list'],
    ['json', { outputFile: 'tmp/resultados-e2e.json' }],
  ],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
  },
  // One browser: Edge on Windows, where it is already installed, Chromium elsewhere.
  projects: [
    {
      name: 'default',
      use: {
        browserName: 'chromium',
        channel: !isCI && process.platform === 'win32' ? 'msedge' : undefined,
      },
    },
  ],
  webServer: [
    {
      command: 'node ace migration:fresh --force && node ace serve',
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
