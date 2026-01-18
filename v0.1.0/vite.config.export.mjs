import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolveSrc = (p) => path.resolve(__dirname, 'svelte', 'src', p);

export default defineConfig({
  root: 'svelte',
  base: './',
  publicDir: false,
  plugins: [svelte()],
  build: {
    outDir: '../documentation/docs/site_assets/blockscape',
    emptyOutDir: true,
    lib: {
      entry: resolveSrc('Blockscape.svelte'),
      name: 'Blockscape',
      fileName: () => 'blockscape.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'blockscape.css';
          }
          return assetInfo.name ?? '[name][extname]';
        },
      },
    },
  },
});
