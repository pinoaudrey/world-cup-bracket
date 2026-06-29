/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: `base` must match your GitHub Pages repo name.
// The site is served from https://<user>.github.io/<repo-name>/ so the
// built asset URLs need this prefix. Change this if you rename the repo.
export default defineConfig({
  base: '/fifa-world-cup-2026-sticker-tracker/',
  plugins: [react()],
  server: { port: 3000 },
  preview: { port: 3000 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
