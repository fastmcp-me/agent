import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import enConfig from './en';
import zhConfig from './zh';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));
const version = `v${packageJson.version}`;

export default withMermaid(
  defineConfig({
    title: '1MCP Agent',

    lastUpdated: true,
    cleanUrls: true,
    metaChunk: true,

    rewrites: {
      'en/:rest*': ':rest*',
    },

    locales: {
      root: { label: 'English', ...enConfig(version) },
      zh: { label: '简体中文', ...zhConfig(version) },
    },

    head: [
      ['link', { rel: 'icon', href: '/favicon.ico' }],
      ['meta', { name: 'theme-color', content: '#3eaf7c' }],
      ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
      ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-46LFKQ768B' }],
      [
        'script',
        {},
        `window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-46LFKQ768B');`,
      ],
    ],

    // Vite configuration for proper dependency handling
    vite: {
      optimizeDeps: {
        include: ['mermaid', '@braintree/sanitize-url', 'dayjs', 'debug', 'cytoscape', 'cytoscape-cose-bilkent'],
      },
    },

    themeConfig: {
      logo: '/images/logo.png',

      socialLinks: [{ icon: 'github', link: 'https://github.com/1mcp-app/agent' }],

      outline: {
        level: [2, 3],
      },
    },

    markdown: {
      theme: {
        light: 'github-light',
        dark: 'github-dark',
      },
      lineNumbers: true,
    },

    sitemap: {
      hostname: 'https://docs.1mcp.app/',
    },

    ignoreDeadLinks: [
      // Ignore localhost and relative links that don't exist yet
      /^https?:\/\/localhost/,
      /^http?:\/\/localhost/,
      /^\.\/[A-Z]/, // Relative links to uppercase files
      /^\.\.\/[A-Z]/, // Parent dir links to uppercase files
      './../README',
      './../CONTRIBUTING',
    ],

    // Mermaid configuration
    mermaid: {
      theme: 'base',
      themeVariables: {
        primaryColor: '#3eaf7c',
        primaryTextColor: '#213547',
        primaryBorderColor: '#3eaf7c',
        lineColor: '#484c55',
        sectionBkColor: '#f6f8fa',
        altSectionBkColor: '#ffffff',
        gridColor: '#e1e4e8',
        secondaryColor: '#f6f8fa',
        tertiaryColor: '#ffffff',
      },
    },
  }),
);
