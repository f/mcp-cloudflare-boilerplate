import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { UserContext } from "../types";

export function registerMeTool(server: McpServer, userContext: UserContext) {
  server.tool("me", "Get current user information", {}, async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            userId: userContext.userId,
            username: userContext.username,
            email: userContext.email,
            name: userContext.name,
          }),
        },
      ],
    };
  });
} 