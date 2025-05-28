import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Client } from 'pg';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  name: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface OAuthApplication {
  id: string;
  name: string;
  uid: string; // client_id
  secret: string; // client_secret
  redirect_uri: string;
  scopes: string;
  confidential: boolean;
  client_uri?: string;
  logo_uri?: string;
  tos_uri?: string;
  policy_uri?: string;
  contacts?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthAccessGrant {
  id: string;
  application_id: string; // Foreign key to oauth_applications
  user_id: string; // Foreign key to users
  token: string; // Hashed authorization code or refresh token
  token_type: 'authorization_code' | 'refresh_token';
  redirect_uri: string;
  scopes: string;
  code_challenge?: string;
  code_challenge_method?: string;
  expires_at: Date;
  revoked_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthAccessToken {
  id: string;
  application_id: string; // Foreign key to oauth_applications
  user_id: string; // Foreign key to users
  grant_id?: string; // Foreign key to oauth_access_grants (for refresh tokens)
  token: string; // Hashed access token
  refresh_token?: string; // Hashed refresh token
  scopes: string;
  expires_at: Date;
  revoked_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOAuthApplicationData {
  client_name: string;
  redirect_uris: string[];
  client_uri?: string;
  logo_uri?: string;
  tos_uri?: string;
  policy_uri?: string;
  contacts?: string[];
  scope?: string;
}

export class DatabaseService {
  private client: Client;

  constructor(connectionString: string) {
    this.client = new Client({
      connectionString,
    });
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.end();
  }

  async query(text: string, params?: any[]): Promise<any> {
    return await this.client.query(text, params);
  }

  async initializeDatabase(): Promise<void> {
    // Create users table
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create OAuth applications table
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS oauth_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        uid VARCHAR(255) UNIQUE NOT NULL, -- client_id
        secret VARCHAR(255) NOT NULL, -- client_secret
        redirect_uri TEXT NOT NULL,
        scopes VARCHAR(255) DEFAULT 'read',
        confidential BOOLEAN DEFAULT false,
        client_uri VARCHAR(255),
        logo_uri VARCHAR(255),
        tos_uri VARCHAR(255),
        policy_uri VARCHAR(255),
        contacts TEXT, -- JSON array as text
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create OAuth grants table
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS oauth_access_grants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES oauth_applications(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL, -- Hashed authorization code or refresh token
        token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('authorization_code', 'refresh_token')),
        redirect_uri TEXT NOT NULL,
        scopes VARCHAR(255) NOT NULL,
        code_challenge VARCHAR(255),
        code_challenge_method VARCHAR(10),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(token)
      )
    `);

    // Create OAuth access tokens table
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS oauth_access_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES oauth_applications(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        grant_id UUID REFERENCES oauth_access_grants(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL, -- Hashed access token
        refresh_token VARCHAR(255), -- Hashed refresh token
        scopes VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(token),
        UNIQUE(refresh_token)
      )
    `);

    console.log('Database tables initialized successfully');
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const { username, email, name, password } = userData;
    
    // Hash the password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (username, email, name, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, name, password_hash, created_at, updated_at
    `;

    const result = await this.client.query(query, [username, email, name, password_hash]);
    return result.rows[0];
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, name, password_hash, created_at, updated_at
      FROM users
      WHERE username = $1
    `;

    const result = await this.client.query(query, [username]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, name, password_hash, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const result = await this.client.query(query, [email]);
    return result.rows[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, name, password_hash, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await this.client.query(query, [id]);
    return result.rows[0] || null;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createOAuthApplication(data: CreateOAuthApplicationData): Promise<OAuthApplication> {
    const uid = crypto.randomUUID();
    const secret = crypto.randomUUID() + crypto.randomUUID(); // More entropy
    const redirect_uri = data.redirect_uris.join('\n');
    const scopes = (data.scope || 'read') + ' read'; // Ensure 'read' scope is always included
    const contacts = data.contacts ? JSON.stringify(data.contacts) : null;

    const result = await this.client.query(
      `INSERT INTO oauth_applications 
       (name, uid, secret, redirect_uri, scopes, confidential, client_uri, logo_uri, tos_uri, policy_uri, contacts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.client_name,
        uid,
        secret,
        redirect_uri,
        scopes,
        false, // Always false for dynamic registration (public clients)
        data.client_uri || null,
        data.logo_uri || null,
        data.tos_uri || null,
        data.policy_uri || null,
        contacts
      ]
    );

    return result.rows[0] as OAuthApplication;
  }

  async findOrCreateOAuthApplication(name: string, data: CreateOAuthApplicationData): Promise<OAuthApplication> {
    // First try to find existing application
    const existingResult = await this.client.query(
      'SELECT * FROM oauth_applications WHERE name = $1',
      [name]
    );

    if (existingResult.rows.length > 0) {
      // Update existing application
      const redirect_uri = data.redirect_uris.join('\n');
      const scopes = (data.scope || 'read') + ' read';
      const contacts = data.contacts ? JSON.stringify(data.contacts) : null;

      const updateResult = await this.client.query(
        `UPDATE oauth_applications 
         SET redirect_uri = $2, scopes = $3, client_uri = $4, logo_uri = $5, 
             tos_uri = $6, policy_uri = $7, contacts = $8, updated_at = CURRENT_TIMESTAMP
         WHERE name = $1
         RETURNING *`,
        [
          name,
          redirect_uri,
          scopes,
          data.client_uri || null,
          data.logo_uri || null,
          data.tos_uri || null,
          data.policy_uri || null,
          contacts
        ]
      );

      return updateResult.rows[0] as OAuthApplication;
    } else {
      // Create new application
      return await this.createOAuthApplication(data);
    }
  }

  async getOAuthApplicationByClientId(clientId: string): Promise<OAuthApplication | null> {
    const result = await this.client.query(
      'SELECT * FROM oauth_applications WHERE uid = $1',
      [clientId]
    );

    return result.rows.length > 0 ? result.rows[0] as OAuthApplication : null;
  }

  async getOAuthApplicationById(id: string): Promise<OAuthApplication | null> {
    const result = await this.client.query(
      'SELECT * FROM oauth_applications WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] as OAuthApplication : null;
  }

  async listOAuthApplications(): Promise<OAuthApplication[]> {
    const result = await this.client.query(
      'SELECT * FROM oauth_applications ORDER BY created_at DESC'
    );

    return result.rows as OAuthApplication[];
  }

  async deleteOAuthApplication(clientId: string): Promise<boolean> {
    const result = await this.client.query(
      'DELETE FROM oauth_applications WHERE uid = $1',
      [clientId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // OAuth Grants methods
  async createOAuthGrant(data: {
    applicationId: string;
    userId: string;
    token: string;
    tokenType: 'authorization_code' | 'refresh_token';
    redirectUri: string;
    scopes: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    expiresAt: Date;
  }): Promise<OAuthAccessGrant> {
    const hashedToken = await bcrypt.hash(data.token, 12);
    
    const result = await this.client.query(
      `INSERT INTO oauth_access_grants 
       (application_id, user_id, token, token_type, redirect_uri, scopes, code_challenge, code_challenge_method, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.applicationId,
        data.userId,
        hashedToken,
        data.tokenType,
        data.redirectUri,
        data.scopes,
        data.codeChallenge || null,
        data.codeChallengeMethod || null,
        data.expiresAt
      ]
    );

    return result.rows[0] as OAuthAccessGrant;
  }

  async findOAuthAccessGrantByToken(token: string): Promise<OAuthAccessGrant | null> {
    try {
      // Validate input token
      if (!token || typeof token !== 'string') {
        console.error('Invalid token provided to findOAuthGrantByToken:', token);
        return null;
      }

      const result = await this.client.query(
        'SELECT * FROM oauth_access_grants WHERE revoked_at IS NULL AND expires_at > NOW() AND token_type = $1',
        ['authorization_code']
      );

      // Check each grant to find matching token (since tokens are hashed)
      for (const grant of result.rows) {
        try {
          // Validate that grant.token exists and is not null
          if (!grant.token || typeof grant.token !== 'string') {
            console.error('Invalid stored token for grant', grant.id, ':', grant.token);
            continue;
          }

          const isMatch = await bcrypt.compare(token, grant.token);
          if (isMatch) {
            return grant as OAuthAccessGrant;
          }
        } catch (bcryptError) {
          console.error('Bcrypt comparison error for grant', grant.id, ':', bcryptError);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Database error in findOAuthGrantByToken:', error);
      return null;
    }
  }

  async revokeOAuthGrant(grantId: string): Promise<boolean> {
    const result = await this.client.query(
      'UPDATE oauth_access_grants SET revoked_at = NOW(), updated_at = NOW() WHERE id = $1',
      [grantId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // OAuth Access Tokens methods
  async createOAuthAccessToken(data: {
    applicationId: string;
    userId: string;
    grantId?: string;
    token: string;
    refreshToken?: string;
    scopes: string;
    expiresAt: Date;
  }): Promise<OAuthAccessToken> {
    const hashedToken = await bcrypt.hash(data.token, 12);
    const hashedRefreshToken = data.refreshToken ? await bcrypt.hash(data.refreshToken, 12) : null;
    
    const result = await this.client.query(
      `INSERT INTO oauth_access_tokens 
       (application_id, user_id, grant_id, token, refresh_token, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.applicationId,
        data.userId,
        data.grantId || null,
        hashedToken,
        hashedRefreshToken,
        data.scopes,
        data.expiresAt
      ]
    );

    return result.rows[0] as OAuthAccessToken;
  }

  async findOAuthAccessTokenByToken(token: string): Promise<OAuthAccessToken | null> {
    const result = await this.client.query(
      'SELECT * FROM oauth_access_tokens WHERE revoked_at IS NULL AND expires_at > NOW()',
      []
    );

    // Check each token to find matching token (since tokens are hashed)
    for (const accessToken of result.rows) {
      const isMatch = await bcrypt.compare(token, accessToken.token);
      if (isMatch) {
        return accessToken as OAuthAccessToken;
      }
    }

    return null;
  }

  async findOAuthAccessTokenByRefreshToken(refreshToken: string): Promise<OAuthAccessToken | null> {
    const result = await this.client.query(
      'SELECT * FROM oauth_access_tokens WHERE revoked_at IS NULL AND refresh_token IS NOT NULL',
      []
    );

    // Check each token to find matching refresh token (since tokens are hashed)
    for (const accessToken of result.rows) {
      if (accessToken.refresh_token) {
        const isMatch = await bcrypt.compare(refreshToken, accessToken.refresh_token);
        if (isMatch) {
          return accessToken as OAuthAccessToken;
        }
      }
    }

    return null;
  }

  async revokeOAuthAccessToken(tokenId: string): Promise<boolean> {
    const result = await this.client.query(
      'UPDATE oauth_access_tokens SET revoked_at = NOW(), updated_at = NOW() WHERE id = $1',
      [tokenId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async revokeOAuthAccessTokensByUser(userId: string): Promise<number> {
    const result = await this.client.query(
      'UPDATE oauth_access_tokens SET revoked_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    return result.rowCount ?? 0;
  }

  async revokeOAuthAccessTokensByApplication(applicationId: string): Promise<number> {
    const result = await this.client.query(
      'UPDATE oauth_access_tokens SET revoked_at = NOW(), updated_at = NOW() WHERE application_id = $1 AND revoked_at IS NULL',
      [applicationId]
    );

    return result.rowCount ?? 0;
  }
} 