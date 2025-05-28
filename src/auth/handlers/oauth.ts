import OAuth2Server from '@node-oauth/oauth2-server';
import { Hono } from "hono";
import { DatabaseService } from "../../database";
import { createOAuth2Server } from "../oauth2";
import { generateConsentPage } from "../views/consent";
import { getCurrentUser } from "../middleware/session";
import { OAuth2Model } from "../oauth2";
import { sessionMiddleware } from "../middleware/session";

// Helper function to redirect to login with OAuth state
function redirectToLogin(request: Request, oauthReqInfo: any, headers: Record<string, string> = {}) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("state", btoa(JSON.stringify(oauthReqInfo)));
  
  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: loginUrl.href,
    },
  });
}

// Helper function to convert OAuth2Server response to Hono response
function oauth2ToHonoResponse(response: OAuth2Server.Response): Response {
  const headers: Record<string, string> = {};
  
  // Copy headers from OAuth2 response
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      headers[key] = Array.isArray(value) ? value[0] : value;
    }
  }

  return new Response(response.body, {
    status: response.status || 200,
    headers
  });
}

const oauthApp = new Hono<{ Bindings: Env }>();

// Apply session middleware to OAuth routes that need user context
oauthApp.use('/oauth/authorize', sessionMiddleware);
oauthApp.use('/oauth/consent', sessionMiddleware);

// OAuth Authorization endpoint
oauthApp.get("/oauth/authorize", async (c) => {
  const url = new URL(c.req.url);
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const responseType = url.searchParams.get('response_type');
  const scope = url.searchParams.get('scope');
  const state = url.searchParams.get('state');
  const codeChallenge = url.searchParams.get('code_challenge');
  const codeChallengeMethod = url.searchParams.get('code_challenge_method');

  if (!clientId || !redirectUri || responseType !== 'code') {
    return c.text("Invalid request", 400);
  }

  // Look up client in our database
  const db = new DatabaseService(c.env.DATABASE_URL);
  await db.connect();

  try {
    const application = await db.getOAuthApplicationByClientId(clientId);
    if (!application) {
      return c.text("Invalid client_id", 400);
    }

    // Check if redirect URI is valid
    const validRedirectUris = application.redirect_uri.split('\n');
    if (!validRedirectUris.includes(redirectUri)) {
      return c.text("Invalid redirect_uri", 400);
    }

    // Store OAuth request info
    const oauthReqInfo = {
      responseType,
      clientId,
      redirectUri,
      scope: scope ? scope.split(' ') : ['read'],
      state: state || '',
      codeChallenge,
      codeChallengeMethod
    };

    // Check if user is already logged in
    const user = getCurrentUser(c);
    
    if (user) {
      // User is logged in, show consent page
      const consentPageData = {
        application: {
          name: application.name,
          client_uri: application.client_uri,
          logo_uri: application.logo_uri,
          tos_uri: application.tos_uri,
          policy_uri: application.policy_uri
        },
        scopes: oauthReqInfo.scope,
        user: {
          name: user.name,
          username: user.username,
          email: user.email
        },
        oauthState: btoa(JSON.stringify(oauthReqInfo))
      };

      const html = generateConsentPage(consentPageData);
      return c.html(html);
    } else {
      // User not logged in, redirect to login with OAuth info
      return redirectToLogin(c.req.raw, oauthReqInfo);
    }
  } finally {
    await db.disconnect();
  }
});

// OAuth Consent endpoint - handles consent form submission
oauthApp.post("/oauth/consent", async (c) => {
  try {
    const body = await c.req.json();
    const { action, state } = body;

    if (!state) {
      return c.json({ message: "Missing state parameter" }, 400);
    }

    // Decode OAuth request info from state
    let oauthReqInfo;
    try {
      oauthReqInfo = JSON.parse(atob(state));
    } catch (error) {
      return c.json({ message: "Invalid state parameter" }, 400);
    }

    // Get current user
    const user = getCurrentUser(c);
    if (!user) {
      return c.json({ message: "User not authenticated" }, 401);
    }

    if (action === 'deny') {
      // User denied consent, redirect back with error
      const redirectUrl = new URL(oauthReqInfo.redirectUri);
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('error_description', 'The user denied the request');
      if (oauthReqInfo.state) {
        redirectUrl.searchParams.set('state', oauthReqInfo.state);
      }
      
      return c.json({ redirectTo: redirectUrl.href });
    }

    if (action === 'approve') {
      // User approved consent, create authorization code
      const db = new DatabaseService(c.env.DATABASE_URL);
      await db.connect();

      try {
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
            id: user.userId,
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
          id: user.userId,
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
      } finally {
        await db.disconnect();
      }
    }

    return c.json({ message: "Invalid action" }, 400);
  } catch (error) {
    console.error("OAuth consent error:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// OAuth Authorization POST endpoint - handles user consent after login
oauthApp.post("/oauth/authorize", async (c) => {
  try {
    const oauth2Server = createOAuth2Server(c.env.DATABASE_URL);
    
    // Get form data
    const formData = await c.req.formData();
    const body: Record<string, any> = {};
    
    for (const [key, value] of formData.entries()) {
      body[key] = value;
    }

    // Create OAuth2 request object
    const request = new OAuth2Server.Request({
      body: body,
      headers: Object.fromEntries(
        Object.entries(c.req.header()).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v])
      ),
      method: c.req.method,
      query: Object.fromEntries(new URL(c.req.url).searchParams.entries())
    });

    // Create OAuth2 response object
    const response = new OAuth2Server.Response();

    try {
      // Handle authorization request
      const code = await oauth2Server.authorize(request, response, {
        authenticateHandler: {
          handle: async (request: OAuth2Server.Request) => {
            // This should be called after user authentication
            // For now, we'll extract user info from the request
            const userId = request.body.user_id;
            if (!userId) return null;

            const db = new DatabaseService(c.env.DATABASE_URL);
            await db.connect();
            try {
              const user = await db.getUserById(userId);
              return user ? {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name
              } : null;
            } finally {
              await db.disconnect();
            }
          }
        }
      });

      return oauth2ToHonoResponse(response);
    } catch (error) {
      console.error('OAuth authorization error:', error);
      return oauth2ToHonoResponse(response);
    }
  } catch (error) {
    console.error('OAuth authorization endpoint error:', error);
    return c.json({
      error: "server_error",
      error_description: "Internal server error"
    }, 500);
  }
});

// OAuth Client Registration endpoint (RFC 7591)
oauthApp.post("/oauth/applications", async (c) => {
  try {
    const body = await c.req.json();
    const { 
      client_name, 
      redirect_uris, 
      client_uri, 
      logo_uri, 
      tos_uri, 
      policy_uri, 
      contacts,
      scope 
    } = body;

    // Validate required fields according to RFC 7591
    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return c.json({ 
        error: "invalid_client_metadata",
        error_description: "client_name and redirect_uris are required" 
      }, 400);
    }

    // Validate redirect URIs
    for (const uri of redirect_uris) {
      try {
        const url = new URL(uri);
        // Only allow HTTPS URIs (except for localhost in development)
        if (url.protocol !== 'https:' && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
          return c.json({
            error: "invalid_redirect_uri",
            error_description: "Only HTTPS redirect URIs are allowed (except localhost)"
          }, 400);
        }
      } catch {
        return c.json({
          error: "invalid_redirect_uri", 
          error_description: `Invalid redirect URI: ${uri}`
        }, 400);
      }
    }

    const db = new DatabaseService(c.env.DATABASE_URL);
    await db.connect();

    try {
      // Create or update OAuth application in our database
      const application = await db.findOrCreateOAuthApplication(client_name, {
        client_name,
        redirect_uris,
        client_uri,
        logo_uri,
        tos_uri,
        policy_uri,
        contacts,
        scope
      });

      // Return client credentials in RFC 7591 format
      return c.json({
        client_id: application.uid,
        client_secret: application.secret,
        client_name: application.name,
        redirect_uris: application.redirect_uri.split('\n'),
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: application.scopes,
        client_id_issued_at: Math.floor(new Date(application.created_at).getTime() / 1000),
        client_secret_expires_at: 0 // Never expires
      }, 201);

    } finally {
      await db.disconnect();
    }

  } catch (error) {
    console.error("OAuth client registration error:", error);
    return c.json({ 
      error: "server_error",
      error_description: "Internal server error during client registration" 
    }, 500);
  }
});

// List OAuth applications endpoint
oauthApp.get("/oauth/applications", async (c) => {
  try {
    const db = new DatabaseService(c.env.DATABASE_URL);
    await db.connect();

    try {
      const applications = await db.listOAuthApplications();
      
      // Return applications without exposing client secrets
      const safeApplications = applications.map(app => ({
        client_id: app.uid,
        client_name: app.name,
        redirect_uris: app.redirect_uri.split('\n'),
        scopes: app.scopes,
        client_uri: app.client_uri,
        logo_uri: app.logo_uri,
        created_at: app.created_at,
        updated_at: app.updated_at
      }));

      return c.json(safeApplications);
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.error("OAuth applications listing error:", error);
    return c.json({ 
      error: "server_error",
      error_description: "Internal server error while listing applications" 
    }, 500);
  }
});

// OAuth Token endpoint
oauthApp.post("/oauth/token", async (c) => {
  // Create a single database connection for the entire token flow
  const db = new DatabaseService(c.env.DATABASE_URL);
  
  try {
    await db.connect();
    
    // Create OAuth2 server with the shared database connection
    const oauth2Server = createOAuth2Server(c.env.DATABASE_URL, db);
    
    // Get form data
    const formData = await c.req.formData();
    const body: Record<string, any> = {};
    
    for (const [key, value] of formData.entries()) {
      body[key] = value;
    }

    // Create OAuth2 request object
    const request = new OAuth2Server.Request({
      body: body,
      headers: Object.fromEntries(
        Object.entries(c.req.header()).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v])
      ),
      method: c.req.method,
      query: Object.fromEntries(new URL(c.req.url).searchParams.entries())
    });

    // Create OAuth2 response object
    const response = new OAuth2Server.Response();

    try {
      // Handle token request
      const token = await oauth2Server.token(request, response);
      
      // Return token response
      return c.json({
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        token_type: 'Bearer',
        expires_in: token.accessTokenExpiresAt ? Math.floor((token.accessTokenExpiresAt.getTime() - Date.now()) / 1000) : 3600,
        scope: Array.isArray(token.scope) ? token.scope.join(' ') : token.scope
      });
    } catch (error) {
      console.error('OAuth token error:', error);
      
      // Handle OAuth2 errors
      if (error instanceof OAuth2Server.OAuthError) {
        return c.json({
          error: error.name,
          error_description: error.message
        }, 400);
      }
      
      return c.json({
        error: "server_error",
        error_description: "Internal server error"
      }, 500);
    }
  } catch (error) {
    console.error("OAuth token endpoint error:", error);
    return c.json({
      error: "server_error",
      error_description: "Internal server error"
    }, 500);
  } finally {
    // Always close the database connection, even if an error occurs
    try {
      await db.disconnect();
    } catch (disconnectError) {
      console.error("Error disconnecting from database:", disconnectError);
    }
  }
});

// OAuth Token Revocation endpoint (RFC 7009)
oauthApp.post("/oauth/revoke", async (c) => {
  try {
    // Get form data
    const formData = await c.req.formData();
    const body: Record<string, any> = {};
    
    for (const [key, value] of formData.entries()) {
      body[key] = value;
    }

    const token = body.token as string;
    if (!token) {
      return c.json({
        error: "invalid_request",
        error_description: "Missing token parameter"
      }, 400);
    }

    // Use our database service directly for token revocation
    const db = new DatabaseService(c.env.DATABASE_URL);
    await db.connect();
    
    try {
      // Try to find as access token first
      const accessToken = await db.findOAuthAccessTokenByToken(token);
      if (accessToken) {
        await db.revokeOAuthAccessToken(accessToken.id);
        return new Response(null, { status: 200 });
      }

      // Try to find as refresh token
      const refreshToken = await db.findOAuthAccessTokenByRefreshToken(token);
      if (refreshToken) {
        await db.revokeOAuthAccessToken(refreshToken.id);
        return new Response(null, { status: 200 });
      }

      // RFC 7009 specifies that revocation should return 200 even if token was invalid
      return new Response(null, { status: 200 });
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.error("OAuth revocation endpoint error:", error);
    return c.json({
      error: "server_error",
      error_description: "Internal server error"
    }, 500);
  }
});

// OAuth Token Introspection endpoint (RFC 7662)
oauthApp.post("/oauth/introspect", async (c) => {
  try {
    // Get form data
    const formData = await c.req.formData();
    const body: Record<string, any> = {};
    
    for (const [key, value] of formData.entries()) {
      body[key] = value;
    }

    const token = body.token as string;
    if (!token) {
      return c.json({ active: false });
    }

    try {
      // Try to get access token info
      const db = new DatabaseService(c.env.DATABASE_URL);
      await db.connect();
      
      try {
        const accessToken = await db.findOAuthAccessTokenByToken(token);
        if (!accessToken) {
          return c.json({ active: false });
        }

        const application = await db.getOAuthApplicationById(accessToken.application_id);
        const user = await db.getUserById(accessToken.user_id);

        if (!application || !user) {
          return c.json({ active: false });
        }

        return c.json({
          active: true,
          scope: accessToken.scopes,
          client_id: application.uid,
          username: user.username,
          exp: Math.floor(accessToken.expires_at.getTime() / 1000),
          iat: Math.floor(new Date(accessToken.created_at).getTime() / 1000),
          sub: user.id,
          aud: application.uid
        });
      } finally {
        await db.disconnect();
      }
    } catch (error) {
      console.error("Token introspection error:", error);
      return c.json({ active: false });
    }
  } catch (error) {
    console.error("OAuth introspection endpoint error:", error);
    return c.json({
      error: "server_error",
      error_description: "Internal server error"
    }, 500);
  }
});

// OAuth 2.0 Authorization Server Metadata (RFC 8414)
oauthApp.get("/.well-known/oauth-authorization-server", async (c) => {
  const origin = new URL(c.req.url).origin;
  const baseUrl = origin.includes('localhost') ? origin : origin.replace("http://", "https://");
  
  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/applications`,
    revocation_endpoint: `${baseUrl}/oauth/revoke`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token", "none"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    code_challenge_methods_supported: ["plain", "S256"],
  });
});

export { oauthApp };
