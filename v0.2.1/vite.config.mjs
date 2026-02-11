import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  root: 'svelte',
  base: './',
  plugins: [svelte()],
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    minify: false
  },
  server: {
    port: 5173
  }
});
