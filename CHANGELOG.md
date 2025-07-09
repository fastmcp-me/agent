# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.0] - 2025-07-08

### 🚀 Features
- Add error handling for missing streamable HTTP sessions by @xizhibei
- Implement ping handler for client health checks by @xizhibei
- Add Vitest support and type checking script by @xizhibei
- Refactor project structure and enhance authentication management by @xizhibei
- Add .cursorindexingignore and update .gitignore for improved file management by @xizhibei
- Update server info management and enhance initialization by @xizhibei
- Add unit tests for capability management and conflict resolution by @xizhibei
- Implement debounced configuration reload on file changes by @xizhibei
- Add comprehensive tests for cursor parsing and encoding utilities by @xizhibei
- Enhance connection handling and logging by @xizhibei
- Enhance URI parsing with robust validation and error handling by @xizhibei
- Enhance session and auth code validation with improved error handling by @xizhibei
- Add glama.json configuration file for maintainers by @xizhibei

### 🚜 Refactor
- Preserve original notification structure while modifying parameters by @xizhibei

### 🧪 Testing
- Add vitest framework for client filtering tests by @xizhibei


## [0.11.0] - 2025-06-26

### 🚀 Features
- Add source-map-support for improved error stack traces by @xizhibei
- Add rate limiting for OAuth endpoints and update package dependencies by @xizhibei
- Enhance session management by adding path traversal validation for session IDs and auth codes by @xizhibei
- Add helper function to dynamically build OAuth issuer URL for improved environment support by @xizhibei
- Enhance OAuth 2.1 implementation with session ID prefixes, improved token validation, and comprehensive documentation by @xizhibei
- Implement OAuth 2.1 authentication with session management and middleware integration by @xizhibei
- Enhance error handling for notifications in client-server communication by @xizhibei
- Add CORS support and implement OAuth 2.1 endpoints for authorization and token management by @xizhibei
- Include outputSchema and annotations in tool registration for enhanced tool metadata by @xizhibei
- Implement completion request handlers and enhance capability checks in client operations by @xizhibei
- Add ElicitRequest and PingRequest handlers to improve client-server interaction by @xizhibei

### 🐛 Bug Fixes
- For code scanning alert no. 4: Uncontrolled data used in path expression by @xizhibei in [#62](https://github.com/1mcp-app/agent/pull/62)

### 🚜 Refactor
- Update access token generation to use UUIDs and improve session management by @xizhibei

### 📚 Documentation
- Update README to include new options for pagination, authentication, and session management by @xizhibei
- Add section on debugging and source maps to README by @xizhibei

### ⚙️ Miscellaneous Tasks
- Remove deprecated Docker build workflow and integrate into main workflow by @xizhibei


## [0.10.3] - 2025-06-11

### 🚜 Refactor
- Replace getInstance with getOrCreateInstance in tests for singleton behavior by @xizhibei


## [0.10.2] - 2025-06-11

### 🐛 Bug Fixes
- Mcp client disconnect after reload by @xizhibei
- Restore status property in ClientInfo and update client disconnection handling by @xizhibei


## [0.10.1] - 2025-06-10

### 🐛 Bug Fixes
- Infer transport type if missing and update validation logic by @xizhibei


## [0.10.0] - 2025-06-10

### 🚀 Features
- Add support for 'streamableHttp' transport type and refactor transport creation logic by @xizhibei
- Add pagination support to transport connection and related handlers by @xizhibei

### 🐛 Bug Fixes
- Prevent duplicate listeners and increase max listeners for transport config changes by @xizhibei

### 🚜 Refactor
- Streamline resource and template listing with pagination support by @xizhibei
- Replace ERROR_CODES with ErrorCode in various files for improved error handling consistency by @xizhibei


## [0.9.0] - 2025-05-06

### 💼 Other
- Streamable http transport by @xizhibei in [#34](https://github.com/1mcp-app/agent/pull/34)

### ⚙️ Miscellaneous Tasks
- Update Docker build workflow conditions to include branch checks by @xizhibei


## [0.8.2] - 2025-05-03

### 🐛 Bug Fixes
- Update RequestHandlerExtra type to support generic parameters by @xizhibei


## [0.8.1] - 2025-05-03

### ⚙️ Miscellaneous Tasks
- Remove branch restriction from Docker build workflow for improved flexibility by @xizhibei


## [0.8.0] - 2025-04-14

### 🚀 Features
- Add Smithery.ai configuration file with command and schema definitions by @xizhibei
- Enable environment variable parsing with ONE_MCP prefix by @xizhibei
- Integrate client capabilities into createClient function and define server/client capabilities in constants by @xizhibei

### 🐛 Bug Fixes
- Enhance logging capabilities with console transport and MCP transport integration by @xizhibei

### 💼 Other
- Vitest by @xizhibei in [#19](https://github.com/1mcp-app/agent/pull/19)
- Merge pull request #14 from 1mcp-app/dependabot/npm_and_yarn/typescript-5.8.3 by @xizhibei in [#14](https://github.com/1mcp-app/agent/pull/14)
- Merge pull request #15 from 1mcp-app/dependabot/npm_and_yarn/express-5.1.0 by @xizhibei in [#15](https://github.com/1mcp-app/agent/pull/15)
- Merge pull request #16 from 1mcp-app/dependabot/npm_and_yarn/eslint-plugin-prettier-5.2.6 by @xizhibei in [#16](https://github.com/1mcp-app/agent/pull/16)
- Merge pull request #17 from 1mcp-app/dependabot/npm_and_yarn/modelcontextprotocol/sdk-1.9.0 by @xizhibei in [#17](https://github.com/1mcp-app/agent/pull/17)
- Merge pull request #18 from 1mcp-app/dependabot/npm_and_yarn/eslint/js-9.24.0 by @xizhibei in [#18](https://github.com/1mcp-app/agent/pull/18)
- Merge pull request #12 from 1mcp-app/dependabot/npm_and_yarn/types/node-22.13.14 by @xizhibei in [#12](https://github.com/1mcp-app/agent/pull/12)
- Merge pull request #13 from 1mcp-app/dependabot/npm_and_yarn/typescript-eslint/parser-8.29.0 by @xizhibei in [#13](https://github.com/1mcp-app/agent/pull/13)
- Merge pull request #11 from 1mcp-app/dependabot/npm_and_yarn/modelcontextprotocol/sdk-1.8.0 by @xizhibei in [#11](https://github.com/1mcp-app/agent/pull/11)
- Merge pull request #10 from 1mcp-app/dependabot/npm_and_yarn/ts-jest-29.3.1 by @xizhibei in [#10](https://github.com/1mcp-app/agent/pull/10)
- Merge pull request #9 from 1mcp-app/dependabot/npm_and_yarn/typescript-eslint/eslint-plugin-8.29.0 by @xizhibei in [#9](https://github.com/1mcp-app/agent/pull/9)

### 🚜 Refactor
- Enhance MCP transport integration and logging setup by @xizhibei

### 📚 Documentation
- Add badges, Docker instructions, and environment variable configuration examples by @xizhibei

### ⚙️ Miscellaneous Tasks
- Update Docker build workflow to trigger on successful completion of the "Publish Package" workflow and enhance image metadata by @xizhibei
- Add GitHub Actions workflow for building and pushing Docker images by @xizhibei
- Add Dockerfile and .dockerignore for containerization by @xizhibei
- Consolidate release process by removing old release.yml and integrating steps into main.yml by @xizhibei

## New Contributors
* @github-actions[bot] made their first contribution

## [0.7.0] - 2025-03-27

### ⚙️ Miscellaneous Tasks
- Create temporary branch for changelog and version updates before pushing to main by @xizhibei


## [0.6.0] - 2025-03-26

### ⚙️ Miscellaneous Tasks
- Update release workflows to trigger on version tags and successful completion of publish job by @xizhibei


## [0.5.0] - 2025-03-26

### 🚀 Features
- Dynamically set MCP_SERVER_VERSION from package.json, improving version management and consistency by @xizhibei
- Enhance logging setup by adding SSEServerTransport support and configuring console transport for visibility, improving logging flexibility based on server type by @xizhibei
- Add comprehensive tests for clientManager and introduce utility functions for client filtering, enhancing test coverage and maintainability by @xizhibei
- Refactor operation execution with retry logic and introduce comprehensive tests for client operations, enhancing error handling and reliability by @xizhibei
- Enhance client capability management by adding filtering functions and updating request handlers to utilize capabilities, improving client interaction and resource management by @xizhibei

### 💼 Other
- Merge pull request #3 from 1mcp-app/dependabot/npm_and_yarn/eslint/js-9.23.0 by @xizhibei in [#3](https://github.com/1mcp-app/agent/pull/3)
- Merge pull request #4 from 1mcp-app/dependabot/npm_and_yarn/ts-jest-29.3.0 by @xizhibei in [#4](https://github.com/1mcp-app/agent/pull/4)
- Merge pull request #5 from 1mcp-app/dependabot/npm_and_yarn/types/express-5.0.1 by @xizhibei in [#5](https://github.com/1mcp-app/agent/pull/5)
- Merge pull request #6 from 1mcp-app/dependabot/npm_and_yarn/eslint-9.23.0 by @xizhibei in [#6](https://github.com/1mcp-app/agent/pull/6)
- Merge pull request #7 from 1mcp-app/dependabot/npm_and_yarn/eslint-plugin-prettier-5.2.4 by @xizhibei in [#7](https://github.com/1mcp-app/agent/pull/7)

### 🚜 Refactor
- Remove log directory creation logic from logger setup, simplifying initialization process by @xizhibei

### ⚙️ Miscellaneous Tasks
- Automate version updates for MCP_SERVER_VERSION and package.json in changelog process by @xizhibei
- Add git-cliff configuration and automate changelog generation in workflows by @xizhibei
- Update inspector command in package.json for simplified usage and adjust README instructions accordingly by @xizhibei
- Automate version updates in package.json by @xizhibei
- Add author and bugs section to package.json for improved metadata and issue tracking by @xizhibei
- Add keywords for better discoverability and update homepage URL to GitHub repository by @xizhibei


## [0.4.0] - 2025-03-23

### ⚙️ Miscellaneous Tasks
- Update package and server version to 0.4.0 for consistency across project by @xizhibei


## [0.3.0] - 2025-03-23

### 🚀 Features
- Add HOST configuration for ExpressServer, allowing customizable host settings for SSE transport by @xizhibei
- Implement comprehensive Jest tests for ServerManager, covering transport connection, disconnection, and management methods to ensure robust functionality and error handling by @xizhibei
- Add Jest configuration and initial tests for ConfigManager, enhancing test coverage and ensuring proper functionality of configuration management by @xizhibei
- Add bug report issue template to streamline bug reporting process and improve user feedback collection by @xizhibei
- Add lint step by @xizhibei
- Add ESLint configuration and integrate TypeScript support, enhancing code quality and consistency across the project by @xizhibei
- Add support for client filtering by tags in transport connections, enhancing server-client interaction and flexibility by @xizhibei

### 🚜 Refactor
- Remove redundant file transport configurations from logger setup, simplifying logging structure and improving maintainability by @xizhibei
- Streamline transport handling in ServerManager and related components, enhancing type safety and maintainability by replacing ClientTransports with a more generic EnhancedTransport interface by @xizhibei
- Update configManager export and improve import structure in configReloadService for better clarity and maintainability by @xizhibei
- Consolidate transport-related types and schemas into a single file, improving organization and type safety across the application by @xizhibei
- Enhance client management with improved error handling and structured types, ensuring better resilience and maintainability in client operations by @xizhibei
- Update client management to use structured types for clients and transports, enhancing type safety and maintainability across the application by @xizhibei

### 📚 Documentation
- Update transport options and add tags section for server filtering, enhancing configuration clarity and usage examples by @xizhibei


## [0.2.0] - 2025-03-19

### 🚀 Features
- Extend transport configuration to support 'http' type, enhancing transport options for improved flexibility by @xizhibei
- Implement global configuration management with dynamic path resolution and default config creation by @xizhibei
- Add Zod schema for transport configuration validation, improving error handling and flexibility in transport creation by @xizhibei
- Refactor client creation to utilize constants for server name and version, enhancing maintainability and consistency across the application by @xizhibei
- Refactor server initialization by introducing ExpressServer class for improved structure and maintainability by @xizhibei
- Enhance ConfigManager to accept custom config file path and update server setup to utilize it by @xizhibei
- Add MCP server capabilities constant and refactor server setup to utilize it by @xizhibei
- Add request/response logging middleware and enhance server with logging capabilities by @xizhibei
- Refactor server setup and introduce ServerManager for improved transport handling and logging by @xizhibei
- Enhance connection handling and logging in MCPTransport class by @xizhibei
- Enhance configuration reload logic with improved transport handling by @xizhibei

### 🚜 Refactor
- Enhance logging middleware with Zod schemas for request and notification validation, improving type safety and error handling by @xizhibei
- Update transport configuration types from MCPTransport to MCPServerParams, enhancing flexibility for transport creation and error handling by @xizhibei
- Restructure logger imports to use dedicated logger directory and enhance logging capabilities across the application by @xizhibei
- Remove defaultMeta from logger and update loggerName in MCP transport to '1mcp' by @xizhibei

### 📚 Documentation
- Update quick start guide and configuration details, enhancing clarity on server setup and usage instructions by @xizhibei

### ⚙️ Miscellaneous Tasks
- Bump version to 0.2.0 and update README for enhanced transport options and configuration management by @xizhibei


## [0.1.0] - 2025-03-16

### 🚀 Features
- Create dependabot.yml by @xizhibei
- Integrate husky and lint-staged for improved pre-commit checks. by @xizhibei
- Add .node-version file and GitHub Actions workflow for package publishing. Introduced a version file for Node.js setup and created a CI workflow to automate package publishing to npm and GitHub Package Registry upon release events. Updated package.json to include repository information and publish configuration. by @xizhibei
- Add yargs and related types for command line argument parsing. Updated package.json and pnpm-lock.yaml to include yargs and its type definitions, enhancing the server's command line interface capabilities. Updated README with usage instructions for new transport options. by @xizhibei
- Rename project to 1MCP and update description for clarity. Changed package name and bin entry to reflect the new branding, and enhanced the project description to emphasize its unified MCP server capabilities. by @xizhibei
- Enhance logger configuration with custom formatting and improved file transport paths. Updated logger to use a custom format for console and file outputs, ensuring better log readability and structured output. Prevent logger from exiting on error to maintain stability. by @xizhibei
- Implement dynamic configuration reload service and configuration manager. Added graceful shutdown handling, integrated configuration watching, and improved transport management during configuration changes. by @xizhibei
- Introduce custom error types and centralized error handling utilities. Added new error codes to constants, implemented error handling in client operations and notification handlers, and enhanced request handlers with partial failure notifications. by @xizhibei
- Refactor server initialization and transport handling. Introduced modular client and transport management, added capability registration, and improved notification handling. Enhanced connection retry logic with configurable settings. by @xizhibei
- Integrate MCP transport for enhanced logging and connection status management. Added winston-transport dependency, updated logger to handle MCP connections, and implemented log level adjustments based on client connections. by @xizhibei
- Add application constants for server configuration and error handling by @xizhibei

### 🐛 Bug Fixes
- Ensure callback is invoked when not connected to maintain log integrity. This change prevents potential log loss by calling the callback function when the transport is not connected. by @xizhibei

### 💼 Other
- Merge pull request #1 from 1mcp-app/dependabot/npm_and_yarn/modelcontextprotocol/sdk-1.7.0 by @xizhibei in [#1](https://github.com/1mcp-app/agent/pull/1)
- Merge pull request #2 from 1mcp-app/dependabot/npm_and_yarn/types/node-22.13.10 by @xizhibei in [#2](https://github.com/1mcp-app/agent/pull/2)
- Enhance transport handling and connection logic. Introduced dynamic transport loading from mcp.json, improved retry logic with exponential backoff for client connections, and updated logging to include JSON stringification of notifications. by @xizhibei

### 🚜 Refactor
- Improve client connection logic with enhanced error handling and exponential backoff. Updated logging for connection attempts and added error handling for client creation failures. by @xizhibei

### 📚 Documentation
- Update project overview and features, enhance server configuration details, and switch to pnpm for dependency management by @xizhibei

### 🎨 Styling
- Update tab width from 4 to 2 spaces for consistency across the codebase. by @xizhibei

### ⚙️ Miscellaneous Tasks
- Add .editorconfig for consistent coding styles and update .gitignore to include additional files and directories by @xizhibei

## New Contributors
* @xizhibei made their first contribution in [#1](https://github.com/1mcp-app/agent/pull/1)
* @dependabot[bot] made their first contribution

[0.12.0]: https://github.com/1mcp-app/agent/compare/v0.11.0..v0.12.0
[0.11.0]: https://github.com/1mcp-app/agent/compare/v0.10.3..v0.11.0
[0.10.3]: https://github.com/1mcp-app/agent/compare/v0.10.2..v0.10.3
[0.10.2]: https://github.com/1mcp-app/agent/compare/v0.10.1..v0.10.2
[0.10.1]: https://github.com/1mcp-app/agent/compare/v0.10.0..v0.10.1
[0.10.0]: https://github.com/1mcp-app/agent/compare/v0.9.0..v0.10.0
[0.9.0]: https://github.com/1mcp-app/agent/compare/v0.8.2..v0.9.0
[0.8.2]: https://github.com/1mcp-app/agent/compare/v0.8.1..v0.8.2
[0.8.1]: https://github.com/1mcp-app/agent/compare/v0.8.0..v0.8.1
[0.8.0]: https://github.com/1mcp-app/agent/compare/v0.7.0..v0.8.0
[0.7.0]: https://github.com/1mcp-app/agent/compare/v0.6.0..v0.7.0
[0.6.0]: https://github.com/1mcp-app/agent/compare/v0.5.0..v0.6.0
[0.5.0]: https://github.com/1mcp-app/agent/compare/v0.4.0..v0.5.0
[0.4.0]: https://github.com/1mcp-app/agent/compare/v0.3.0..v0.4.0
[0.3.0]: https://github.com/1mcp-app/agent/compare/v0.2.0..v0.3.0
[0.2.0]: https://github.com/1mcp-app/agent/compare/v0.1.0..v0.2.0

<!-- generated by git-cliff -->
