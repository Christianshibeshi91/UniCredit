import type { SPAPIToken } from "@/lib/types/spapi";

class TokenManager {
  private token: SPAPIToken | null = null;
  private refreshPromise: Promise<string> | null = null;

  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 5 * 60 * 1000) {
      return this.token.accessToken;
    }
    return this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this._doRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(): Promise<string> {
    const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
    const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
    const refreshTokenValue = process.env.AMAZON_SP_API_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshTokenValue) {
      throw new Error("SP-API credentials not configured");
    }

    const response = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshTokenValue,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SP-API token refresh failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
    };

    return this.token.accessToken;
  }
}

export const tokenManager = new TokenManager();
