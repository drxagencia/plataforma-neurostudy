
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env to prevent "process is not defined" crashes in browser
    'process.env': {}
  },
  server: {
    host: '0.0.0.0',
  }
});
