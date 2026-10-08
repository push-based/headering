import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Headering',
    description: 'Modify and inspect HTTP headers.',
    permissions: ['browsingData', 'cookies', 'declarativeNetRequest', 'scripting', 'storage', 'webRequest'],
    // modifyHeaders rules and webRequest events only apply to URLs the extension has host access to.
    host_permissions: ['<all_urls>'],
  },
});
