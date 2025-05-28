import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { CreateUserData, DatabaseService, LoginData } from "../../database";
import { OAuth2Model } from "../oauth2";
import { loginPageHTML, registerPageHTML } from "../views";
import { getCurrentUser } from "../middleware/session";

const authApp = new Hono<{ Bindings: Env }>();

// Helper function to create session token
async function createSessionToken(user: any, jwtSecret: string): Promise<string> {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  };
  
  return await sign(payload, jwtSecret);
}

// Login page
authApp.get("/login", async (c) => {
  return c.html(loginPageHTML);
});

// Register page
authApp.get("/register", async (c) => {
  return c.html(registerPageHTML);
});

// Login endpoint
authApp.post("/login", async (c) => {
  try {
    const body = await c.req.json() as LoginData & { state?: string };
    const { username, password, state } = body;

    if (!username || !password) {
      return c.json({ message: "Username and password are required" }, 400);
    }

    const db = new DatabaseService(c.env.DATABASE_URL);
    await db.connect();

    try {
      // Get user
      const user = await db.getUserByUsername(username);
      if (!user) {
        return c.json({ message: "Invalid username or password" }, 401);
      }

      // Verify password
      const isValidPassword = await db.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return c.json({ message: "Invalid username or password" }, 401);
      }

      // Handle OAuth flow if state is provided
      if (state) {
        let oauthReqInfo;
        try {
          oauthReqInfo = JSON.parse(atob(state)) as any;
        } catch (error) {
          return c.json({ message: "Invalid state parameter" }, 400);
        }

        if (!oauthReqInfo.clientId) {
          return c.json({ message: "Invalid state - missing client ID" }, 400);
        }

        // Verify client exists
        const application = await db.getOAuthApplicationByClientId(oauthReqInfo.clientId);
        if (!application) {
          return c.json({ message: "Invalid client" }, 400);
        }

        // Create OAuth2 model instance
        const oauth2Model = new OAuth2Model(c.env.DATABASE_URL);
        
        // Create authorization code using OAuth2 model
        const authCode = oauth2Model.generateAuthorizationCode(
          { id: oauthReqInfo.clientId },
          { 
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name
          },
          oauthReqInfo.scope || ['read']
        );

        // Use OAuth2 model to save the authorization code properly
        const codeData = {
          authorizationCode: authCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          redirectUri: oauthReqInfo.redirectUri,
          scope: Array.isArray(oauthReqInfo.scope) ? oauthReqInfo.scope : (oauthReqInfo.scope ? [oauthReqInfo.scope] : ['read']),
          codeChallenge: oauthReqInfo.codeChallenge,
          codeChallengeMethod: oauthReqInfo.codeChallengeMethod
        };

        const clientData = {
          id: oauthReqInfo.clientId,
          redirectUris: application.redirect_uri.split('\n'),
          grants: ['authorization_code', 'refresh_token'],
          scope: application.scopes
        };

        const userData = {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name
        };

        // Save authorization code using OAuth2 model
        await oauth2Model.saveAuthorizationCode(codeData, clientData, userData);

        // Build redirect URL with authorization code
        const redirectUrl = new URL(oauthReqInfo.redirectUri);
        redirectUrl.searchParams.set('code', authCode);
        if (oauthReqInfo.state) {
          redirectUrl.searchParams.set('state', oauthReqInfo.state);
        }

        return c.json({ redirectTo: redirectUrl.href });
      } else {
        // Direct login without OAuth - create session and set cookie
        try {
          // Create session token
          const sessionToken = await createSessionToken(user, c.env.JWT_SECRET);
          
          // Set secure session cookie
          setCookie(c, 'session', sessionToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/'
          });

          return c.json({ 
            redirectTo: "/", // Redirect to home page
            message: "Login successful",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              name: user.name
            }
          });
        } catch (error) {
          console.error("Session token creation error:", error);
          return c.json({ message: "Failed to create session" }, 500);
        }
      }
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Register endpoint
authApp.post("/register", async (c) => {
  try {
    const body = await c.req.json() as CreateUserData;
    const { username, email, name, password } = body;

    if (!username || !email || !name || !password) {
      return c.json({ message: "All fields are required" }, 400);
    }

    if (password.length < 6) {
      return c.json({ message: "Password must be at least 6 characters long" }, 400);
    }

    const db = new DatabaseService(c.env.DATABASE_URL);
    await db.connect();

    try {
      // Check if user already exists
      const existingUserByUsername = await db.getUserByUsername(username);
      if (existingUserByUsername) {
        return c.json({ message: "Username already exists" }, 400);
      }

      const existingUserByEmail = await db.getUserByEmail(email);
      if (existingUserByEmail) {
        return c.json({ message: "Email already exists" }, 400);
      }

      // Create user
      await db.createUser({ username, email, name, password });
      
      return c.json({ message: "User created successfully" });
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.error("Registration error:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Initialize database endpoint (for setup)
authApp.post("/init-db", async (c) => {
  try {
    const db = new DatabaseService(c.env.DATABASE_URL);
    await db.connect();
    
    try {
      await db.initializeDatabase();
      return c.json({ message: "Database initialized successfully" });
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    return c.json({ message: "Failed to initialize database" }, 500);
  }
});

// Logout endpoint
authApp.post("/logout", async (c) => {
  try {
    // Clear session cookie
    deleteCookie(c, 'session', {
      path: '/'
    });
    
    return c.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ message: "Logout failed" }, 500);
  }
});

export { authApp };
