'use strict';
const fs      = require('fs');
const path    = require('path');
const chalk   = require('chalk');
const Twitter = require('twitter');
const tw      = require('./tw.js');
const util    = require('./util.js');
const nyaan   = require('../config/nyaan.json');
const color   = util.loadColorData();

//-------------------------------------------------------------------------
//  認証のあれこれ
//-------------------------------------------------------------------------

/**
 * クライアントを作成
 * 
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
//  APIの操作
//-------------------------------------------------------------------------

/**
 * ツイート
 * 
 * @param {Object} token         トークンオブジェクト
 * @param {String} tweetText     ツイート内容
 * @param {String} mediaPaths    添付する画像のパス(複数ある場合は,区切り)
 * @param {String} replyToPostId リプライ先の投稿ID
 */
async function tweetPost(token, tweetText, mediaPaths, replyToPostId) {
    const client = createClient(token);
    let status = { 'status': tweetText };
    let action = ' Tweeted ';    

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
            util.info('e', '画像のアップロードに失敗したため処理を中断しました');
            return;
        };
        status.media_ids = mediaIds;
    };

    // ツイート
    const tweet = await client.post('statuses/update', status).catch(err => util.showAPIErrorMsg(err));
    if (!tweet) return;

    util.info(chalk.black.bgHex(color.ui.tweet)(action), tweet.text);
};

/**
 * 画像をアップロードする
 * 
 * @param  {Object} token      トークンオブジェクト
 * @param  {String} mediaPaths カンマで区切った画像のパス
 * @return {String}            メディアID
 */
async function upload(token, mediaPaths) {
    const client = createClient(token);
    const paths = mediaPaths.split(',').map((p) => { return p.trim() });
    let mediaIds = '';

    // 画像の枚数をチェック
    if (paths.length > 4) {
        util.info('e', '画像の枚数が多すぎます（最大4枚）');
        return;
    };

    for (let filePath of paths) {
        // 拡張子をチェック
        const ext = path.extname(filePath).toLowerCase();
        if (ext != '.jpg' && ext != '.jpeg' && ext != '.png' && ext != '.gif') {
            util.info('e', `未対応の拡張子です (${ext})`);
            continue;
        };

        // 画像が存在するかチェック
        if (!fs.existsSync(filePath)) {
            util.info('e', `ファイルが見つかりません (${filePath})`);
            continue;
        };

        // アップロード
        const file = fs.readFileSync(filePath);
        let media;
        try {
            media = await client.post('media/upload', {media: file});
        } catch(err) {
            util.info('e', `アップロードに失敗しました (${filePath})`);
            continue;
        };

        mediaIds += media.media_id_string + ',';
        util.info('s', `アップロードしました！(${filePath})`);
    };

    return mediaIds;
};

/**
 * ツイートを削除する
 * 
 * @param {Object} token   トークンオブジェクト
 * @param {String} tweetId ツイートID
 */
async function deleteTweet(token, tweetId) {
    const client = createClient(token);
    const width = process.stdout.columns - 12;

    // 削除
    const tweet = await client.post(`statuses/destroy/${tweetId}`, {id: tweetId}).catch(err => util.showAPIErrorMsg(err));
    if (!tweet) return;

    const text = util.strCat(util.optimizeText(tweet.text), 0, width, true);
    util.info(chalk.black.bgHex(color.ui.tweet)(' Deleted '), text);
};

/**
 * いいね
 * 
 * @param {Object}  token     トークンオブジェクト
 * @param {String}  tweetId   ツイートID
 * @param {Boolean} isRemoved いいねを取り消すかどうか
 */
async function favorite(token, tweetId, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'destroy' : 'create';
    const msg = (isRemoved) ? ' Un-liked ' : ' Liked ';
    const width = process.stdout.columns - msg.length - 3;
    
    // いいね
    const tweet = await client.post(`favorites/${type}`, {id: tweetId}).catch(err => util.showAPIErrorMsg(err));
    if (!tweet) return;
    
    const text = util.strCat(util.optimizeText(tweet.text), 0, width, true);
    util.info(chalk.black.bgHex(color.ui.fav)(msg), text);
};

/**
 * リツイート
 * 
 * @param {Object}  token     トークンオブジェクト
 * @param {String}  tweetId   ツイートID
 * @param {Boolean} isRemoved リツイートを取り消すかどうか
 */
async function retweet(token, tweetId, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'unretweet' : 'retweet';
    const msg = (isRemoved) ? ' Un-retweeted ' : ' Retweeted ';
    const width = process.stdout.columns - msg.length - 3;

    // RT
    const tweet = await client.post(`statuses/${type}/${tweetId}`, {id: tweetId}).catch(err => util.showAPIErrorMsg(err));
    if (!tweet) return;
    
    const text = util.strCat(util.optimizeText(tweet.text), 0, width, true);
    util.info(chalk.black.bgHex(color.ui.rt)(msg), text);
};

/**
 * フォロー
 * 
 * @param {Object}  token      トークンオブジェクト
 * @param {String}  screenName ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved  フォローを解除するかどうか
 */
async function follow(token, screenName, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'destroy' : 'create';
    const msg = (isRemoved) ? ' Un-followed ' : ' Followed ';
    const width = process.stdout.columns - msg.length - 3;

    // フォロー
    const user = await client.post(`friendships/${type}`, {screen_name: screenName}).catch(err => util.showAPIErrorMsg(err));
    if (!user) return;
    
    const text = util.strCat(util.optimizeText(user.name), 0, width, true);
    util.info(chalk.black.bgHex(color.ui.follow)(msg), text);
};

/**
 * ブロック
 * 
 * @param {Object}  token      トークンオブジェクト
 * @param {String}  screenName ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved  解除するかどうか
 */
async function block(token, screenName, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'destroy' : 'create';
    const msg = (isRemoved) ? ' Un-blocked ' : ' Blocked ';
    const width = process.stdout.columns - msg.length - 3;

    // ブロック
    const user = await client.post(`blocks/${type}`, {screen_name: screenName}).catch(err => util.showAPIErrorMsg(err));
    if (!user) return;
    
    const text = util.strCat(util.optimizeText(user.name), 0, width, true);
    util.info(chalk.black.bgHex(color.ui.block)(msg), text);
};

/**
 * ミュート
 * 
 * @param {Object}  token      トークンオブジェクト
 * @param {String}  screenName ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved  解除するかどうか
 */
async function mute(token, screenName, isRemoved) {
    const client = createClient(token);
    const type = (isRemoved) ? 'destroy' : 'create';
    const msg = (isRemoved) ? ' Un-muted ' : ' Muted ';
    const width = process.stdout.columns - msg.length - 3;

    // ミュート
    const user = await client.post(`mutes/users/${type}`, {screen_name: screenName}).catch(err => util.showAPIErrorMsg(err));
    if (!user) return;
    
    const text = util.strCat(util.optimizeText(user.name), 0, width, true);
    util.info(chalk.black.bgHex(color.ui.mute)(msg), text);
};

//-------------------------------------------------------------------------
//  ツイートの取得と表示
//-------------------------------------------------------------------------

/**
 * タイムラインを取得して表示
 * 
 * @param  {Object}  token       トークンオブジェクト
 * @param  {Boolean} mentionMode メンション取得モード
 * @param  {Number}  count       取得件数（最大200件）
 * @return {Array}               取得したツイート
 */
async function getTimeline(token, mentionMode, count) {
    const client = createClient(token);
    const type = (mentionMode) ? 'mentions_timeline' : 'home_timeline';
    let param = {
        tweet_mode: 'extended',
        count: count
    };

    // TL取得モードの場合はリプライを含めない
    if (!mentionMode) param.exclude_replies = true;

    // タイムライン取得
    const tweets = await client.get(`statuses/${type}`, param).catch(err => util.showAPIErrorMsg(err));
    if (!tweets || !tweets.length) {
        util.info('e', 'データがありません');
        return [];
    };

    // タイムラインを表示
    tw.showTweets(tweets);
    return tweets;
};

/**
 * ユーザータイムラインを表示して表示
 * 
 * @param  {Object} token  トークンオブジェクト
 * @param  {String} userId ユーザーID（空の場合自分の投稿を取得）
 * @param  {Number} count  取得件数（最大200件）
 * @return {Array}         取得したツイート
 */
async function getUserTimeline(token, userId, count) {
    const client = createClient(token);
    let param = {
        tweet_mode: 'extended',
        count: count
    };

    // ユーザーIDがあれば追加
    if (userId) param.screen_name = userId.replace(/@|＠/, '');

    // タイムライン取得
    const tweets = await client.get('statuses/user_timeline', param).catch(err => util.showAPIErrorMsg(err));
    if (!tweets || !tweets.length) {
        util.info('e', 'ユーザーがみつかりませんでした…');
        return [];
    };

    // 対象ユーザーと自分との関係を取得
    const connections = await getUserLookup(token, tweets[0].user.id_str).catch(err => console.error(err));

    // 表示
    tw.showTweets(tweets);
    tw.showUserInfo(tweets[0].user, connections);
    return tweets;
};

/**
 * 対象のユーザーと自分との関係を取得
 * 
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
 * 
 * @param  {Object} token   トークンオブジェクト
 * @param  {String} keyword 検索キーワード
 * @param  {Number} count   取得件数（最大100件）
 * @return {Array}          取得したツイート
 */
async function searchTweet(token, keyword, count) {
    const client = createClient(token);
    let param = {
        q: keyword,
        tweet_mode: 'extended',
        count: count
    };

    // ツイートを検索
    const results = await client.get('search/tweets', param).catch(err => util.showAPIErrorMsg(err));
    const tweets = results.statuses;
    if (!tweets || !tweets.length) {
        util.info('e', 'みつかりませんでした…');
        return [];
    };

    // 検索結果を表示
    tw.showTweets(tweets);
    util.info('i', `「${keyword}」の検索結果です`);

    return tweets;
};

//-------------------------------------------------------------------------
//  ツイートのインデックス関係の処理
//-------------------------------------------------------------------------

/**
 * ツイートのインデックスからツイートIDを取得
 * 
 * @param  {Array}  tl    タイムライン
 * @param  {Number} index ツイートのインデックス
 * @return {String}       ツイートID
 */
function getTweetId(tl, index) {
    // 数値かどうか
    if (!index || isNaN(index)) {
        util.info('e', 'インデックスが不正です');
        return '';
    };

    // インデックスが存在するかどうか
    if (index > tl.length - 1) {
        util.info('e', 'ツイートが存在しません');
        return '';
    };
    
    return tl[index].id_str;
};

/**
 * ツイートのインデックスからユーザーのスクリーンネームを取得
 * 
 * @param  {Array}   tl             タイムライン
 * @param  {*}       index          ツイートのインデックス/スクリーンネーム
 * @param  {Boolean} isGetRtUser    RTだった場合、RT元のユーザーを取得するか
 * @return {String}                 スクリーンネーム
 */
function getScreenName(tl, index, isGetRtUser) {
    // 数値以外の場合はそのまま返す
    if (isNaN(index)) return index;
    index = Number(index);

    // インデックスが存在するかどうか
    if (index > tl.length - 1) {
        util.info('e', 'ツイートが存在しません');
        return '';
    };

    // RTの場合はRT元のスクリーンネームを返す
    const tweet = tl[index];
    return (isGetRtUser && tweet.retweeted_status) ? tweet.retweeted_status.user.screen_name : tweet.user.screen_name;
};

/**
 * ツイートのURLを表示
 * 
 * @param {Array}  tl    タイムライン
 * @param {Number} index ツイートのインデックス
 */
function createURL(tl, index) {
    const screenName = getScreenName(tl, index, false);

    // ツイートIDを取得
    const tweetId = getTweetId(tl, index);
    if (!screenName || !tweetId) return;

    util.info(chalk.black.bgHex(color.sys.info)(' URL '), `https://twitter.com/${screenName}/status/${tweetId}`);
};

module.exports = {
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
    getScreenName,
    createURL
};
