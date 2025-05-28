import { McpBackend } from "./server";
import {
  registerMeTool,
  registerGreetingTool,
  registerAddTool,
  registerGenerateImageTool,
} from "./tools";

// Create the MCP server framework
const backend = new McpBackend({
  name: "Custom OAuth MCP Server",
  version: "1.0.0"
});

// Register all tools
backend
  .registerTool(registerMeTool)
  .registerTool(registerGreetingTool)
  .registerTool(registerAddTool)
  .registerTool(registerGenerateImageTool);

// Register custom static routes (no authentication required)
backend
  .route('GET', '/api/ping', (c) => {
    return c.json({ message: 'pong', timestamp: new Date().toISOString() });
  })
  .route('POST', '/api/echo', async (c) => {
    const body = await c.req.json();
    return c.json({ echo: body, timestamp: new Date().toISOString() });
  });

// Register custom authenticated routes (OAuth token required)
backend
  .authRoute('GET', '/api/profile', (c, userContext, env) => {
    return c.json({
      message: 'User profile data',
      user: userContext,
      timestamp: new Date().toISOString()
    });
  })
  .authRoute('GET', '/profile', (c, userContext, env) => {
    return c.html('Hello, ' + userContext.name);
  })
  .authRoute('POST', '/api/user/settings', async (c, userContext, env) => {
    const settings = await c.req.json();
    return c.json({
      message: 'Settings updated successfully',
      userId: userContext.userId,
      settings,
      timestamp: new Date().toISOString()
    });
  });

// Export the configured app
export default backend.getApp();
