import axios from 'axios';
import { config } from 'dotenv';

config();

const ST_ENV = process.env.ST_ENV || 'sandbox';
const BASE_URL = ST_ENV === 'production' 
  ? 'https://api.servicetitan.io' 
  : 'https://api-integration.servicetitan.io'; // Confirm exact sandbox URL from docs

const TOKEN_URL = `${BASE_URL}/auth/connect/token`;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.ST_CLIENT_ID;
  const clientSecret = process.env.ST_CLIENT_SECRET;
  const appKey = process.env.ST_APP_KEY;

  if (!clientId || !clientSecret || !appKey) {
    throw new Error('Missing ServiceTitan credentials in environment');
  }

  // Client Credentials flow example (adjust for Authorization Code if needed)
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    // scope: '...' // Add required scopes
  });

  try {
    const response = await axios.post<TokenResponse>(TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'ST-App-Key': appKey,
      },
    });

    const { access_token, expires_in } = response.data;
    cachedToken = {
      token: access_token,
      expiresAt: Date.now() + (expires_in * 1000) - 60000, // 1 min buffer
    };
    return access_token;
  } catch (error: any) {
    console.error('OAuth token error:', error.response?.data || error.message);
    throw new Error('Failed to obtain ServiceTitan access token');
  }
}

// TODO: Add refresh logic, Authorization Code flow support, tenant handling
export function clearTokenCache() {
  cachedToken = null;
}