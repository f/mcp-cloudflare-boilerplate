# MCP Server Boilerplate with OAuth & PostgreSQL

A complete boilerplate for building remote Model Context Protocol (MCP) servers on Cloudflare Workers with custom OAuth authentication and PostgreSQL database integration.

## 🚀 What You Get

This boilerplate provides everything you need to build production-ready MCP servers:

- **🔐 Complete OAuth 2.1 Provider** - Custom OAuth implementation with user registration/login
- **🗄️ PostgreSQL Integration** - Full database schema with user management and OAuth tokens
- **⚡ Cloudflare Workers** - Serverless deployment with global edge distribution
- **🛠️ MCP Tools Framework** - Modular tool system with user context
- **🎨 Beautiful UI** - Responsive login/registration pages
- **🔒 Security First** - JWT tokens, bcrypt hashing, PKCE support
- **📱 Mobile Ready** - Works on desktop, web, and mobile MCP clients
- **🔧 Developer Friendly** - TypeScript, hot reload, comprehensive error handling

### Available MCP Tools

- `add` - Basic math operations
- `userInfo` - Get current user information  
- `personalGreeting` - Personalized user greetings
- `generateImage` - AI image generation (Flux model, authorized users only)
- `getUserStats` - User statistics and analytics

## 📋 Prerequisites

Before you start, ensure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Cloudflare Account** - [Sign up free](https://dash.cloudflare.com/sign-up)
- **PostgreSQL Database** - See [database options](#database-setup-options) below
- **Git** - For cloning the repository

## 🏗️ Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd mcp-cf-boilerplate

# Install dependencies
npm install

# Install Wrangler CLI globally (if not already installed)
npm install -g wrangler
```

### 2. Database Setup Options

Choose one of these PostgreSQL hosting options:

#### Option A: Neon (Recommended - Free Tier)
1. Go to [neon.tech](https://neon.tech) and create account
2. Create a new project
3. Copy the connection string from the dashboard

#### Option B: Supabase (Free Tier)
1. Go to [supabase.com](https://supabase.com) and create account
2. Create a new project
3. Go to Settings → Database and copy the connection string

#### Option C: Railway (Simple Setup)
1. Go to [railway.app](https://railway.app) and create account
2. Create a new PostgreSQL database
3. Copy the connection string from the Connect tab

#### Option D: Local PostgreSQL
```bash
# Using Docker (recommended for local development)
docker run --name mcp-postgres \
  -e POSTGRES_DB=mcpserver \
  -e POSTGRES_USER=mcpuser \
  -e POSTGRES_PASSWORD=mcppassword \
  -p 5432:5432 \
  -d postgres:15

# Connection string will be:
# postgresql://mcpuser:mcppassword@localhost:5432/mcpserver
```

### 3. Configure Environment

```bash
# Copy environment template
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your settings
nano .dev.vars
```

Add your configuration:

```ini
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database"

# Security Keys (IMPORTANT: Generate strong, unique keys)
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
COOKIE_ENCRYPTION_KEY="exactly-32-characters-for-encryption"

# Optional: Image Generation (if using Workers AI)
# ALLOWED_IMAGE_USERS="username1,username2"
```

**🔒 Security Note**: Generate strong secrets:
```bash
# Generate JWT secret (64 characters)
openssl rand -hex 32

# Generate cookie encryption key (32 characters)
openssl rand -hex 16
```

### 4. Cloudflare Setup

```bash
# Login to Cloudflare
wrangler login

# Follow the browser authentication flow
```

### 5. Initialize Database

```bash
# Start development server
npm run dev

# In another terminal, initialize database tables
curl -X POST http://localhost:8787/init-db

# Expected response:
# {"message":"Database initialized successfully"}
```

### 6. Test Your Setup

1. **Open your browser**: Go to `http://localhost:8787`
2. **Register account**: Create a new user account
3. **Test login**: Login with your credentials
4. **Check tools**: Visit `http://localhost:8787/up` to see available tools

## 🚀 Deployment

### Production Deployment

1. **Set production secrets**:
```bash
# Set each secret securely (you'll be prompted to enter values)
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
```

2. **Deploy to Cloudflare**:
```bash
npm run deploy
```

3. **Initialize production database**:
```bash
# Replace with your actual worker URL
curl -X POST https://your-worker.your-subdomain.workers.dev/init-db
```

4. **Update OAuth settings**: Update any OAuth client redirect URIs to use your production URL.

### Custom Domain (Optional)

1. In Cloudflare dashboard, go to Workers & Pages
2. Select your worker
3. Go to Settings → Triggers
4. Add custom domain

## 🔧 Development

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy

# Run tests (if you add them)
npm test
```

### Project Structure

```
mcp-cf-boilerplate/
├── src/
│   ├── auth/                 # Authentication system
│   │   ├── handlers/         # OAuth & auth endpoints
│   │   ├── middleware/       # Session management
│   │   ├── oauth2.ts         # OAuth2 server implementation
│   │   └── views/            # Login/register UI
│   ├── database/             # Database models & queries
│   ├── server/               # MCP server implementation
│   ├── tools/                # MCP tools (modular)
│   ├── types.ts              # TypeScript definitions
│   └── index.ts              # Main entry point
├── wrangler.toml             # Cloudflare Workers config
├── package.json              # Dependencies & scripts
└── README.md                 # This file
```

### Adding New MCP Tools

1. **Create tool file**: `src/tools/myTool.ts`
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { UserContext } from "../types";

export function registerMyTool(server: McpServer, userContext: UserContext, env: Env) {
  server.tool("myTool", "Description of my tool", {
    input: {
      type: "object",
      properties: {
        message: { type: "string", description: "Input message" }
      },
      required: ["message"]
    }
  }, async ({ message }) => {
    return {
      content: [{
        type: "text",
        text: `Hello ${userContext.name}! You said: ${message}`
      }]
    };
  });
}
```

2. **Export from index**: Add to `src/tools/index.ts`
```typescript
export { registerMyTool } from './myTool';
```

3. **Register in main**: Add to `src/index.ts`
```typescript
import { registerMyTool } from "./tools";

backend.registerTool(registerMyTool);
```

## 🔌 Using Your MCP Server

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker.your-subdomain.workers.dev/mcp"
      ]
    }
  }
}
```

### With Cursor

1. Install the MCP extension
2. Add server configuration:
```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "url": "https://your-worker.your-subdomain.workers.dev/mcp",
        "auth": {
          "type": "oauth",
          "authUrl": "https://your-worker.your-subdomain.workers.dev/oauth/authorize",
          "tokenUrl": "https://your-worker.your-subdomain.workers.dev/oauth/token"
        }
      }
    }
  }
}
```

### Programmatic Access

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({
  name: "my-mcp-client",
  version: "1.0.0"
});

const transport = new StreamableHTTPClientTransport(
  new URL("https://your-worker.your-subdomain.workers.dev/mcp"),
  {
    headers: {
      'Authorization': 'Bearer your-oauth-access-token'
    }
  }
);

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log(tools);

// Call a tool
const result = await client.callTool({
  name: "personalGreeting",
  arguments: {}
});
console.log(result);
```

## 🔐 OAuth Client Registration

Register OAuth clients for your applications:

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/oauth/applications \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My MCP Client",
    "redirect_uris": ["https://myapp.com/callback"],
    "client_uri": "https://myapp.com",
    "scope": "read write"
  }'
```

Response:
```json
{
  "client_id": "generated-uuid",
  "client_secret": "generated-secret",
  "client_name": "My MCP Client",
  "redirect_uris": ["https://myapp.com/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "read write read"
}
```

## 🗄️ Database Schema

The boilerplate automatically creates these tables:

### Users
- User accounts with bcrypt password hashing
- Unique usernames and emails
- Profile information (name, email, etc.)

### OAuth Applications  
- Registered OAuth clients
- Client credentials and metadata
- Redirect URI validation

### OAuth Grants
- Authorization codes (10-minute expiry)
- PKCE challenge/verifier support
- Scope management

### OAuth Access Tokens
- Access tokens (1-hour expiry)
- Refresh tokens (30-day expiry)
- Token revocation support

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Test your database connection
psql "postgresql://username:password@host:port/database"

# Common fixes:
# 1. Check DATABASE_URL format
# 2. Verify database exists
# 3. Check firewall/security groups
# 4. Ensure SSL is configured correctly
```

#### OAuth Login Hanging
- **Cause**: Usually database connection or OAuth token generation issues
- **Fix**: Check database connectivity and ensure all secrets are set correctly
- **Debug**: Check Cloudflare Workers logs in the dashboard

#### "Invalid client_id" Errors
```bash
# List registered OAuth clients
curl -X GET https://your-worker.your-subdomain.workers.dev/oauth/applications

# Register a new client if needed
curl -X POST https://your-worker.your-subdomain.workers.dev/oauth/applications \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Test", "redirect_uris": ["http://localhost:3000/callback"]}'
```

#### MCP Connection Issues
- Verify OAuth token is valid
- Check MCP endpoint URL format
- Ensure proper headers are sent
- Test with `/up` endpoint first

### Development Tips

1. **Use local database** for development to avoid connection issues
2. **Check Cloudflare logs** in the dashboard for detailed error messages
3. **Test OAuth flow** manually before integrating with MCP clients
4. **Use strong secrets** - weak secrets can cause authentication failures
5. **Enable debug mode** by setting `debug: true` in OAuth2 server config

### Getting Help

1. **Check logs**: Cloudflare Workers dashboard → Your Worker → Logs
2. **Test endpoints**: Use curl or Postman to test individual endpoints
3. **Database issues**: Use your database provider's logs and monitoring
4. **OAuth debugging**: Enable debug mode in `src/auth/oauth2.ts`

## 🔒 Security Considerations

### Production Checklist

- [ ] Use strong, unique JWT secrets (64+ characters)
- [ ] Use strong, unique cookie encryption keys (32 characters)
- [ ] Enable HTTPS for all redirect URIs
- [ ] Set up database connection pooling
- [ ] Configure proper CORS policies
- [ ] Enable rate limiting (Cloudflare)
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Backup database regularly

### Security Features

- **Password Security**: bcrypt with 12 salt rounds
- **Token Security**: All OAuth tokens are hashed before storage
- **Session Security**: JWT with expiration, secure cookies
- **PKCE Support**: Enhanced OAuth security for public clients
- **Input Validation**: All endpoints validate input data
- **SQL Injection Protection**: Parameterized queries only
- **XSS Protection**: Proper output encoding
- **CSRF Protection**: State parameter validation

## 📚 API Reference

### Authentication Endpoints
- `GET /` - Home page with login/register
- `GET /login` - Login page
- `POST /login` - Login endpoint
- `POST /register` - User registration
- `POST /logout` - Logout endpoint

### OAuth 2.1 Endpoints
- `GET /oauth/authorize` - Authorization endpoint
- `POST /oauth/token` - Token endpoint  
- `POST /oauth/revoke` - Token revocation
- `POST /oauth/introspect` - Token introspection
- `POST /oauth/applications` - Client registration (RFC 7591)
- `GET /oauth/applications` - List registered clients
- `GET /.well-known/oauth-authorization-server` - Server metadata

### MCP Endpoints
- `POST /mcp` - Main MCP endpoint (requires OAuth)
- `POST /sse` - Legacy SSE endpoint (forwards to /mcp)
- `GET /up` - Health check and server info

### Management Endpoints
- `POST /init-db` - Initialize database (run once)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add JSDoc comments for public APIs
- Update README for new features
- Test OAuth flows thoroughly
- Ensure database migrations are safe

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol this server implements
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform
- [Hono](https://hono.dev/) - Web framework for Cloudflare Workers
- [@node-oauth/oauth2-server](https://github.com/node-oauth/node-oauth2-server) - OAuth2 implementation

---

**Need help?** Open an issue on GitHub or check the troubleshooting section above.
