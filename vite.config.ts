/// <reference types="vitest/config" />
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Dev-only convenience: lets the running app persist brackets/results straight
// to the committed JSON files, so the admin just edits on localhost and runs
// `git push` — no export/import dance. Active ONLY under `vite` dev
// (apply: 'serve'); it is never part of the production build, so the published
// GitHub Pages site remains a read-only static app that cannot write anything.
function devDataWriter(): Plugin {
  const targets: Record<string, string> = {
    brackets: 'public/data/brackets.json',
    results: 'public/data/results.json',
  }
  return {
    name: 'dev-data-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        // The '/__save' prefix is stripped, leaving e.g. '/brackets'.
        const key = (req.url || '/').replace(/^\/+/, '').split('?')[0]
        const target = targets[key]
        if (!target) {
          res.statusCode = 404
          res.end('Unknown save target')
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            JSON.parse(body) // validate before touching disk
            await writeFile(
              resolve(process.cwd(), target),
              body.endsWith('\n') ? body : body + '\n',
              'utf8',
            )
            res.statusCode = 200
            res.setHeader('content-type', 'application/json')
            res.end('{"ok":true}')
          } catch (err) {
            res.statusCode = 400
            res.end(`Invalid JSON: ${(err as Error).message}`)
          }
        })
      })
    },
  }
}

export default defineConfig({
  base: '/fifa-world-cup-2026-sticker-tracker/',
  plugins: [react(), devDataWriter()],
  server: {
    port: 3000,
    // Don't let auto-saving the data files trigger a dev full-reload.
    watch: { ignored: ['**/public/data/**'] },
  },
  preview: { port: 3000 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
