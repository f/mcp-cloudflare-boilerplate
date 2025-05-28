import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { Context, Next } from "hono";
import { createOAuth2Server } from "../oauth2";
import OAuth2Server from '@node-oauth/oauth2-server';

export interface SessionUser {
  userId: string;
  username: string;
  email: string;
  name: string;
}

// Helper function to authenticate OAuth token
async function authenticateOAuthToken(token: string, databaseUrl: string): Promise<SessionUser | null> {
  try {
    // Create OAuth2 server instance
    const oauth2Server = createOAuth2Server(databaseUrl);
    
    // Create a mock request for token authentication
    const oauthRequest = new OAuth2Server.Request({
      body: {},
      headers: { authorization: `Bearer ${token}` },
      method: 'GET',
      query: {}
    });

    // Create OAuth2 response object
    const response = new OAuth2Server.Response();

    try {
      // Authenticate the token using OAuth2 server
      const tokenInfo = await oauth2Server.authenticate(oauthRequest, response);
      
      if (!tokenInfo) {
        return null;
      }

      return {
        userId: tokenInfo.user.id,
        username: tokenInfo.user.username,
        email: tokenInfo.user.email,
        name: tokenInfo.user.name,
      };
    } catch (error) {
      console.error('OAuth authentication error:', error);
      return null;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Middleware to verify session and add user to context
export async function sessionMiddleware(c: Context, next: Next) {
  try {
    // First, check for Bearer token in Authorization header (for MCP clients)
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authenticateOAuthToken(token, c.env.DATABASE_URL);
      
      if (user) {
        c.set('user', user);
        await next();
        return;
      }
    }

    // Fallback to session cookie authentication (for web browsers)
    const sessionCookie = getCookie(c, 'session');
    
    if (!sessionCookie) {
      // No session cookie - continue without user
      await next();
      return;
    }

    // Verify JWT token
    const payload = await verify(sessionCookie, c.env.JWT_SECRET);
    
    if (!payload || typeof payload !== 'object') {
      // Invalid token - continue without user
      await next();
      return;
    }

    // Add user to context
    c.set('user', {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      name: payload.name
    } as SessionUser);

  } catch (error) {
    console.error('Session verification error:', error);
    // Continue without user on error
  }
  
  await next();
}

// Helper function to get current user from context
export function getCurrentUser(c: Context): SessionUser | null {
  return c.get('user') || null;
}

// Helper function to require authentication
export function requireAuth(c: Context): SessionUser {
  const user = getCurrentUser(c);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
} 