# 1MCP Agent Documentation

This directory contains the VitePress-powered documentation site for 1MCP Agent, a unified Model Context Protocol server implementation that aggregates multiple MCP servers.

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
│   └── config/
│       ├── index.ts       # Main VitePress configuration
│       ├── en.ts         # English locale configuration
│       └── zh.ts         # Chinese locale configuration
├── public/                # Static assets
│   └── images/           # Site images and screenshots
│       ├── logo.png      # Site logo
│       └── *.png         # Feature screenshots
├── en/                   # English documentation (root locale)
│   ├── guide/            # Getting started guides
│   ├── commands/         # CLI command reference
│   ├── reference/        # Technical reference
│   └── index.md          # Homepage
├── zh/                   # Chinese documentation
│   ├── guide/            # 入门指南
│   ├── commands/         # 命令行参考
│   ├── reference/        # 技术参考
│   └── index.md          # 首页
├── CLAUDE.md             # Claude Code guidance file
└── README.md             # This file
```

## Adding Content

1. **New pages**: Add `.md` files in appropriate language directories (`en/` or `zh/`)
2. **Navigation**: Update sidebar configuration in respective locale config files:
   - English: `.vitepress/config/en.ts`
   - Chinese: `.vitepress/config/zh.ts`
3. **Links**: Use absolute paths (`/guide/getting-started`) for internal links
4. **Assets**: Place images and files in `docs/public/images/`
5. **Multilingual**: Create content in both English and Chinese for complete coverage

## Deployment

The site automatically deploys to GitHub Pages on pushes to `main` branch that affect the `docs/` directory.

- **Primary site**: `https://docs.1mcp.app/`
- **GitHub Pages**: `https://1mcp-app.github.io/agent/`
- **Workflow**: `.github/workflows/deploy-docs.yml`
- **Build**: VitePress static site generation with multilingual support

## Writing Guidelines

- Use clear, concise headings with proper hierarchy
- Include working code examples for all technical content
- Add frontmatter with title and description for all pages
- Keep navigation shallow (max 3 levels deep)
- Test all internal links before committing
- Maintain consistency between English and Chinese versions
- Use absolute paths for cross-references
- Include screenshots for UI-heavy features

## Site Features

### Core Features

- **Multilingual**: English and Chinese language support with switcher
- **Search**: Built-in local search across all content
- **Dark mode**: Automatic theme switching based on user preference
- **Mobile responsive**: Optimized for all device sizes
- **Fast loading**: Static site generation with optimized assets

### Technical Features

- **Mermaid diagrams**: Architecture and flow diagram support
- **Code highlighting**: JavaScript, TypeScript, Bash syntax highlighting
- **Analytics**: Google Analytics integration (G-46LFKQ768B)
- **SEO friendly**: Meta tags, sitemap, structured data
- **Version tracking**: Dynamic version display from package.json

### Documentation Structure

- **Guide section**: Getting started, features, Claude Desktop integration, fast startup
- **Commands section**: Complete CLI reference including MCP commands
- **Reference section**: Architecture, security, health checks, trust proxy configuration

## Recent Updates

### v0.17.0 Major Changes

- **Command restructure**: Renamed `server` commands to `mcp` commands
- **Claude Desktop integration**: New guide for Claude Desktop setup
- **Fast startup**: Performance optimization guide
- **Multilingual documentation**: Added Chinese language support
- **Enhanced CLI**: Improved command structure and help system
- **Async loading**: Real-time server loading notifications

### Documentation Improvements

- Restructured VitePress configuration to TypeScript
- Added multilingual support with English and Chinese
- Enhanced command reference with new MCP command structure
- Added new integration guides for Claude Desktop
- Improved navigation and cross-linking
