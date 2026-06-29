import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// `base` must match the GitHub Pages repo name so that asset URLs resolve
// correctly when the site is served from https://<user>.github.io/<repo>/.
// Change this single value if the repository is renamed.
export default defineConfig({
  base: '/fifa-world-cup-2026-sticker-tracker/',
  plugins: [react()],
})
