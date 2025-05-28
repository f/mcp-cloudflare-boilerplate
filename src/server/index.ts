import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import AuthHandler from "../auth";
import { sessionMiddleware } from "../auth/middleware/session";
import { generateHomePage } from "../auth/views";
import { createNodeRequest, createNodeResponse, waitForResponse } from "./shim";
import { UserContext } from "../types";
import { getCurrentUser } from "../auth/middleware/session";

// Type definitions for route handlers
type RouteHandler = (c: any) => Promise<Response> | Response;
type AuthRouteHandler = (c: any, userContext: UserContext, env: Env) => Promise<Response> | Response;

// Helper function to create JSON-RPC error responses
function createJsonRpcError(code: number, message: string, id: any = null) {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
    },
    id,
  };
}

/**
 * Creates an MCP server framework with OAuth authentication
 */
export class McpBackend {
  private app: Hono<{ Bindings: Env }>;
  private serverInfo: Implementation;
  private serverOptions: ServerOptions;
  private toolRegistrations: Array<(server: McpServer, userContext: UserContext, env: Env) => void> = [];
  private staticRoutes: Array<{ method: string; path: string; handler: RouteHandler }> = [];
  private authRoutes: Array<{ method: string; path: string; handler: AuthRouteHandler }> = [];

  constructor(serverInfo: Implementation, serverOptions?: ServerOptions) {
    this.serverInfo = serverInfo;
    this.serverOptions = serverOptions || {};
    this.app = new Hono<{ Bindings: Env }>();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Register a tool with the MCP server
   */
  registerTool(registration: (server: McpServer, userContext: UserContext, env: Env) => void) {
    this.toolRegistrations.push(registration);
    return this;
  }

  /**
   * Register a static route (no authentication required)
   */
  route(method: string, path: string, handler: RouteHandler) {
    this.staticRoutes.push({ method: method.toUpperCase(), path, handler });
    this.registerRoute(method, path, handler);
    return this;
  }

  /**
   * Register an authenticated route (requires valid OAuth token)
   */
  authRoute(method: string, path: string, handler: AuthRouteHandler) {
    this.authRoutes.push({ method: method.toUpperCase(), path, handler });
    this.registerAuthRoute(method, path, handler as RouteHandler);
    return this;
  }

  /**
   * Get the configured Hono app
   */
  getApp() {
    return this.app;
  }

  private setupMiddleware() {
    // Add CORS middleware to handle OPTIONS requests
    this.app.use('*', cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Accept', 'Authorization', 'Last-Event-ID'],
      exposeHeaders: ['Content-Type'],
      maxAge: 86400,
    }));

    // Add session middleware
    this.app.use('/', sessionMiddleware);
  }

  private setupRoutes() {
    // Mount auth routes
    this.app.route("/", AuthHandler);

    // MCP endpoint - add session middleware for authentication
    this.app.use('/mcp', sessionMiddleware);
    this.app.all('/mcp', this.handleMcpRequest.bind(this));

    // Backward compatibility endpoints
    this.setupLegacyRoutes();

    // Health check endpoint
    this.app.get('/up', this.handleHealthCheck.bind(this));

    // Home page endpoint
    this.app.get('/', this.handleHomePage.bind(this));

    // Register any custom routes that were added before setup
    this.setupCustomRoutes();
  }

  private setupCustomRoutes() {
    // Register static routes
    this.staticRoutes.forEach(route => {
      this.registerRoute(route.method, route.path, route.handler);
    });

    // Register auth routes
    this.authRoutes.forEach(route => {
      this.registerAuthRoute(route.method, route.path, route.handler);
    });
  }

  private registerRoute(method: string, path: string, handler: RouteHandler) {
    const normalizedMethod = method.toLowerCase();
    switch (normalizedMethod) {
      case 'get':
        this.app.get(path, handler);
        break;
      case 'post':
        this.app.post(path, handler);
        break;
      case 'put':
        this.app.put(path, handler);
        break;
      case 'delete':
        this.app.delete(path, handler);
        break;
      case 'patch':
        this.app.patch(path, handler);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  private registerAuthRoute(method: string, path: string, handler: AuthRouteHandler) {
    // Add session middleware for this route
    this.app.use(path, sessionMiddleware);
    this.registerRoute(method, path, (c) => {
      const user = getCurrentUser(c);
      if (!user) {
        return c.json(createJsonRpcError(-32000, 'Unauthorized: Missing or invalid access token'), 401);
      }
      return handler(c, user, c.env);
    });
  }

  private setupLegacyRoutes() {
    // Forward /sse to /mcp for backward compatibility
    const forwardToMcp = async (c: any) => {
      const url = new URL(c.req.url);
      url.pathname = '/mcp';
      
      const newRequest = new Request(url.toString(), {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: c.req.method !== 'GET' ? c.req.raw.body : undefined,
      });
      
      return this.app.fetch(newRequest, c.env, c.executionCtx);
    };

    this.app.post('/sse', forwardToMcp);
  }

  private createMcpServer(userContext: UserContext, env: Env): McpServer {
    const server = new McpServer(this.serverInfo as any, this.serverOptions);

    // Register all tools
    this.toolRegistrations.forEach(registration => {
      registration(server, userContext, env);
    });

    return server;
  }

  private async handleMcpRequest(c: any) {
    try {
      // Get current user from session middleware
      const userContext = getCurrentUser(c);
      if (!userContext) {
        return c.json(createJsonRpcError(-32000, 'Unauthorized: Missing or invalid access token'), 401);
      }

      if (['GET', 'DELETE'].includes(c.req.method)) {
        return c.json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed."
          },
          id: null
        }, 405);
      }

      // Get request body
      const requestBody = await c.req.json();

      // Create a new transport for each request
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined
      });

      // Create MCP server with user context
      const server = this.createMcpServer(userContext, c.env);

      // Connect to the MCP server
      await server.connect(transport);

      // Create Node.js-style request and response objects using shims
      const req = createNodeRequest(c, requestBody);
      const { response: res, responsePromise } = createNodeResponse();

      // Handle the request with proper objects
      await transport.handleRequest(req as any, res as any, requestBody);

      // Wait for the actual response (with timeout)
      try {
        const response = await waitForResponse(responsePromise);

        // Return the actual response from transport
        if (response.data) {
          try {
            const parsedResponse = JSON.parse(response.data);
            return c.json(parsedResponse, response.status as any, response.headers);
          } catch {
            return c.text(response.data, response.status as any, response.headers);
          }
        }

        // If no response data but transport ended the response, return empty response
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        });

      } catch (error) {
        console.error('Response timeout or error:', error);
        return c.json(createJsonRpcError(-32603, 'Internal server error'), 500);
      }

    } catch (error) {
      console.error('MCP endpoint error:', error);
      return c.json(createJsonRpcError(-32603, 'Internal server error'), 500);
    }
  }

  private handleHealthCheck(c: any) {
    return c.json({
      message: this.serverInfo.name + ' (v' + this.serverInfo.version + ') is running',
      endpoints: {
        mcp: '/mcp',
        oauth_authorize: '/oauth/authorize',
        oauth_token: '/oauth/token',
        oauth_metadata: '/.well-known/oauth-authorization-server'
      },
      tools: this.toolRegistrations.length
    });
  }

  private handleHomePage(c: any) {
    const user = getCurrentUser(c);
    
    const html = generateHomePage({
      serverName: this.serverInfo.name,
      serverVersion: this.serverInfo.version,
      registeredTools: this.toolRegistrations.length,
      showMcpInfo: true
    }, user);

    return c.html(html);
  }
} 