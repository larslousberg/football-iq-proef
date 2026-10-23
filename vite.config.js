import { defineConfig } from 'vite';

// Relative asset URLs keep the app working at GitHub Pages project paths
// (https://<owner>.github.io/<repository>/) as well as on a local server.
export default defineConfig({
  base: './',
});
