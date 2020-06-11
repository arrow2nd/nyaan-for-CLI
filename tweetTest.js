'use strct';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Twitter = require('twitter');
const colors = require('colors');
const moment = require('moment');

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

getTimeline(5);
//showUserTimeline('@Arrow_0723_2nd', 2);
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
    client.get('statuses/home_timeline', {count: count, exclude_replies: false}, (err, tweets, res) => {
        if (!err) {
            console.log(tweets);
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
function showUserTimeline(userName, count){
    const param = {
        screen_name: userName,
        count: count,
        exclude_replies: false
    };
    client.get('statuses/user_timeline', param, (err, tweets, res) => {
        if (!err) {
            console.log(tweets);
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

    // 末尾から読み込み
    for (let i = tweets.length - 1;i >= 0;i--){
        let tweet = tweets[i];
        let rtByUser;

        // 公式RTだった場合、RT元のツイートに置き換える
        if (tweet.retweeted_status){
            rtByUser = `${tweet.user.name} (@${tweet.user.screen_name})`;
            tweet = tweet.retweeted_status;
        };

        // ユーザー情報
        let user = `${tweet.user.name} (@${tweet.user.screen_name})`;
        // 鍵アカウント
        if (tweet.user.protected) {
            user += '[private]'.gray;
        };
        // 認証済みアカウント
        if (tweet.user.verified){
            user += '[verified]'.brightGreen;
        };

        // 投稿情報
        const postTime = moment(new Date(tweet.created_at)).format('YYYY/MM/DD HH:mm:ss');
        let text = tweet.text;
        const favCount = tweet.favorite_count;
        const rtCount = tweet.retweet_count;
        const favorited = tweet.favorited;
        const retweeted = tweet.retweeted;

        // via
        const start = tweet.source.indexOf('>') + 1;
        const end = tweet.source.indexOf('</a>');
        const via = tweet.source.slice(start, end);

        // 表示
        console.log(i);
        console.log(postTime);
        console.log(user);
        console.log(text);
        console.log(favCount);
        console.log(rtCount);
        console.log(favorited);
        console.log(retweeted);
        console.log(via);

        console.log(rtByUser);

        console.log('\n');
    };
};

/**
 * 文字列の表示幅を取得
 * @param  {String} text テキスト
 * @return {Number}      半角文字での表示幅
 */
function getStrWidth(text){
    let len = 0;
    for (let i = 0;i < text.length;i++){
        const value = text[i];
        if (!value.match(/[^\x01-\x7E]/) || !value.match(/[^\uFF65-\uFF9F]/)) {
            len ++;
        } else {
            len += 2;
        };
    };
    return len;
};
