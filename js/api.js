'use strict';
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const colors = require('colors');
const tw = require('./tw.js');
const util = require('./util.js');
const Twitter = require('twitter');


// 認証
dotenv.config({path: path.join(__dirname, "../.env")});
const client = new Twitter({
    consumer_key: `${process.env.CONSUMER_KEY}`,
    consumer_secret: `${process.env.CONSUMER_SECRET}`,
    access_token_key: `${process.env.ACCESS_TOKEN}`,
    access_token_secret: `${process.env.ACCESS_TOKEN_SECRET}`
});


/**
 * ツイートする
 * @param {String} tweetText     ツイート内容
 * @param {String} mediaPaths    添付する画像のパス(複数ある場合は,区切り)
 * @param {String} replyToPostId リプライ先の投稿ID
 */
async function tweetPost(tweetText, mediaPaths, replyToPostId) {
    let status = {};
    let action = 'Tweeted:';

    // テキストを追加
    status.status = tweetText;
    
    // リプライ
    if (replyToPostId) {
        action = 'Replied:';
        status.in_reply_to_status_id = replyToPostId;
        status.auto_populate_reply_metadata = true;
    };

    // 画像があればアップロードする
    if (mediaPaths) {
        status.media_ids = await upload(mediaPaths).catch(err => {
            util.showAPIErrorMsg(err);
        });
    };

    // ツイートする
    const tweet = await client.post('statuses/update', status).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // 完了メッセージ
    if (tweet) {
        console.log(action.bgBlue + ` ${tweet.text}`);
    };
};


/**
 * 画像をアップロードする
 * @param  {String} mediaPaths カンマで区切った画像のパス
 * @return {String}            メディアID
 */
async function upload(mediaPaths) {
    const paths = mediaPaths.split(',');
    const pathLength = (paths.length > 4) ? 4 : paths.length;
    let mediaIds = '';

    for (let i = 0; i < pathLength; i++) {
        const filePath = paths[i].trim();

        // 画像があるか確認
        try {
            fs.statSync(filePath);
        } catch(err) {
            console.error('Error:'.bgRed + ` ファイルが見つかりません (${filePath})`.brightRed);
            continue;
        };

        // 拡張子を確認
        const ext = path.extname(filePath).toLowerCase();
        if (ext == '.jpg' || ext == '.jpeg' || ext == '.png' || ext == '.gif') {
            const file = fs.readFileSync(filePath);

            // アップロード
            let media;
            try {
                media = await client.post('media/upload', {media: file});
            } catch(err) {
                console.error('Error:'.bgRed + `アップロードに失敗しました (${filePath})`.brightRed);
                continue;
            };

            mediaIds += media.media_id_string + ',';
            console.log('Success:'.bgGreen + ` アップロードしました！(${filePath})`.brightGreen);
        } else {
            console.error('Error:'.bgRed + ` 未対応の拡張子です (${ext})`.brightRed);
            continue;
        };
    };
    return mediaIds;
};


/**
 * ツイートを削除する
 * @param {String} tweetId ツイートID
 */
async function deleteTweet(tweetId) {
    const tweet = await client.post(`statuses/destroy/${tweetId}`, {id: tweetId}).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // 完了メッセージ
    if (tweet) {
        const width = process.stdout.columns - 20;
        const text = util.strCat(util.optimizeText(tweet.text), 0, width, 1);
        console.log('Deleted:'.bgBlue + ` ${text}`);
    };
};


/**
 * いいねの操作
 * @param {String}  tweetId   ツイートID
 * @param {Boolean} isRemoved 取り消すかどうか
 */
async function favorite(tweetId, isRemoved) {
    const type = ['create', 'destroy'];
    const tweet = await client.post(`favorites/${type[isRemoved]}`, {id: tweetId}).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // 完了メッセージ
    if (tweet) {
        const msg = (isRemoved) ? 'Un-liked:' : 'Liked:';
        const width = process.stdout.columns - msg.length - 3;
        const text = util.strCat(util.optimizeText(tweet.text), 0, width, 1);
        console.log(msg.bgBlue + ` ${text}`);
    };
};


/**
 * リツイートの操作
 * @param {String}  tweetId   ツイートID
 * @param {Boolean} isRemoved 取り消すかどうか
 */
async function retweet(tweetId, isRemoved) {
    const type = ['retweet', 'unretweet'];
    const tweet = await client.post(`statuses/${type[isRemoved]}/${tweetId}`, {id: tweetId}).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // 完了メッセージ
    if (tweet) {
        const msg = (isRemoved) ? 'Un-retweeted:' : 'Retweeted:';
        const width = process.stdout.columns - msg.length - 3;
        const text = util.strCat(util.optimizeText(tweet.text), 0, width, 1);
        console.log(msg.bgBlue + ` ${text}`);
    };
};


/**
 * フォローの操作
 * @param {String}  userId    ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved フォローを解除するかどうか
 */
async function follow(userId, isRemoved) {
    const type = ['create', 'destroy'];
    const user = await client.post(`friendships/${type[isRemoved]}`, {screen_name: userId}).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // 完了メッセージ
    if (user) {
        const msg = (isRemoved) ? 'Un-followed:' : 'Followed:';
        const width = process.stdout.columns - msg.length - 3;
        const text = util.strCat(util.optimizeText(user.name), 0, width, 1);
        console.log(msg.bgBlue + ` ${text}`);
    };
};


/**
 * ブロックの操作
 * @param {String}  userId    ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved 解除するかどうか
 */
async function block(userId, isRemoved) {
    const type = ['create', 'destroy'];
    const user = await client.post(`blocks/${type[isRemoved]}`, {screen_name: userId}).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // 完了メッセージ
    if (user) {
        const msg = (isRemoved) ? 'Un-blocked:' : 'Blocked:';
        const width = process.stdout.columns - msg.length - 3;
        const text = util.strCat(util.optimizeText(user.name), 0, width, 1);
        console.log(msg.bgBlue + ` ${text}`);
    };
};


/**
 * ミュートの操作
 * @param {String}  userId    ユーザーのスクリーンネーム
 * @param {Boolean} isRemoved 解除するかどうか
 */
async function mute(userId, isRemoved) {
    const type = ['create', 'destroy'];
    const user = await client.post(`mutes/users/${type[isRemoved]}`, {screen_name: userId}).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // 完了メッセージ
    if (user) {
        const msg = (isRemoved) ? 'Un-muted:' : 'Muted:';
        const width = process.stdout.columns - msg.length - 3;
        const text = util.strCat(util.optimizeText(user.name), 0, width, 1);
        console.log(msg.bgBlue + ` ${text}`);
    };
};


/**
 * タイムラインを取得して表示
 * @param  {Boolean} mode  メンション取得モード
 * @param  {Number}  count 取得件数（最大200件）
 * @return {Array}         取得したツイート
 */
async function getTimeline(mode, count) {
    const type = ['home_timeline', 'mentions_timeline'];
    let param = { count: count };

    // TL取得モード(mode:0)の場合は、リプライを含めない
    if (mode == 0) {
        param.exclude_replies = true;
    };

    // 取得
    const tweets = await client.get(`statuses/${type[mode]}`, param).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // データが無い場合
    if (!tweets.length) {
        console.log('Error:'.bgRed + ' データがありません');
        return [];
    };

    // 表示
    tw.showTweet(tweets);

    return tweets;
};


/**
 * ユーザータイムラインを表示して表示
 * @param  {String} userId ユーザーID(空にすると自分の投稿を取得)
 * @param  {Number} count  取得件数（最大200件）
 * @return {Array}         取得したツイート
 */
async function getUserTimeline(userId, count) {
    let param = { count: count };
    
    // ユーザーIDがあれば追加する
    if (userId) {
        param.screen_name = userId.replace(/@|＠/, '');
    };

    // 取得
    const tweets = await client.get('statuses/user_timeline', param).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // データが無い場合
    if (!tweets.length) {
        console.log('Info:'.bgRed + ' ユーザーがみつかりませんでした...');
        return [];
    };

    // 対象ユーザーと自分との関係を取得
    const connections = await getUserLookup(tweets[0].user.id_str).catch(err => console.error(err));
    // ツイートを表示
    tw.showTweet(tweets);
    // プロフィールを表示
    tw.showUserInfo(tweets[0].user, connections);

    return tweets;
};


/**
 * 対象のユーザーと自分との関係を取得
 * @param  {String} userId ユーザーID
 * @return {Object}        対象ユーザーとの関係
 */
async function getUserLookup(userId) {
    let connections = {};

    // 取得
    const lookup = await client.get('friendships/lookup', {user_id: userId}).catch(err => {
        util.showAPIErrorMsg(err);
    });

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
 * @param  {String} query 検索キーワード
 * @param  {Number} count 取得件数（最大100件）
 * @return {Array}        取得したツイート
 */
async function searchTweet(query, count) {
    // 検索
    const tweets = await client.get('search/tweets', {q: `${query}  exclude:retweets`, count: count}).catch(err => {
        util.showAPIErrorMsg(err);
    });

    // データが無い場合
    if (!tweets.length) {
        console.log('Info:'.bgRed + ' みつかりませんでした...');
        return [];
    };

    // 表示
    tw.showTweet(tweets.statuses);

    return tweets;
};


/**
 * ツイートのインデックスからIDを取得する
 * @param  {Array}  tl    タイムライン
 * @param  {Number} index ツイートのインデックス
 * @return {String}       ツイートID
 */
function getTweetId(tl, index) {
    // エラーチェック
    if (isNaN(index)) {
        console.error('Error:'.bgRed + ' インデックスが不正です'.brightRed);
        return '';
    };
    if (index > tl.length - 1) {
        console.error('Error:'.bgRed + ' ツイートが存在しません'.brightRed);
        return '';
    };

    return tl[index].id_str;
};


/**
 * ツイートのインデックスからユーザーのスクリーンネームを取得する
 * @param  {Array}   tl    タイムライン
 * @param  {Number}  index ツイートのインデックス
 * @param  {Boolean} mode  RTだった場合、RT元のユーザーを取得する
 * @return {String}        スクリーンネーム
 */
function getUserId(tl, index, mode) {
    // エラーチェック
    if (isNaN(index)) {
        console.error('Error:'.bgRed + ' インデックスが不正です'.brightRed);
        return '';
    };
    if (index > tl.length - 1) {
        console.error('Error:'.bgRed + ' ツイートが存在しません'.brightRed);
        return '';
    };

    // RTの場合はRT元のスクリーンネームを返す
    return (mode ==1 && tl[index].retweeted_status) ? tl[index].retweeted_status.user.screen_name : tl[index].user.screen_name;
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
    getUserId
};
