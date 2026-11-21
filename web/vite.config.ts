import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The build goes to web/dist, which server.mjs serves. `npm run dev` proxies the API to the
// server on port 3000.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://127.0.0.1:3000' } },
  build: { assetsInlineLimit: 0 },
});
