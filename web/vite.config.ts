/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// One self-contained index.html: the server embeds it in its binary, so
// `cargo build` needs no Node (decision 157, after v0's decision 73).
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 100_000_000 },
  server: { proxy: { '/api': 'http://127.0.0.1:7330' } },
  test: { environment: 'node' },
})
