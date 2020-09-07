'use strict';
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const Twitter = require('twitter');
const tw = require('./tw.js');
const util = require('./util.js');
const oauth = require('./oauth.js');
const nyaan = require('../config/nyaan.json');

//-------------------------------------------------------------------------
//  認証のあれこれ
//-------------------------------------------------------------------------

/**
 * 設定ファイルを読み込む
 */
async function loadConfig() {
    if (!fs.existsSync(path.join(__dirname, '../config/config.json'))) {
        await oauth.authenticate();
    };
    const conf = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/config.json')));
    return conf;
};

/**
 * クライアントを作成
 * @param  {Object} token トークンオブジェクト
 * @return {Twitter}
 */
function createClient(token) {
    return new Twitter({
        consumer_key: `${nyaan.CONSUMER_KEY}`,
        consumer_secret: `${nyaan.CONSUMER_SECRET}`,
        access_token_key: `${token.ACCESS_TOKEN}`,
        access_token_secret: `${token.ACCESS_TOKEN_SECRET}`
    });        
};

//-------------------------------------------------------------------------
//  ツイート・反応・フォロー・アンフォロー等の操作
//-------------------------------------------------------------------------

/**
 * ツイートする
 * @param {Object} token         トークンオブジェクト
 * @param {String} tweetText     ツイート内容
 * @param {String} mediaPaths    添付する画像のパス(複数ある場合は,区切り)
 * @param {String} replyToPostId リプライ先の投稿ID
 */
async function tweetPost(token, tweetText, mediaPaths, replyToPostId) {
    const client = createClient(token);
    let status = {};
    let action = ' Tweeted ';
    // ツイート内容を追加
    status.status = tweetText;    
    // リプライの設定
    if (replyToPostId) {
        action = ' Replied ';
        status.in_reply_to_status_id = replyToPostId;
        status.auto_populate_reply_metadata = true;
    };
    // 画像をアップロード
    if (mediaPaths) {
        const mediaIds = await upload(token, mediaPaths).catch(err => util.showAPIErrorMsg(err));
        if (!mediaIds) {
            console.error(' Error '.bgRed + ' 画像のアップロードに失敗したため処理を中断しました'.brightRed);
            return;
        };
        status.media_ids = mediaIds;
    };
    // ツイート
    const tweet = await client.post('statuses/update', status).catch(err => util.showAPIErrorMsg(err));
    // 完了
    if (!tweet) return;
    console.log(action.bgBlue + ` ${tweet.text}`);
};

/**
 * 画像をアップロードする
 * @param  {Object} token      トークンオブジェクト
 * @param  {String} mediaPaths カンマで区切った画像のパス
 * @return {String}            メディアID
 */
async function upload(token, mediaPaths) {
    const client = createClient(token);
    const paths = mediaPaths.split(',');
    const pathLength = (paths.length > 4) ? 4 : paths.length;
    let mediaIds = '';

    for (let i = 0; i < pathLength; i++) {
        const filePath = paths[i].trim();
        // 拡張子をチェック
        const ext = path.extname(filePath).toLowerCase();
        if (ext != '.jpg' && ext != '.jpeg' && ext != '.png' && ext != '.gif') {
            console.error(' Error '.bgRed + ` 未対応の拡張子です (${ext})`.brightRed);
            continue;
        };
        // 画像が存在するかチェック
        if (!fs.existsSync(filePath)) {
            console.error(' Error '.bgRed + ` ファイルが見つかりません (${filePath})`.brightRed);
            continue;
        };
        // アップロード
        const file = fs.readFileSync(filePath);
        let media;
        try {
            media = await client.post('media/upload', {media: file});
        } catch(err) {
            console.error(' Error '.bgRed + `アップロードに失敗しました (${filePath})`.brightRed);
            continue;
        };
        // メディアIDを記録
        mediaIds += media.media_id_string + ',';
        // 完了
        console.log(' Success '.bgGreen + ` アップロードしました！(${filePath})`.brightGreen);
    };
    return mediaIds;
};

/**
 * ツイートを削除する
 * @param {Object} token   トークンオブジェクト
 * @param {String} tweetId ツイートID
 */
async function deleteTweet(token, tweetId) {
    const client = createClient(token);
    const tweet = await client.post(`statuses/destroy/${tweetId}`, {id: tweetId}).catch(err => util.showAPIErrorMsg(err));
    // 完了
    if (!tweet) return;
    const width = process.stdout.columns - 12;
    const text = util.strCat(util.optimizeText(tweet.text), 0, width, true);
    console.log(' Deleted '.bgBlue + ` ${text}`);
};

/**
 * いいね
 * @param {Object} token      トークンオブジェクト
 * @param {String}  tweetId   ツイートID
 * @param {Boolean} isRemoved いいねを取り消すかどうか
 */
async function favorite(token, tweetId, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'destroy' : 'create';
    const tweet = await client.post(`favorites/${type}`, {id: tweetId}).catch(err => util.showAPIErrorMsg(err));
    // 完了
    if (!tweet) return;
    const msg = (isRemoved) ? ' Un-liked ' : ' Liked ';
    const width = process.stdout.columns - msg.length - 3;
    const text = util.strCat(util.optimizeText(tweet.text), 0, width, true);
    console.log(msg.bgBrightMagenta + ` ${text}`);
};

/**
 * リツイート
 * @param {Object}  token     トークンオブジェクト
 * @param {String}  tweetId   ツイートID
 * @param {Boolean} isRemoved リツイートを取り消すかどうか
 */
async function retweet(token, tweetId, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'unretweet' : 'retweet';
    const tweet = await client.post(`statuses/${type}/${tweetId}`, {id: tweetId}).catch(err => util.showAPIErrorMsg(err));
    // 完了
    if (!tweet) return;
    const msg = (isRemoved) ? ' Un-retweeted ' : ' Retweeted ';
    const width = process.stdout.columns - msg.length - 3;
    const text = util.strCat(util.optimizeText(tweet.text), 0, width, true);
    console.log(msg.black.bgBrightGreen + ` ${text}`);
};

/**
 * フォロー
 * @param {Object}  token      トークンオブジェクト
 * @param {String}  screenName ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved  フォローを解除するかどうか
 */
async function follow(token, screenName, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'destroy' : 'create';
    const user = await client.post(`friendships/${type}`, {screen_name: screenName}).catch(err => util.showAPIErrorMsg(err));
    // 完了
    if (!user) return;
    const msg = (isRemoved) ? ' Un-followed ' : ' Followed ';
    const width = process.stdout.columns - msg.length - 3;
    const text = util.strCat(util.optimizeText(user.name), 0, width, true);
    console.log(msg.bgBlue + ` ${text}`);
};

/**
 * ブロック
 * @param {Object}  token      トークンオブジェクト
 * @param {String}  screenName ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved  解除するかどうか
 */
async function block(token, screenName, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'destroy' : 'create';
    const user = await client.post(`blocks/${type}`, {screen_name: screenName}).catch(err => util.showAPIErrorMsg(err));
    // 完了
    if (!user) return;
    const msg = (isRemoved) ? ' Un-blocked ' : ' Blocked ';
    const width = process.stdout.columns - msg.length - 3;
    const text = util.strCat(util.optimizeText(user.name), 0, width, true);
    console.log(msg.bgRed + ` ${text}`);
};

/**
 * ミュート
 * @param {Object}  token      トークンオブジェクト
 * @param {String}  screenName ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved  解除するかどうか
 */
async function mute(token, screenName, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'destroy' : 'create';
    const user = await client.post(`mutes/users/${type}`, {screen_name: screenName}).catch(err => util.showAPIErrorMsg(err));
    // 完了
    if (!user) return;
    const msg = (isRemoved) ? ' Un-muted ' : ' Muted ';
    const width = process.stdout.columns - msg.length - 3;
    const text = util.strCat(util.optimizeText(user.name), 0, width, true);
    console.log(msg.black.bgYellow + ` ${text}`);
};

//-------------------------------------------------------------------------
//  ツイートの取得と表示
//-------------------------------------------------------------------------

/**
 * タイムラインを取得して表示
 * @param  {Object}  token       トークンオブジェクト
 * @param  {Boolean} mentionMode メンション取得モード
 * @param  {Number}  count       取得件数（最大200件）
 * @return {Array}               取得したツイート
 */
async function getTimeline(token, mentionMode, count) {
    const client = createClient(token);
    const type = (mentionMode) ? 'mentions_timeline' : 'home_timeline';
    let param = { count: count };
    // TL取得モードの場合はリプライを含めない
    if (!mentionMode) param.exclude_replies = true;
    // タイムライン取得
    const tweets = await client.get(`statuses/${type}`, param).catch(err => util.showAPIErrorMsg(err));
    // データが存在するかチェック
    if (!tweets || !tweets.length) {
        console.log(' Error '.bgRed + ' データがありません');
        return [];
    };
    // タイムラインを表示
    tw.showTweets(tweets);
    return tweets;
};

/**
 * ユーザータイムラインを表示して表示
 * @param  {Object} token  トークンオブジェクト
 * @param  {String} userId ユーザーID（空の場合自分の投稿を取得）
 * @param  {Number} count  取得件数（最大200件）
 * @return {Array}         取得したツイート
 */
async function getUserTimeline(token, userId, count) {
    const client = createClient(token);
    let param = { count: count };
    // ユーザーIDがあれば追加
    if (userId) param.screen_name = userId.replace(/@|＠/, '');
    // タイムライン取得
    const tweets = await client.get('statuses/user_timeline', param).catch(err => util.showAPIErrorMsg(err));
    // データが存在するかチェック
    if (!tweets || !tweets.length) {
        console.log(' Error '.bgRed + ' ユーザーがみつかりませんでした…');
        return [];
    };
    // 対象ユーザーと自分との関係を取得
    const connections = await getUserLookup(token, tweets[0].user.id_str).catch(err => console.error(err));
    // ツイートを表示
    tw.showTweets(tweets);
    // プロフィールを表示
    tw.showUserInfo(tweets[0].user, connections);
    return tweets;
};

/**
 * 対象のユーザーと自分との関係を取得
 * @param  {Object} token  トークンオブジェクト
 * @param  {String} userId ユーザーID
 * @return {Object}        対象ユーザーとの関係
 */
async function getUserLookup(token, userId) {
    const client = createClient(token);
    let connections = {};
    // 関係を取得
    const lookup = await client.get('friendships/lookup', {user_id: userId}).catch(err => util.showAPIErrorMsg(err));
    // 関係を示すオブジェクトを作成
    if (lookup) {
        for (let connection of lookup[0].connections) {
            connections[connection] = true;
        };
    };
    return connections;
};

/**
 * キーワードからツイートを検索して表示
 * @param  {Object} token   トークンオブジェクト
 * @param  {String} keyword 検索キーワード
 * @param  {Number} count   取得件数（最大100件）
 * @return {Array}          取得したツイート
 */
async function searchTweet(token, keyword, count) {
    const client = createClient(token);
    // ツイートを検索
    const results = await client.get('search/tweets', {q: `${keyword}  exclude:retweets`, count: count}).catch(err => util.showAPIErrorMsg(err));
    const tweets = results.statuses;
    // データがあるかチェック
    if (!tweets || !tweets.length) {
        console.log(' Error '.bgRed + ' みつかりませんでした…'.bgBrightRed);
        return [];
    };
    // 検索結果を表示
    tw.showTweets(tweets);
    console.log(' Info '.bgBlue + `「${keyword}」の検索結果です`);
    return tweets;
};

//-------------------------------------------------------------------------
//  ツイートのインデックス関係の処理
//-------------------------------------------------------------------------

/**
 * ツイートのインデックスからツイートIDを取得
 * @param  {Array}  tl    タイムライン
 * @param  {Number} index ツイートのインデックス
 * @return {String}       ツイートID
 */
function getTweetId(tl, index) {
    // 数値か検証
    if (!index || isNaN(index)) {
        console.error(' Error '.bgRed + ' インデックスが不正です'.brightRed);
        return '';
    };
    // インデックスが存在するか検証
    if (index > tl.length - 1) {
        console.error(' Error '.bgRed + ' ツイートが存在しません'.brightRed);
        return '';
    };
    return tl[index].id_str;
};

/**
 * ツイートのインデックスからユーザーのスクリーンネームを取得
 * @param  {Array}   tl             タイムライン
 * @param  {*}       index          ツイートのインデックス/スクリーンネーム
 * @param  {Boolean} isGetRtUser    RTだった場合、RT元のユーザーを取得するか
 * @return {String}                 スクリーンネーム
 */
function getScreenName(tl, index, isGetRtUser) {
    // 数値以外の場合はそのまま返す
    if (isNaN(index)) return index;
    index = Number(index);
    // インデックスが存在するか検証
    if (index > tl.length - 1) {
        console.error(' Error '.bgRed + ' ツイートが存在しません'.brightRed);
        return '';
    };
    // 対象のツイートを取得
    const tweet = tl[index];
    // RTの場合はRT元のスクリーンネームを返す
    return (isGetRtUser && tweet.retweeted_status) ? tweet.retweeted_status.user.screen_name : tweet.user.screen_name;
};

module.exports = {
    loadConfig,
    tweetPost,
    deleteTweet,
    favorite,
    retweet,
    follow,
    block,
    mute,
    getTimeline,
    getUserTimeline,
    searchTweet,
    getTweetId,
    getScreenName
};
