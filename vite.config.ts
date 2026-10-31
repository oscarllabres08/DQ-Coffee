import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function sharePreview(siteUrl: string): Plugin {
  return {
    name: 'dq-share-preview',
    transformIndexHtml(html) {
      const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '';
      const site = (siteUrl || (vercelHost ? `https://${vercelHost}` : '')).replace(/\/$/, '');
      const image = site ? `${site}/og.jpg` : '/og.jpg';
      return html.replaceAll('__OG_IMAGE__', image).replaceAll('__OG_URL__', site);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), sharePreview(env.VITE_SITE_URL || '')],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
