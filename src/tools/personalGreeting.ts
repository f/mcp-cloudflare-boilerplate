import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { UserContext } from "../types";

export function registerGreetingTool(server: McpServer, userContext: UserContext) {
  server.tool("greeting", "Get a personalized greeting", {}, async () => {
    return {
      content: [
        {
          type: "text",
          text: `Hello ${userContext.name}! Welcome to your MCP server. Your username is ${userContext.username}.`,
        },
      ],
    };
  });
} 