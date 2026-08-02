import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-router-dom': path.resolve(__dirname, 'src/lib/router.tsx'),
      'date-fns': path.resolve(__dirname, 'src/lib/date-fns.ts'),
      'zustand': path.resolve(__dirname, 'src/lib/zustand.ts'),
      'react-markdown': path.resolve(__dirname, 'src/lib/react-markdown.tsx'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
