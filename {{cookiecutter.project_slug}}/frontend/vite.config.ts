import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { defineConfig } from 'vite';

const backendUrl =
  process.env.VITE_BACKEND_URL ?? 'http://{% if cookiecutter.use_docker == "y" %}django{% else %}127.0.0.1{% endif %}:8000';
const backendWsUrl = process.env.VITE_BACKEND_WS_URL ?? backendUrl.replace(/^http/, 'ws');

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/accounts': {
        target: backendUrl,
      },
      '/_allauth': {
        target: backendUrl,
      },
      '/api': {
        target: backendUrl,
      },
      '/admin': {
        target: backendUrl,
      },
      '/static': {
        target: backendUrl,
      },
      '/media': {
        target: backendUrl,
      },
      '/__debug__': {
        target: backendUrl,
      },
      {%- if cookiecutter.use_async == 'y' %}
      '/ws': {
        target: backendWsUrl,
        ws: true,
      },
      {%- endif %}
    },
  },
  build: {
    manifest: 'manifest.json',
  },
});
