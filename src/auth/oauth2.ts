import OAuth2Server from '@node-oauth/oauth2-server';
import crypto from 'crypto';
import { DatabaseService } from '../database';

// OAuth2 Server Model implementation
export class OAuth2Model {
  private databaseUrl: string;

  constructor(databaseUrl: string) {
    this.databaseUrl = databaseUrl;
  }

  // Helper method to create a fresh database connection
  private async withDatabase<T>(callback: (db: DatabaseService) => Promise<T>): Promise<T> {
    const db = new DatabaseService(this.databaseUrl);
    await db.connect();
    try {
      return await callback(db);
    } finally {
      await db.disconnect();
    }
  }

  // Get access token
  async getAccessToken(accessToken: string): Promise<any> {
    return this.withDatabase(async (db) => {
      const token = await db.findOAuthAccessTokenByToken(accessToken);
      if (!token) return null;

      const application = await db.getOAuthApplicationById(token.application_id);
      const user = await db.getUserById(token.user_id);

      if (!application || !user) return null;

      return {
        accessToken: accessToken,
        accessTokenExpiresAt: token.expires_at,
        scope: token.scopes.split(' '),
        client: {
          id: application.uid,
          grants: ['authorization_code', 'refresh_token']
        },
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name
        }
      };
    });
  }

  // Get refresh token
  async getRefreshToken(refreshToken: string): Promise<any> {
    return this.withDatabase(async (db) => {
      const token = await db.findOAuthAccessTokenByRefreshToken(refreshToken);
      if (!token) return null;

      const application = await db.getOAuthApplicationById(token.application_id);
      const user = await db.getUserById(token.user_id);

      if (!application || !user) return null;

      return {
        refreshToken: refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        scope: token.scopes.split(' '),
        client: {
          id: application.uid,
          grants: ['authorization_code', 'refresh_token']
        },
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name
        }
      };
    });
  }

  // Get authorization code
  async getAuthorizationCode(authorizationCode: string): Promise<any> {
    return this.withDatabase(async (db) => {
      // Validate input
      if (!authorizationCode || typeof authorizationCode !== 'string') {
        console.error('Invalid authorizationCode provided to getAuthorizationCode:', authorizationCode);
        return null;
      }

      const grant = await db.findOAuthAccessGrantByToken(authorizationCode);
      if (!grant || grant.token_type !== 'authorization_code') return null;

      const application = await db.getOAuthApplicationById(grant.application_id);
      const user = await db.getUserById(grant.user_id);

      if (!application || !user) return null;

      return {
        code: authorizationCode,
        expiresAt: grant.expires_at,
        redirectUri: grant.redirect_uri,
        scope: grant.scopes.split(' '),
        client: {
          id: application.uid,
          grants: ['authorization_code', 'refresh_token']
        },
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name
        },
        codeChallenge: grant.code_challenge,
        codeChallengeMethod: grant.code_challenge_method
      };
    });
  }

  // Get client
  async getClient(clientId: string, clientSecret?: string): Promise<any> {
    return this.withDatabase(async (db) => {
      const application = await db.getOAuthApplicationByClientId(clientId);
      if (!application) return null;

      // If client secret is provided, verify it
      if (clientSecret && application.secret !== clientSecret) {
        return null;
      }

      return {
        id: application.uid,
        redirectUris: application.redirect_uri.split('\n'),
        grants: ['authorization_code', 'refresh_token'],
        scope: application.scopes
      };
    });
  }

  // Save token
  async saveToken(token: any, client: any, user: any): Promise<any> {
    return this.withDatabase(async (db) => {
      const application = await db.getOAuthApplicationByClientId(client.id);
      if (!application) throw new Error('Invalid client');

      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

      await db.createOAuthAccessToken({
        applicationId: application.id,
        userId: user.id,
        token: token.accessToken,
        refreshToken: token.refreshToken,
        scopes: Array.isArray(token.scope) ? token.scope.join(' ') : token.scope || 'read',
        expiresAt
      });

      return {
        accessToken: token.accessToken,
        accessTokenExpiresAt: expiresAt,
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        scope: token.scope,
        client: client,
        user: user
      };
    });
  }

  // Save authorization code
  async saveAuthorizationCode(code: any, client: any, user: any): Promise<any> {
    return this.withDatabase(async (db) => {
      const application = await db.getOAuthApplicationByClientId(client.id);
      if (!application) throw new Error('Invalid client');

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.createOAuthGrant({
        applicationId: application.id,
        userId: user.id,
        token: code.authorizationCode,
        tokenType: 'authorization_code',
        redirectUri: code.redirectUri,
        scopes: Array.isArray(code.scope) ? code.scope.join(' ') : code.scope || 'read',
        codeChallenge: code.codeChallenge,
        codeChallengeMethod: code.codeChallengeMethod,
        expiresAt
      });

      return {
        authorizationCode: code.authorizationCode,
        expiresAt: expiresAt,
        redirectUri: code.redirectUri,
        scope: code.scope,
        client: client,
        user: user,
        codeChallenge: code.codeChallenge,
        codeChallengeMethod: code.codeChallengeMethod
      };
    });
  }

  // Revoke authorization code
  async revokeAuthorizationCode(code: any): Promise<boolean> {
    return this.withDatabase(async (db) => {
      // Handle different possible code formats
      let authCode: string;
      
      if (typeof code === 'string') {
        authCode = code;
      } else if (code && code.authorizationCode) {
        authCode = code.authorizationCode;
      } else if (code && code.code) {
        authCode = code.code;
      } else {
        console.error('Invalid code parameter in revokeAuthorizationCode:', code);
        return false;
      }

      if (!authCode || typeof authCode !== 'string') {
        console.error('Invalid authorization code in revokeAuthorizationCode:', authCode);
        return false;
      }

      const grant = await db.findOAuthAccessGrantByToken(authCode);
      if (!grant) return false;

      return await db.revokeOAuthGrant(grant.id);
    });
  }

  // Revoke token
  async revokeToken(token: any): Promise<boolean> {
    return this.withDatabase(async (db) => {
      const accessToken = await db.findOAuthAccessTokenByRefreshToken(token.refreshToken);
      if (!accessToken) return false;

      return await db.revokeOAuthAccessToken(accessToken.id);
    });
  }

  // Verify scope
  verifyScope(token: any, scope: string): boolean {
    if (!token.scope) return false;
    const tokenScopes = Array.isArray(token.scope) ? token.scope : token.scope.split(' ');
    return tokenScopes.includes(scope);
  }

  // Generate access token
  generateAccessToken(client: any, user: any, scope: any): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate refresh token
  generateRefreshToken(client: any, user: any, scope: any): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate authorization code
  generateAuthorizationCode(client: any, user: any, scope: any): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Create OAuth2 server instance
export function createOAuth2Server(databaseUrl: string): OAuth2Server {
  const model = new OAuth2Model(databaseUrl);
  
  return new OAuth2Server({
    model: model as any,
    debug: true,
    accessTokenLifetime: 3600, // 1 hour
    refreshTokenLifetime: 30 * 24 * 60 * 60, // 30 days
    authorizationCodeLifetime: 600, // 10 minutes
    allowBearerTokensInQueryString: true,
    allowEmptyState: true,
    requireClientAuthentication: {
      authorization_code: true,
      refresh_token: true
    }
  } as any);
} 