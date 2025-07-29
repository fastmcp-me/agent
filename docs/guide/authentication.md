# Authentication

The 1MCP Agent uses a dynamic, SDK-based approach to OAuth 2.1 authentication. Instead of a static configuration file, the agent provides a set of command-line flags and environment variables to configure authentication, and an interactive dashboard to manage the authorization flow with backend services.

## Enabling Authentication

To enable authentication, start the agent with the `--enable-auth` flag:

```bash
npx -y @1mcp/agent --config mcp.json --enable-auth
```

This will activate the OAuth 2.1 endpoints and require authentication for all incoming requests.

## OAuth Management Dashboard

Once authentication is enabled, you can use the OAuth Management Dashboard to manage the authorization flow with your backend services. The dashboard is available at the `/oauth` endpoint of your agent's URL (e.g., `http://localhost:3050/oauth`).

The dashboard allows you to:

- View the connection status of all your backend services.
- Initiate the OAuth flow for services that require authorization.
- Approve or deny authorization requests.

## Tag-Based Scope Validation

The agent supports tag-based scope validation, which allows you to control access to backend services based on their tags. When a client requests an access token, it can specify a set of tags as scopes. The agent will then only allow the client to access services that have all the requested tags.

To enable tag-based scope validation, use the `--enable-scope-validation` flag:

```bash
npx -y @1mcp/agent --config mcp.json --enable-auth --enable-scope-validation
```

## Configuration

For a complete list of authentication-related configuration options, see the [Configuration documentation](/guide/configuration).
