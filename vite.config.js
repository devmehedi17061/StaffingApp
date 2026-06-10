import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/StaffingApp/',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});
