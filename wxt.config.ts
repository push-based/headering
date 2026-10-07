import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Headering',
    description: 'Modify HTTP request headers.',
    permissions: ['declarativeNetRequest', 'storage'],
    // modifyHeaders rules only apply to URLs the extension has host access to.
    host_permissions: ['<all_urls>'],
  },
});
