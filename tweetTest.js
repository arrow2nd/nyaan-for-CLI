'use strct';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Twitter = require('twitter');

dotenv.config();

// 認証情報
const client = new Twitter({
    consumer_key: `${process.env.CONSUMER_KEY}`,
    consumer_secret: `${process.env.CONSUMER_SECRET}`,
    access_token_key: `${process.env.ACCESS_TOKEN}`,
    access_token_secret: `${process.env.ACCESS_TOKEN_SECRET}`
});

/*
tweetPost('明日は表示周りを実験したい', [])
    .catch((err) => {console.error(err)});
 */ 

//showTimeline(10);
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
    if (paths.length > 3) {
        throw new Error('添付画像は4枚までです');
    } else if (paths.length){
        for (filePath of paths){
            // 画像があるか確認
            try {
                fs.statSync(filePath);
            } catch(err) {
                throw new Error('ファイルが見つかりません');
            };
            // 拡張子を確認
            const ext = path.extname(filePath).toLowerCase();
            if (ext == '.jpg' || ext == '.jpeg' || ext == '.png' || ext == '.gif'){
                const file = fs.readFileSync(filePath);
                const media = await client.post('media/upload', {media: file});
                mediaIds += media.media_id_string + ',';
            } else {
                throw new Error('未対応の拡張子です');
            };
        };
        status['media_ids'] = mediaIds;
    };

    console.log(status);

    // ツイートする
    client.post('statuses/update', status, (err, tweet, res) => {
        if (!err) {
            console.log(`ツイートしました！: ${tweetText}`);
        } else {
            throw new Error('ツイートに失敗しました');
        };
    });
};

/**
 * 特定ユーザーの投稿（TL）を取得
 * @param {String} userName ＠から始まるユーザーID
 * @param {Number} count    取得件数（最大200件）
 */
function showUserTimeline(userName, count){
    client.get('statuses/user_timeline', { screen_name: userName, count: count }, (err, tweets, res) => {
        if (!err) {
            console.log(tweets);
        } else {
            console.error(err);
        };
    });
};

/**
 * TLを取得
 * @param {Number} count 取得件数（最大200件）
 */
function showTimeline(count){
    client.get('statuses/home_timeline', {count: count}, (err, tweets, res) => {
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
