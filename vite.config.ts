import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        login: path.resolve(__dirname, 'login.html'),
        dashboard: path.resolve(__dirname, 'dashboard.html'),
        services: path.resolve(__dirname, 'services.html'),
        order: path.resolve(__dirname, 'order.html'),
        orders: path.resolve(__dirname, 'orders.html'),
        balance: path.resolve(__dirname, 'balance.html'),
        signup: path.resolve(__dirname, 'signup.html'),
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
