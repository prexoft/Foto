import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // crucial for Electron file:// protocol
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/venv/**', '**/model/**', '**/dist/**'],
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'firebase/app',
      'firebase/database',
      '@radix-ui/react-dialog',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      'class-variance-authority',
      'clsx',
      'sonner',
      'tailwind-merge',
      'next-themes'
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
