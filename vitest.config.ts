import { defineConfig } from 'vitest/config'

// Unit-test config kept separate from vite.config.ts to avoid type conflicts
// between the app's Vite version and the one bundled with Vitest. Tests are
// pure logic (no JSX), so no plugins are needed here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
