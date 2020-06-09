'use strct';

const Twitter = require('twitter');
const dotenv = require('dotenv');

// .envから読み込み
dotenv.config();

// 認証情報
const client = new Twitter({
    consumer_key: `${process.env.CONSUMER_KEY}`,
    consumer_secret: `${process.env.CONSUMER_SECRET}`,
    access_token_key: `${process.env.ACCESS_TOKEN}`,
    access_token_secret: `${process.env.ACCESS_TOKEN_SECRET}`
});

//tweetPost('ツイートのテスト！！');
//showTimeline(10);
//showUserTimeline('@Arrow_0723_2nd', 2);
//searchTweet('#petitcom', 2);

/**
 * ツイートする
 * @param {String} tweetText ツイート内容
 */
function tweetPost(tweetText){
    client.post('statuses/update', {status: tweetText}, (err, tweet, res) => {
        if (!err) {
            console.log(`ツイートしました！: ${tweetText}`);
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
    client.get('statuses/user_timeline', {screen_name: userName, count: count}, (err, tweets, res) => {
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
