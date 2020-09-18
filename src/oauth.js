'use strict';
const fs    = require('fs');
const path  = require('path');
const OAuth = require('oauth').OAuth;
const util  = require('./util.js');
const nyaan = require('../config/nyaan.json');

const oauth = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    nyaan.CONSUMER_KEY,
    nyaan.CONSUMER_SECRET,
    "1.0",
    undefined,
    "HMAC-SHA1"
);

/**
 * アプリケーション認証
 */
async function authenticate() {
    const oauthToken = await getOAuthToken();

    // やりたかった。。。
    console.clear();
    console.log('    /$$                                                                             ');
    console.log('    | $$                                                                            ');
    console.log('   /$$$$$$   /$$  /$$  /$$         /$$$$$$$  /$$   /$$  /$$$$$$   /$$$$$$  /$$$$$$$ ');
    console.log('  |_  $$_/  | $$ | $$ | $$ /$$$$$$| $$__  $$| $$  | $$ |____  $$ |____  $$| $$__  $$');
    console.log('    | $$    | $$ | $$ | $$|______/| $$  \\ $$| $$  | $$  /$$$$$$$  /$$$$$$$| $$  \\ $$');
    console.log('    | $$ /$$| $$ | $$ | $$        | $$  | $$| $$  | $$ /$$__  $$ /$$__  $$| $$  | $$');
    console.log('    |  $$$$/|  $$$$$/$$$$/        | $$  | $$|  $$$$$$$|  $$$$$$$|  $$$$$$$| $$  | $$');
    console.log('     \\___/   \\_____/\\___/         |__/  |__/ \\____  $$ \\_______/ \\_______/|__/  |__/');
    console.log('                                             /$$  | $$                              ');
    console.log('                                            |  $$$$$$/                              ');
    console.log('                                             \\______/                               \n');
    
    util.info('i', '以下のURLにアクセスして、表示されたPINコードを入力してください\n');

    // 認証URL表示
    console.log(oauthToken.oauthURL + '\n');
    
    // アクセストークンを取得
    const pin = await util.readlineSync();
    const accessToken = await getAccessToken(oauthToken, pin).catch((err) => {
        util.info('e', err.data);
        process.exit(1);
    });

    // 保存
    const dirPath = util.getDirPath();
    fs.writeFileSync(path.join(dirPath, './config.json'), JSON.stringify(accessToken));
};

/**
 * 認証トークンを取得
 * 
 * @return {Object} 認証トークンオブジェクト
 */
function getOAuthToken() {
    return new Promise((resolve, reject) => {
        oauth.getOAuthRequestToken((err, oauthToken, oauthTokenSecret) => {
            // エラー
            if (err) {
                console.error(err);
                reject(err);
            };
            // 認証用URL
            resolve({
                'oauthToken': oauthToken,
                'oauthTokenSecret': oauthTokenSecret,
                'oauthURL': `https://twitter.com/oauth/authenticate?oauth_token=${oauthToken}`
            });
        });
    });
};

/**
 * アクセストークンを取得
 * 
 * @param {Object} token 認証トークンオブジェクト
 * @param {Strung} pin   PINコード
 */
function getAccessToken(token, pin) {
    return new Promise((resolve, reject) => {
        oauth.getOAuthAccessToken(token.oauthToken, token.oauthTokenSecret, pin, (err, accessToken, accessTokenSecret) => {
            // エラー
            if (err){
                reject(err);
            };
            // トークン
            resolve({
                'ACCESS_TOKEN': accessToken,
                'ACCESS_TOKEN_SECRET': accessTokenSecret
            });
        });
    });
};

/**
 * 設定ファイル読み込み
 */
async function loadToken() {
    const dirPath    = util.getDirPath();
    const configPath = path.join(dirPath, './config.json');

    // ファイルがなければ認証する
    if (!fs.existsSync(configPath)) {
        await authenticate();
    };

    return JSON.parse(fs.readFileSync(configPath));
};

module.exports = { loadToken };
