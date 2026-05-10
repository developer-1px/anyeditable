import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  server: {
    deps: {
      inline: ['@p/aria-kernel'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./test-setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx', 'src/**/__tests__/*.test.ts', 'src/**/__tests__/*.test.tsx'],
  },
})
