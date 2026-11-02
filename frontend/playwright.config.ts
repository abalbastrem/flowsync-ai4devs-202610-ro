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
    // CI installs Chromium; on Windows, Edge is already there.
    channel: isCI ? undefined : 'msedge',
    trace: 'retain-on-failure',
  },
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
