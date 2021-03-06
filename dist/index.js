"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const { readFileSync } = require('fs');
const yaml = require('js-yaml');
const { join } = require('path');
const codependency_1 = __importDefault(require("codependency"));
const electron_1 = require("electron");
const qs_1 = __importDefault(require("qs"));
const request_promise_native_1 = __importDefault(require("request-promise-native"));
const url_1 = __importDefault(require("url"));
const requirePeer = codependency_1.default.register(module);
const keytar = requirePeer('keytar', { optional: true });
const cryptoUtils_1 = require("./cryptoUtils");
class ElectronAuth0Login {
    constructor(config) {
        this.config = config;
        this.tokenProperties = null;
        this.useRefreshToken = !!(config.useRefreshTokens && config.applicationName && keytar);
        this.forceLogin = this.config.forceLogin || false;
        if (config.useRefreshTokens && !config.applicationName) {
            console.warn('electron-auth0-login: cannot use refresh tokens without an application name');
        }
        if (config.useRefreshTokens && !keytar) {
            console.warn('electron-auth0-login: cannot use refresh tokens without node-keytar installed');
        }
    }
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            this.tokenProperties = null;
            if (this.useRefreshToken) {
                yield keytar.deletePassword(this.config.applicationName, 'refresh-token');
            }
        });
    }
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.tokenProperties && timeToTokenExpiry(this.tokenProperties) > 60) {
                // We have a valid token - use it
                return this.tokenProperties;
            }
            else if (this.useRefreshToken) {
                // See if we can use a refresh token
                const refreshToken = yield keytar.getPassword(this.config.applicationName, 'refresh-token');
                if (refreshToken) {
                    try {
                        this.tokenProperties = yield this.sendRefreshToken(refreshToken);
                        return this.tokenProperties;
                    }
                    catch (err) {
                        console.warn('electron-auth0-login: could not use refresh token, may have been revoked');
                        keytar.deletePassword(this.config.applicationName, 'refresh-token');
                        return this.login();
                    }
                }
                else {
                    return this.login();
                }
            }
            else {
                return this.login();
            }
        });
    }
    sendRefreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            return request_promise_native_1.default(`https://${this.config.auth0Domain}/oauth/token`, {
                method: 'POST',
                json: true,
                body: {
                    grant_type: 'refresh_token',
                    client_id: this.config.auth0ClientId,
                    refresh_token: refreshToken
                }
            })
                .promise()
                .catch(handleError)
                .then(toTokenMeta);
        });
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            const authWindowDestroyTimeout = os_1.default.platform() === 'win32' ? 1000 : 0;
            const pkcePair = cryptoUtils_1.getPKCEChallengePair();
            const { authCode, authWindow } = yield this.getAuthCode(pkcePair);
            this.tokenProperties = yield this.exchangeAuthCodeForToken(authCode, pkcePair);
            setTimeout(() => authWindow.destroy(), authWindowDestroyTimeout);
            if (this.useRefreshToken && this.tokenProperties.refresh_token) {
                keytar.setPassword(this.config.applicationName, 'refresh-token', this.tokenProperties.refresh_token);
            }
            return this.tokenProperties;
        });
    }
    getAuthCode(pkcePair) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const authCodeUrl = `https://${this.config.auth0Domain}/authorize?` +
                    qs_1.default.stringify({
                        audience: this.config.auth0Audience,
                        scope: this.config.auth0Scopes,
                        response_type: 'code',
                        client_id: this.config.auth0ClientId,
                        code_challenge: pkcePair.challenge,
                        code_challenge_method: 'S256',
                        redirect_uri: `https://${this.config.auth0Domain}/mobile`
                    });
                const authWindow = new electron_1.BrowserWindow({
                    width: 800,
                    height: 600,
                    alwaysOnTop: true,
                    title: 'Log in',
                    backgroundColor: '#202020',
                });
                if (this.forceLogin)
                    yield authWindow.webContents.session.clearStorageData();
                authWindow.webContents.on('did-navigate', (event, href) => {
                    const location = url_1.default.parse(href);
                    if (location.pathname == '/mobile') {
                        const query = qs_1.default.parse(location.search || '', { ignoreQueryPrefix: true });
                        resolve({ authCode: query.code, authWindow });
                    }
                });
                authWindow.on('close', reject);
                // TODO: Grab proxy settings from local file
                loadProxy(authWindow).then(() => {
                    authWindow.loadURL(authCodeUrl).catch(handleError);
                });
            }));
        });
    }
    exchangeAuthCodeForToken(authCode, pkcePair) {
        return __awaiter(this, void 0, void 0, function* () {
            return request_promise_native_1.default(`https://${this.config.auth0Domain}/oauth/token`, {
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
                .catch(handleError)
                .then(toTokenMeta);
        });
    }
}
exports.default = ElectronAuth0Login;
function timeToTokenExpiry(tokenMeta) {
    return tokenMeta.created_time + tokenMeta.expires_in - getEpochSeconds();
}
function toTokenMeta(tokenResponse) {
    return Object.assign({}, tokenResponse, { created_time: getEpochSeconds() });
}
function getEpochSeconds() {
    return Date.now() / 1000;
}
function handleError(err) {
    console.error(err);
    switch (err.code) {
        case 'ERR_TUNNEL_CONNECTION_FAILED':
        case 'ERR_PROXY_CONNECTION_FAILED':
            showErrorBox('Proxy error');
            break;
        default:
            showErrorBox();
    }
    function showErrorBox(message = 'Unknown') {
        electron_1.dialog.showErrorBox('Error with login', message);
        electron_1.app.quit();
    }
}
function loadProxy(win) {
    let proxyRules = '';
    let pacScript = '';
    let proxyBypassRules = '';
    const appData = electron_1.app.getPath('appData');
    const proxyConfigLocation = join(appData, 'Cquence', 'proxy.yaml');
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        try {
            const proxyConfig = readFileSync(proxyConfigLocation, 'utf8');
            yaml.safeLoadAll(proxyConfig, (doc) => {
                ({ proxyRules, pacScript, proxyBypassRules } = doc);
            });
        }
        catch (err) {
            // NOTE: proxy config file is optional
            // If it does not exist we use the default values
            console.error(`Unable to load proxy file at: ${proxyConfigLocation}`);
        }
        console.log('load proxy with params: ', {
            proxyRules,
            pacScript,
            proxyBypassRules,
        });
        yield win.webContents.session.setProxy({
            proxyRules,
            pacScript,
            proxyBypassRules,
        });
        resolve();
    }));
}
