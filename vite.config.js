import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// GitHub Pages serves this repo at https://<domain>/<repo-name>/, so every
// asset URL has to start with the repo name. package.json "name" is the repo name.
export default defineConfig({
  base: `/${pkg.name}/`,
  plugins: [react()],
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {},
  // the ledger's columns (src/data/cols/<name>.bin.gz) are gzipped typed
  // arrays the page fetches and inflates itself (src/lib/load.ts): plain
  // assets, emitted with hashed names and never transformed. GitHub Pages
  // serves .gz as-is, so nothing double-compresses them.
  assetsInclude: ['**/*.bin.gz'],
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx,js,jsx}'], exclude: ['**/node_modules/**', '**/.claude/**', '**/dist/**'] },
  // the ledgers' entity files and columns are plain assets fetched by kind (src/ledger-client.js), never bundled
  build: {
    chunkSizeWarningLimit: 8000,
    // a column or an entity file is never inlined as a data: URL, however small
    assetsInlineLimit: (file) => (/\.bin\.gz$|src[\\/]data[\\/](player|coach|team)\.json$/.test(file) ? false : undefined),
  },
})
