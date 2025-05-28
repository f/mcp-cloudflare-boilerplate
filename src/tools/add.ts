import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAddTool(server: McpServer) {
  server.tool(
    "add", 
    "Add two numbers the way only MCP can", 
    { 
      a: z.number(), 
      b: z.number() 
    }, 
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }],
    })
  );
} 