'use strct';

const twitter = require('twitter');
const dotenv = require('dotenv');

// .envから読み込み
dotenv.config();

// 認証情報
const client = new twitter({
    consumer_key: `${process.env.CONSUMER_KEY}`,
    consumer_secret: `${process.env.CONSUMER_SECRET}`,
    access_token_key: `${process.env.ACCESS_TOKEN}`,
    access_token_secret: `${process.env.ACCESS_TOKEN_SECRET}`
});

const params = {screen_name: 'nodejs'};
client.get('statuses/user_timeline', params, function(err, tweets, res) {
    if (!err) {
        console.log(tweets);
    };
});
