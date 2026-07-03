import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.tsx'],
    deps: {
      optimizer: {
        web: {
          include: ['vitest-canvas-mock']
        }
      }
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/routeTree.gen.ts',
      ],
    },
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@galiprandi/react-tools': path.resolve(__dirname, './src/test/__mocks__/@galiprandi/react-tools.ts'),
    },
  },
})
