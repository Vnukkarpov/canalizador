// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://karpov.pt',
  integrations: [react(), mdx(), sitemap({
      // Temporary: keep "coming soon" pages out of the sitemap until they have real content
      filter: (page) => !page.includes('/blog') && !page.includes('/calculadoras'),
    })],
  vite: {
    plugins: [tailwindcss()],
  },
});
