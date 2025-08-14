import { DefaultTheme, defineConfig } from 'vitepress';

export default function createConfig(version: string) {
  return defineConfig({
    lang: 'en-US',
    description: 'One MCP server to aggregate them all - A unified Model Context Protocol server implementation',

    themeConfig: {
      nav: nav(version),

      sidebar: sidebar(),

      footer: {
        message: 'Released under the Apache 2.0 License.',
        copyright: 'Copyright © 2025-present 1MCP',
      },

      editLink: {
        pattern: 'https://github.com/1mcp-app/agent/edit/main/docs/:path',
        text: 'Edit this page on GitHub',
      },
    },
  });
}

function nav(version: string): DefaultTheme.NavItem[] {
  return [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'Commands', link: '/commands/' },
    { text: 'Reference', link: '/reference/architecture' },
    {
      text: version,
      items: [
        { text: 'Changelog', link: 'https://github.com/1mcp-app/agent/blob/main/CHANGELOG.md' },
        { text: 'Contributing', link: 'https://github.com/1mcp-app/agent/blob/main/CONTRIBUTING.md' },
      ],
    },
  ];
}

function sidebar(): DefaultTheme.Sidebar {
  return {
    '/guide/': [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/guide/getting-started' },
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Installation', link: '/guide/installation' },
        ],
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Architecture', link: '/reference/architecture' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Authentication', link: '/guide/authentication' },
        ],
      },
      {
        text: 'Integration',
        items: [{ text: 'Claude Desktop Integration', link: '/guide/claude-desktop-integration' }],
      },
      {
        text: 'Features',
        items: [
          { text: 'Feature Overview', link: '/guide/features' },
          { text: 'Core Features', link: '/guide/features/core' },
          { text: 'Security & Access Control', link: '/guide/features/security' },
          { text: 'Performance & Reliability', link: '/guide/features/performance' },
          { text: 'Enterprise & Operations', link: '/guide/features/enterprise' },
          { text: 'Developer & Integration', link: '/guide/features/developer' },
          { text: 'Fast Startup', link: '/guide/fast-startup' },
          { text: 'Pagination Support', link: '/guide/pagination' },
          { text: 'Server Filtering', link: '/guide/server-filtering' },
          { text: 'Proxy Support', link: '/guide/proxy-support' },
          { text: 'Server Management', link: '/guide/server-management' },
          { text: 'App Consolidation', link: '/guide/app-consolidation' },
        ],
      },
    ],
    '/commands/': [
      {
        text: 'Overview',
        items: [{ text: 'Command Reference', link: '/commands/' }],
      },
      {
        text: 'Server Management',
        items: [
          { text: 'serve', link: '/commands/serve' },
          {
            text: 'mcp',
            link: '/commands/mcp/',
            items: [
              { text: 'add', link: '/commands/mcp/add' },
              { text: 'remove', link: '/commands/mcp/remove' },
              { text: 'update', link: '/commands/mcp/update' },
              { text: 'enable/disable', link: '/commands/mcp/enable-disable' },
              { text: 'list', link: '/commands/mcp/list' },
              { text: 'status', link: '/commands/mcp/status' },
            ],
          },
        ],
      },
      {
        text: 'App Integration',
        items: [
          {
            text: 'app',
            link: '/commands/app/',
            items: [
              { text: 'consolidate', link: '/commands/app/consolidate' },
              { text: 'restore', link: '/commands/app/restore' },
              { text: 'list', link: '/commands/app/list' },
              { text: 'discover', link: '/commands/app/discover' },
              { text: 'status', link: '/commands/app/status' },
              { text: 'backups', link: '/commands/app/backups' },
            ],
          },
        ],
      },
    ],
    '/reference/': [
      {
        text: 'Architecture',
        items: [
          { text: 'System Architecture', link: '/reference/architecture' },
          { text: 'Security Model', link: '/reference/security' },
          { text: 'Feature Comparison', link: '/reference/feature-comparison' },
        ],
      },
      {
        text: 'API Reference',
        items: [{ text: 'Health Check API', link: '/reference/health-check' }],
      },
      {
        text: 'Configuration',
        items: [{ text: 'Trust Proxy', link: '/reference/trust-proxy' }],
      },
    ],
  };
}
