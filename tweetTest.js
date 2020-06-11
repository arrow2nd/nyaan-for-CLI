'use strct';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Twitter = require('twitter');
const colors = require('colors');
const moment = require('moment');

const emoji = require('node-emoji');0

dotenv.config();

// 認証情報
const client = new Twitter({
    consumer_key: `${process.env.CONSUMER_KEY}`,
    consumer_secret: `${process.env.CONSUMER_SECRET}`,
    access_token_key: `${process.env.ACCESS_TOKEN}`,
    access_token_secret: `${process.env.ACCESS_TOKEN_SECRET}`
});

/*
tweetPost('変な天気', [])
    .catch((err) => {console.error(err)});
*/

getTimeline(10);
//getUserTimeline('@Arrow_0723_2nd', 10);
//searchTweet('#petitcom', 2);

/**
 * ツイートする
 * @param {String} tweetText ツイート内容
 * @param {Array}  paths     添付する画像のパス
 */
async function tweetPost(tweetText, paths){
    let status = {};
    let mediaIds = '';

    // テキストを追加
    status['status'] = tweetText;

    // 画像があればアップロードする
    if (paths.length > 4) {
        throw new Error('添付画像は4枚までです');
    } else if (paths.length){
        for (filePath of paths){
            // 画像があるか確認
            try {
                fs.statSync(filePath);
            } catch(err) {
                console.error(`ファイルが見つかりません(${filePath})`.brightRed);
                continue;
            };
            // 拡張子を確認
            const ext = path.extname(filePath).toLowerCase();
            if (ext == '.jpg' || ext == '.jpeg' || ext == '.png' || ext == '.gif'){
                const file = fs.readFileSync(filePath);
                let media;
                // アップロード
                try {
                    media = await client.post('media/upload', {media: file});
                } catch(err) {
                    console.error(`アップロードに失敗しました(${filePath})`.brightRed);
                    continue;
                };
                mediaIds += media.media_id_string + ',';
            } else {
                console.error(`未対応の拡張子です(${ext})`.brightRed);
                continue;
            };
        };
        status['media_ids'] = mediaIds;
    };

    console.log(status);

    // ツイートする
    client.post('statuses/update', status, (err, tweet, res) => {
        if (!err) {
            console.log(`ツイートしました！: ${tweetText}`.cyan);
        } else {
            throw new Error('ツイートに失敗しました');
        };
    });
};

/**
 * TLを取得
 * @param {Number} count 取得件数（最大200件）
 */
function getTimeline(count){
    const param = {
        count: count,
        exclude_replies: false,
        include_rts: false
    };
    client.get('statuses/home_timeline', param, (err, tweets, res) => {
        if (!err) {
//            console.log(tweets);
            showTweet(tweets);
        } else {
            console.error(err);
        };
    });
};

/**
 * 特定ユーザーの投稿（TL）を取得
 * @param {String} userName ＠から始まるユーザーID
 * @param {Number} count    取得件数（最大200件）
 */
function getUserTimeline(userName, count){
    const param = {
        screen_name: userName,
        count: count,
        exclude_replies: false
    };
    client.get('statuses/user_timeline', param, (err, tweets, res) => {
        if (!err) {
//            console.log(tweets);
            showTweet(tweets);
        } else {
            console.error(err);
        };
    });
};

/**
 * キーワードからツイートを検索
 * @param {String} query 検索キーワード
 * @param {Number} count 取得件数（最大200件）
 */
function searchTweet(query, count){
    client.get('search/tweets', {q: query + ' exclude:retweets', count: count}, (err, tweets, res) => {
        if (!err){
            console.log(tweets);
        } else {
            console.error(err);
        };
    });
};

/**
 * ツイートを表示
 * @param {Object} tweets ツイートオブジェクト
 */
function showTweet(tweets){
    const width = process.stdout.columns;
    for (let i = tweets.length - 1;i >= 0;i--){
        let tweet = tweets[i];
        let rtByUser;

        // 公式RTだった場合、RT元のツイートに置き換える
        if (tweet.retweeted_status){
            rtByUser = `RT by ${emoji.strip(tweet.user.name)} (@${tweet.user.screen_name})`;
            tweet = tweet.retweeted_status;
        };

        // ユーザー情報
        let user = `${emoji.strip(tweet.user.name)} (@${tweet.user.screen_name})`;
        // 認証済みアカウント
        if (tweet.user.verified){
            user += '[verified]'.brightGreen;
        };
        // 鍵アカウント
        if (tweet.user.protected) { 
            user += '[private]'.gray;
        };
        // ヘッダー
        const postTime = moment(new Date(tweet.created_at)).format('YYYY/MM/DD HH:mm:ss');
        const header = user + '  ' + postTime;

        // 投稿内容
        let postText = emoji.strip(tweet.text);
        // ハッシュタグをハイライト
        const hashtags = tweet.entities.hashtags;
        if (hashtags){
            for (let tag of hashtags){
                const tagText = `#${tag.text}`;
                postText = postText.replace(tagText, tagText.brightCyan);
            };
        };

        // いいね＆リツイート
        const favCount = tweet.favorite_count;
        const favText = `fav: ${favCount}`;
//        const favText = (tweet.favorited) ? `fav: ${favCount}`.brightMagenta : `fav: ${favCount}`;
        const rtCount = tweet.retweet_count;
        const rtText = `RT: ${rtCount}`;
//        const rtText = (tweet.retweeted) ? `RT: ${rtCount}`.bgBrightBlue : `RT: ${rtCount}`;
        const reaction = `${favText}  ${rtText}`;

        // via
        const start = tweet.source.indexOf('>') + 1;
        const end = tweet.source.indexOf('</a>');
        const detals = `${reaction}  via ${tweet.source.slice(start, end)}`;
        const fotter = ' '.repeat(width - getStrWidth(detals)) + detals;

        // 表示
        const index = `[index: ${i}]`;
        process.stdout.write(index + '-'.repeat(width - index.length) + '\n');
        if (rtByUser){
            process.stdout.write(rtByUser.green + '\n');
        };
        process.stdout.write(header.brightGreen + '\n\n');
        process.stdout.write(postText + '\n');
        process.stdout.write(fotter + '\n');
    };
};

/**
 * 文字列の表示幅を取得
 * @param  {String} text テキスト
 * @return {Number}      半角文字での表示幅
 */
function getStrWidth(text){
    let len = 0;
    for (let value of text){
        if (!value.match(/[^\x01-\x7E]/) || !value.match(/[^\uFF65-\uFF9F]/)) {
            len ++;
        } else {
            len += 2;
        };
    };
    return len;
};
