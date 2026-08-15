import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://chale-canto-do-sertao.pages.dev',
  output: 'static',
  integrations: [sitemap()],
});
