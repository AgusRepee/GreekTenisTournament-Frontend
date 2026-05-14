import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // En GitHub Pages la app se sirve en /nombre-repo/; en local en /
  const base = process.env.GITHUB_ACTIONS === 'true' ? '/GreekTenisTournament/' : '/';
  return {
    base,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@/data': path.resolve(__dirname, 'src/data'),
        '@/config': path.resolve(__dirname, 'src/config'),
        '@/lib': path.resolve(__dirname, 'src/lib'),
        '@/pages': path.resolve(__dirname, 'src/pages'),
        '@/services': path.resolve(__dirname, 'src/services'),
        '@/types': path.resolve(__dirname, 'src/types'),
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
