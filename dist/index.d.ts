export default class ElectronAuth0Login {
    private config;
    private tokenProperties;
    private useRefreshToken;
    private forceLogin;
    constructor(config: Config);
    logout(): Promise<void>;
    getToken(): Promise<TokenProperties>;
    private sendRefreshToken;
    private login;
    private getAuthCode;
    private exchangeAuthCodeForToken;
}
