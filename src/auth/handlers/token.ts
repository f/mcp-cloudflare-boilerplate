import { DatabaseService } from "../../database";
import crypto from 'crypto';

export class OAuthTokenHandler {
  private db: DatabaseService;

  constructor(databaseUrl: string) {
    this.db = new DatabaseService(databaseUrl);
  }

  // Generate a secure random token
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create authorization code
  async createAuthorizationCode(data: {
    clientId: string;
    userId: string;
    redirectUri: string;
    scopes: string[];
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): Promise<string> {
    await this.db.connect();
    
    try {
      // Get application by client_id
      const application = await this.db.getOAuthApplicationByClientId(data.clientId);
      if (!application) {
        throw new Error('Invalid client_id');
      }

      const authCode = this.generateToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.db.createOAuthGrant({
        applicationId: application.id,
        userId: data.userId,
        token: authCode,
        tokenType: 'authorization_code',
        redirectUri: data.redirectUri,
        scopes: data.scopes.join(' '),
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod,
        expiresAt
      });

      return authCode;
    } finally {
      await this.db.disconnect();
    }
  }

  // Exchange authorization code for access token
  async exchangeAuthorizationCode(data: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  }> {
    await this.db.connect();
    
    try {
      // Verify client credentials
      const application = await this.db.getOAuthApplicationByClientId(data.clientId);
      if (!application || application.secret !== data.clientSecret) {
        throw new Error('Invalid client credentials');
      }

      // Find and verify authorization code
      const grant = await this.db.findOAuthAccessGrantByToken(data.code);
      
      if (!grant) {
        throw new Error('Invalid authorization code');
      }
      
      if (grant.application_id !== application.id) {
        throw new Error('Invalid authorization code');
      }
      
      if (grant.redirect_uri !== data.redirectUri) {
        throw new Error('Invalid authorization code');
      }

      // Verify PKCE if present
      if (grant.code_challenge && grant.code_challenge_method) {
        if (!data.codeVerifier) {
          throw new Error('Code verifier required');
        }
        
        let challenge = data.codeVerifier;
        if (grant.code_challenge_method === 'S256') {
          challenge = crypto.createHash('sha256').update(data.codeVerifier).digest('base64url');
        }
        
        if (challenge !== grant.code_challenge) {
          throw new Error('Invalid code verifier');
        }
      }

      // Generate tokens
      const accessToken = this.generateToken();
      const refreshToken = this.generateToken();
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

      // Create access token record
      await this.db.createOAuthAccessToken({
        applicationId: application.id,
        userId: grant.user_id,
        grantId: grant.id,
        token: accessToken,
        refreshToken: refreshToken,
        scopes: grant.scopes,
        expiresAt
      });

      // Revoke the authorization code (one-time use)
      await this.db.revokeOAuthGrant(grant.id);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: grant.scopes
      };
    } finally {
      await this.db.disconnect();
    }
  }

  // Refresh access token
  async refreshAccessToken(data: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  }> {
    await this.db.connect();
    
    try {
      // Verify client credentials
      const application = await this.db.getOAuthApplicationByClientId(data.clientId);
      if (!application || application.secret !== data.clientSecret) {
        throw new Error('Invalid client credentials');
      }

      // Find access token by refresh token
      const accessToken = await this.db.findOAuthAccessTokenByRefreshToken(data.refreshToken);
      if (!accessToken || accessToken.application_id !== application.id) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = this.generateToken();
      const newRefreshToken = this.generateToken();
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

      // Revoke old access token
      await this.db.revokeOAuthAccessToken(accessToken.id);

      // Create new access token record
      await this.db.createOAuthAccessToken({
        applicationId: application.id,
        userId: accessToken.user_id,
        grantId: accessToken.grant_id,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        scopes: accessToken.scopes,
        expiresAt
      });

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: accessToken.scopes
      };
    } finally {
      await this.db.disconnect();
    }
  }

  // Verify access token
  async verifyAccessToken(token: string): Promise<{
    userId: string;
    clientId: string;
    scopes: string[];
  } | null> {
    await this.db.connect();
    
    try {
      const accessToken = await this.db.findOAuthAccessTokenByToken(token);
      if (!accessToken) {
        return null;
      }

      // Get application to return client_id
      const application = await this.db.getOAuthApplicationById(accessToken.application_id);
      if (!application) {
        return null;
      }

      return {
        userId: accessToken.user_id,
        clientId: application.uid,
        scopes: accessToken.scopes.split(' ')
      };
    } finally {
      await this.db.disconnect();
    }
  }

  // Revoke token
  async revokeToken(token: string): Promise<boolean> {
    await this.db.connect();
    
    try {
      // Try to find as access token first
      const accessToken = await this.db.findOAuthAccessTokenByToken(token);
      if (accessToken) {
        return await this.db.revokeOAuthAccessToken(accessToken.id);
      }

      // Try to find as refresh token
      const refreshToken = await this.db.findOAuthAccessTokenByRefreshToken(token);
      if (refreshToken) {
        return await this.db.revokeOAuthAccessToken(refreshToken.id);
      }

      return false;
    } finally {
      await this.db.disconnect();
    }
  }
} 