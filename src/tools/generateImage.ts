import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { UserContext } from "../types";

const ALLOWED_USERNAMES = new Set<string>([
  // Add usernames of users who should have access to the image generation tool
  // For example: 'yourusername', 'coworkerusername'
]);

export function registerGenerateImageTool(server: McpServer, userContext: UserContext, env: Env) {
  // Only register the tool if the user is authorized
  if (ALLOWED_USERNAMES.has(userContext.username)) {
    server.tool(
      "generateImage",
      "Generate an image using the `flux-1-schnell` model. Works best with 8 steps.",
      {
        prompt: z.string().describe("A text description of the image you want to generate."),
        steps: z
          .number()
          .min(4)
          .max(8)
          .default(4)
          .describe(
            "The number of diffusion steps; higher values can improve quality but take longer. Must be between 4 and 8, inclusive.",
          ),
      },
      async ({ prompt, steps }) => {
        const response = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
          prompt,
          steps,
        });

        return {
          content: [{ type: "image", data: response.image!, mimeType: "image/jpeg" }],
        };
      },
    );
  }
} 