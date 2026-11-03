import { defineConfig } from '@playwright/test'

// Ports of their own, and `migration:fresh` wipes the database of this checkout.
const API_PORT = 3334
const APP_PORT = 5174

export default defineConfig({
  testDir: './e2e',
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'default',
      use: {
        browserName: 'chromium',
        channel: process.platform === 'win32' ? 'msedge' : undefined,
      },
    },
  ],
  webServer: [
    {
      command: 'node ace migration:fresh && node ace serve',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}`,
      env: { PORT: String(API_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}`,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
