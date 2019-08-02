import os from 'os';
import codependency from 'codependency';
import { BrowserWindow } from 'electron';
import qs from 'qs';
import request from 'request-promise-native';
import url from 'url';

const requirePeer = codependency.register(module);
const keytar = requirePeer('keytar', { optional: true });

<<<<<<< HEAD
import { getPKCEChallengePair, PKCEPair } from './cryptoUtils';

export interface Config {
    applicationName?: string,
    auth0Audience: string, // API we're going to access
    auth0ClientId: string,
    auth0Domain: string,
    auth0Scopes: string, // What permissions do we want?
    useRefreshTokens?: boolean,
    windowConfig?: object
}

interface Auth0TokenResponse {
    access_token: string,
    expires_in: number
    scope: string,
    refresh_token?: string
    token_type: string
}

interface TokenProperties extends Auth0TokenResponse {
    created_time: number
}

export default class ElectronAuth0Login {
    private config: Config;
    private tokenProperties: TokenProperties | null;
    private useRefreshToken: boolean;
    private windowConfig = {
        width: 800,
        height: 600,
        alwaysOnTop: true,
        title: 'Log in',
        backgroundColor: '#202020'
    };
=======
import { getPKCEChallengePair } from './cryptoUtils';

export default class ElectronAuth0Login {
  private config: Config;
  private tokenProperties: TokenProperties | null;
  private useRefreshToken: boolean;
>>>>>>> Return all token properties in getToken()

  constructor(config: Config) {
    this.config = config;
    this.tokenProperties = null;
    this.useRefreshToken = !!(config.useRefreshTokens && config.applicationName && keytar);

<<<<<<< HEAD
        if (config.windowConfig) {
            this.windowConfig = {
                ...this.windowConfig,
                ...config.windowConfig
            }
        }

        if (config.useRefreshTokens && !config.applicationName) {
            console.warn('electron-auth0-login: cannot use refresh tokens without an application name');
        }

        if (config.useRefreshTokens && !keytar) {
            console.warn('electron-auth0-login: cannot use refresh tokens without keytar installed');
        }
    }

    public async logout() {
        this.tokenProperties = null;
        if (this.useRefreshToken) {
            await keytar.deletePassword(this.config.applicationName, 'refresh-token');
        }
=======
    if (config.useRefreshTokens && !config.applicationName) {
      console.warn('electron-auth0-login: cannot use refresh tokens without an application name');
>>>>>>> Return all token properties in getToken()
    }

    if (config.useRefreshTokens && !keytar) {
      console.warn('electron-auth0-login: cannot use refresh tokens without node-keytar installed');
    }
  }

  public async logout() {
    this.tokenProperties = null;
    if (this.useRefreshToken) {
      await keytar.deletePassword(this.config.applicationName, 'refresh-token');
    }
  }

  public async getToken(): Promise<TokenProperties> {
    if (this.tokenProperties && timeToTokenExpiry(this.tokenProperties) > 60) {
      // We have a valid token - use it
      return this.tokenProperties;
    } else if (this.useRefreshToken) {
      // See if we can use a refresh token
      const refreshToken = await keytar.getPassword(this.config.applicationName, 'refresh-token');

      if (refreshToken) {
        try {
          this.tokenProperties = await this.sendRefreshToken(refreshToken);
          return this.tokenProperties;
        } catch (err) {
          console.warn('electron-auth0-login: could not use refresh token, may have been revoked');
          keytar.deletePassword(this.config.applicationName, 'refresh-token');
          return this.login();
        }
      } else {
        return this.login();
      }
    } else {
      return this.login();
    }
  }

  private async sendRefreshToken(refreshToken: string): Promise<TokenProperties> {
    return request(`https://${this.config.auth0Domain}/oauth/token`, {
      method: 'POST',
      json: true,
      body: {
        grant_type: 'refresh_token',
        client_id: this.config.auth0ClientId,
        refresh_token: refreshToken
      }
    })
      .promise()
      .then(toTokenMeta);
  }

  private async login() {
    const authWindowDestroyTimeout = os.platform() === 'win32' ? 1000 : 0;
    const pkcePair = getPKCEChallengePair();
    const { authCode, authWindow } = await this.getAuthCode(pkcePair);

    this.tokenProperties = await this.exchangeAuthCodeForToken(authCode, pkcePair);

    setTimeout(() => authWindow.destroy(), authWindowDestroyTimeout);

    if (this.useRefreshToken && this.tokenProperties.refresh_token) {
      keytar.setPassword(this.config.applicationName, 'refresh-token', this.tokenProperties.refresh_token);
    }

<<<<<<< HEAD
    private async getAuthCode(pkcePair: PKCEPair): Promise<string> {       
        return new Promise<string>((resolve, reject) => {
            const authCodeUrl = `https://${this.config.auth0Domain}/authorize?` + qs.stringify({
                audience: this.config.auth0Audience,                
                scope: this.config.auth0Scopes,
                response_type: 'code',
                client_id: this.config.auth0ClientId,
                code_challenge: pkcePair.challenge,
                code_challenge_method: 'S256',
                redirect_uri: `https://${this.config.auth0Domain}/mobile`
            });

            const authWindow = new BrowserWindow(this.windowConfig);
    
            authWindow.webContents.on('did-navigate' as any, (event: any, href: string) => {
                const location = url.parse(href);
                if (location.pathname == '/mobile') {
                    const query = qs.parse(location.search || '', {ignoreQueryPrefix: true});
                    resolve(query.code);
                    authWindow.destroy();
                }
            });
    
            authWindow.on('close', reject);
    
            authWindow.loadURL(authCodeUrl);
=======
    return this.tokenProperties;
  }

  private async getAuthCode(pkcePair: PKCEPair): Promise<AuthCodeResponse> {
    console.log(os.platform());
    return new Promise<AuthCodeResponse>((resolve, reject) => {
      const authCodeUrl =
        `https://${this.config.auth0Domain}/authorize?` +
        qs.stringify({
          audience: this.config.auth0Audience,
          scope: this.config.auth0Scopes,
          response_type: 'code',
          client_id: this.config.auth0ClientId,
          code_challenge: pkcePair.challenge,
          code_challenge_method: 'S256',
          redirect_uri: `https://${this.config.auth0Domain}/mobile`
>>>>>>> Return all token properties in getToken()
        });

      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        alwaysOnTop: true,
        title: 'Log in',
        backgroundColor: '#202020'
      });

      authWindow.webContents.on('did-navigate' as any, (event: any, href: string) => {
        const location = url.parse(href);
        if (location.pathname == '/mobile') {
          const query = qs.parse(location.search || '', { ignoreQueryPrefix: true });
          resolve({ authCode: query.code, authWindow });
        }
      });

      authWindow.on('close', reject);

      authWindow.loadURL(authCodeUrl);
    });
  }

  private async exchangeAuthCodeForToken(authCode: string, pkcePair: PKCEPair): Promise<TokenProperties> {
    return request(`https://${this.config.auth0Domain}/oauth/token`, {
      method: 'POST',
      json: true,
      body: {
        grant_type: 'authorization_code',
        client_id: this.config.auth0ClientId,
        code_verifier: pkcePair.verifier,
        code: authCode,
        redirect_uri: `https://${this.config.auth0Domain}/mobile`
      }
    })
      .promise()
      .then(toTokenMeta);
  }
}

function timeToTokenExpiry(tokenMeta: TokenProperties): number {
  return tokenMeta.created_time + tokenMeta.expires_in - getEpochSeconds();
}

function toTokenMeta(tokenResponse: Auth0TokenResponse): TokenProperties {
  return {
    ...tokenResponse,
    created_time: getEpochSeconds()
  };
}

function getEpochSeconds() {
  return Date.now() / 1000;
}
