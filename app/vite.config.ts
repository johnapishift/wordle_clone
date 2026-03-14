import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'external-raw-txt',
      enforce: 'pre',
      resolveId(id, importer) {
        if (id.endsWith('.txt?raw')) {
          const rawPath = id.slice(0, -4) // strip ?raw suffix
          const importerDir = importer ? dirname(importer) : __dirname
          const absPath = resolve(importerDir, rawPath)
          return '\0raw:' + absPath
        }
      },
      load(id) {
        if (id.startsWith('\0raw:')) {
          const filePath = id.slice(5)
          const content = readFileSync(filePath, 'utf-8')
          return `export default ${JSON.stringify(content)}`
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
  },
})
