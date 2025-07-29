# 1MCP Documentation

This directory contains the VitePress-powered documentation site for 1MCP.

## Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm docs:dev

# Build for production
pnpm docs:build

# Preview production build
pnpm docs:preview
```

## Directory Structure

```
docs/
├── .vitepress/
│   └── config.js          # VitePress configuration
├── public/                # Static assets
│   ├── logo.svg          # Site logo
│   └── favicon.ico       # Site favicon
├── guide/                # Getting started guides
├── reference/            # Technical reference
└── index.md              # Homepage
```

## Adding Content

1. **New pages**: Add `.md` files in appropriate directories
2. **Navigation**: Update `docs/.vitepress/config.js` sidebar configuration
3. **Links**: Use absolute paths (`/guide/getting-started`) for internal links
4. **Assets**: Place images and files in `docs/public/`

## Deployment

The site automatically deploys to GitHub Pages on pushes to `main` branch that affect the `docs/` directory.

- **Live site**: `https://1mcp-app.github.io/agent/`
- **Workflow**: `.github/workflows/deploy-docs.yml`

## Writing Guidelines

- Use clear, concise headings
- Include code examples for technical content
- Add frontmatter for page metadata
- Keep navigation shallow (max 3 levels)
- Test all internal links before committing

## VitePress Features

- **Search**: Built-in local search
- **Dark mode**: Automatic theme switching
- **Mobile responsive**: Works on all devices
- **Fast**: Optimized for performance
- **SEO friendly**: Meta tags, sitemap, structured data
