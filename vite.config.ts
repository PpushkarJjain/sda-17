import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.API_KEY_2': JSON.stringify(env.NEW_GEMINI_API_KEY || ''),
      'process.env.API_KEY_LABEL_1': JSON.stringify(
        env.GEMINI_API_KEY ? `Key 1 (...${env.GEMINI_API_KEY.slice(-4)})` : 'Key 1 (Not Set)'
      ),
      'process.env.API_KEY_LABEL_2': JSON.stringify(
        env.NEW_GEMINI_API_KEY ? `Key 2 (...${env.NEW_GEMINI_API_KEY.slice(-4)})` : 'Key 2 (Not Set)'
      ),
      'process.env.HAS_API_KEY_2': JSON.stringify(!!env.NEW_GEMINI_API_KEY),
      'process.env.KLING_ACCESS_KEY': JSON.stringify(env.KLING_ACCESS_KEY || ''),
      'process.env.KLING_SECRET_KEY': JSON.stringify(env.KLING_SECRET_KEY || ''),
      'process.env.HAS_KLING_KEY': JSON.stringify(!!env.KLING_ACCESS_KEY && !!env.KLING_SECRET_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
