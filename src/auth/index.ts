import { Hono } from "hono";
import { authApp } from "./handlers/auth";
import { oauthApp } from "./handlers/oauth";

const app = new Hono<{ Bindings: Env }>();

// Mount auth routes
app.route("/", authApp);

// Mount OAuth routes
app.route("/", oauthApp);

export default app; 