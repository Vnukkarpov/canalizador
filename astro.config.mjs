// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://karpov.pt',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    react(),
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: 'pt',
        locales: {
          pt: 'pt-PT',
          en: 'en',
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
