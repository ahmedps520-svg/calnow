import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed to GitHub Pages at https://<user>.github.io/calnow/
// Override with BASE_PATH=/ when hosting on a root domain (Netlify, Vercel, local).
const base = process.env.BASE_PATH ?? '/calnow/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 900,
  },
});
