import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/layouts': path.resolve(__dirname, './src/layouts'),
      '@/features': path.resolve(__dirname, './src/features'),
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      // Proxy SEO files to Django backend
      // Matches: sitemap.xml, page-sitemap.xml, post-sitemap.xml, etc.
      '^/(sitemap\\.xml|[a-z-]+-sitemap\\.xml)$': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/sitemap.xsl': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/llms.txt': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
