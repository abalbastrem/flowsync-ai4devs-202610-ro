import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Los E2E (e2e/*.spec.ts) son de Playwright, no de Vitest.
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      restoreMocks: true,
      // Cobertura de ramas para la matriz de trazabilidad (se activa con --coverage).
      // El código generado (componentes de shadcn) queda fuera de la medida.
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/components/ui/**', 'src/test/**', '**/*.test.{ts,tsx}'],
        reporter: ['json', 'json-summary', 'text-summary'],
        reportsDirectory: 'coverage',
      },
    },
  }),
)
