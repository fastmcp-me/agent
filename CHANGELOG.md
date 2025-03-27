# Changelog

All notable changes to this project will be documented in this file.

## [0.7.0] - 2025-03-27

### ⚙️ Miscellaneous Tasks

- *(workflow)* Create temporary branch for changelog and version updates before pushing to main

## [0.6.0] - 2025-03-26

### ⚙️ Miscellaneous Tasks

- *(workflow)* Update release workflows to trigger on version tags and successful completion of publish job

## [0.5.0] - 2025-03-26

### 🚀 Features

- *(capabilities)* Enhance client capability management by adding filtering functions and updating request handlers to utilize capabilities, improving client interaction and resource management
- *(clientManager)* Refactor operation execution with retry logic and introduce comprehensive tests for client operations, enhancing error handling and reliability
- *(tests)* Add comprehensive tests for clientManager and introduce utility functions for client filtering, enhancing test coverage and maintainability
- *(logger)* Enhance logging setup by adding SSEServerTransport support and configuring console transport for visibility, improving logging flexibility based on server type
- *(constants)* Dynamically set MCP_SERVER_VERSION from package.json, improving version management and consistency

### 🚜 Refactor

- *(logger)* Remove log directory creation logic from logger setup, simplifying initialization process

### ⚙️ Miscellaneous Tasks

- *(package)* Add keywords for better discoverability and update homepage URL to GitHub repository
- *(package)* Add author and bugs section to package.json for improved metadata and issue tracking
- *(workflow)* Automate version updates in package.json
- *(inspector)* Update inspector command in package.json for simplified usage and adjust README instructions accordingly
- Add git-cliff configuration and automate changelog generation in workflows
- *(workflow)* Automate version updates for MCP_SERVER_VERSION and package.json in changelog process

## [0.4.0] - 2025-03-23

### ⚙️ Miscellaneous Tasks

- *(version)* Update package and server version to 0.4.0 for consistency across project

## [0.3.0] - 2025-03-23

### 🚀 Features

- *(tags)* Add support for client filtering by tags in transport connections, enhancing server-client interaction and flexibility
- *(eslint)* Add ESLint configuration and integrate TypeScript support, enhancing code quality and consistency across the project
- *(ci)* Add lint step
- *(issue-template)* Add bug report issue template to streamline bug reporting process and improve user feedback collection
- *(tests)* Add Jest configuration and initial tests for ConfigManager, enhancing test coverage and ensuring proper functionality of configuration management
- *(tests)* Implement comprehensive Jest tests for ServerManager, covering transport connection, disconnection, and management methods to ensure robust functionality and error handling
- *(server)* Add HOST configuration for ExpressServer, allowing customizable host settings for SSE transport

### 🚜 Refactor

- *(clients)* Update client management to use structured types for clients and transports, enhancing type safety and maintainability across the application
- *(clients)* Enhance client management with improved error handling and structured types, ensuring better resilience and maintainability in client operations
- *(types)* Consolidate transport-related types and schemas into a single file, improving organization and type safety across the application
- *(config)* Update configManager export and improve import structure in configReloadService for better clarity and maintainability
- *(server)* Streamline transport handling in ServerManager and related components, enhancing type safety and maintainability by replacing ClientTransports with a more generic EnhancedTransport interface
- *(logger)* Remove redundant file transport configurations from logger setup, simplifying logging structure and improving maintainability

### 📚 Documentation

- *(README)* Update transport options and add tags section for server filtering, enhancing configuration clarity and usage examples

## [0.2.0] - 2025-03-19

### 🚀 Features

- *(config)* Enhance configuration reload logic with improved transport handling
- *(mcpTransport)* Enhance connection handling and logging in MCPTransport class
- *(server)* Refactor server setup and introduce ServerManager for improved transport handling and logging
- *(logging)* Add request/response logging middleware and enhance server with logging capabilities
- *(constants)* Add MCP server capabilities constant and refactor server setup to utilize it
- *(config)* Enhance ConfigManager to accept custom config file path and update server setup to utilize it
- *(server)* Refactor server initialization by introducing ExpressServer class for improved structure and maintainability
- *(client)* Refactor client creation to utilize constants for server name and version, enhancing maintainability and consistency across the application
- *(config)* Add Zod schema for transport configuration validation, improving error handling and flexibility in transport creation
- *(config)* Implement global configuration management with dynamic path resolution and default config creation
- *(config)* Extend transport configuration to support 'http' type, enhancing transport options for improved flexibility

### 🚜 Refactor

- *(logger)* Remove defaultMeta from logger and update loggerName in MCP transport to '1mcp'
- *(logger)* Restructure logger imports to use dedicated logger directory and enhance logging capabilities across the application
- *(config)* Update transport configuration types from MCPTransport to MCPServerParams, enhancing flexibility for transport creation and error handling
- *(logging)* Enhance logging middleware with Zod schemas for request and notification validation, improving type safety and error handling

### 📚 Documentation

- *(README)* Update quick start guide and configuration details, enhancing clarity on server setup and usage instructions

### ⚙️ Miscellaneous Tasks

- *(release)* Bump version to 0.2.0 and update README for enhanced transport options and configuration management

## [0.1.0] - 2025-03-16

### 🚀 Features

- *(constants)* Add application constants for server configuration and error handling
- *(logging)* Integrate MCP transport for enhanced logging and connection status management. Added winston-transport dependency, updated logger to handle MCP connections, and implemented log level adjustments based on client connections.
- *(server)* Refactor server initialization and transport handling. Introduced modular client and transport management, added capability registration, and improved notification handling. Enhanced connection retry logic with configurable settings.
- *(error-handling)* Introduce custom error types and centralized error handling utilities. Added new error codes to constants, implemented error handling in client operations and notification handlers, and enhanced request handlers with partial failure notifications.
- *(config)* Implement dynamic configuration reload service and configuration manager. Added graceful shutdown handling, integrated configuration watching, and improved transport management during configuration changes.
- *(logging)* Enhance logger configuration with custom formatting and improved file transport paths. Updated logger to use a custom format for console and file outputs, ensuring better log readability and structured output. Prevent logger from exiting on error to maintain stability.
- *(package)* Rename project to 1MCP and update description for clarity. Changed package name and bin entry to reflect the new branding, and enhanced the project description to emphasize its unified MCP server capabilities.
- *(dependencies)* Add yargs and related types for command line argument parsing. Updated package.json and pnpm-lock.yaml to include yargs and its type definitions, enhancing the server's command line interface capabilities. Updated README with usage instructions for new transport options.
- *(setup)* Add .node-version file and GitHub Actions workflow for package publishing. Introduced a version file for Node.js setup and created a CI workflow to automate package publishing to npm and GitHub Package Registry upon release events. Updated package.json to include repository information and publish configuration.
- *(dependencies)* Integrate husky and lint-staged for improved pre-commit checks.
- *(github)* Create dependabot.yml

### 🐛 Bug Fixes

- *(mcpTransport)* Ensure callback is invoked when not connected to maintain log integrity. This change prevents potential log loss by calling the callback function when the transport is not connected.

### 💼 Other

- *(server.ts)* Enhance transport handling and connection logic. Introduced dynamic transport loading from mcp.json, improved retry logic with exponential backoff for client connections, and updated logging to include JSON stringification of notifications.

### 🚜 Refactor

- *(server.ts)* Improve client connection logic with enhanced error handling and exponential backoff. Updated logging for connection attempts and added error handling for client creation failures.

### 📚 Documentation

- *(README)* Update project overview and features, enhance server configuration details, and switch to pnpm for dependency management

### 🎨 Styling

- *(prettier)* Update tab width from 4 to 2 spaces for consistency across the codebase.

### ⚙️ Miscellaneous Tasks

- Add .editorconfig for consistent coding styles and update .gitignore to include additional files and directories

<!-- generated by git-cliff -->
