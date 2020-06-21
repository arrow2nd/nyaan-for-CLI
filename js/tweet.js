'use strct';
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const colors = require('colors');
const moment = require('moment');
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
 * @param {String} mediaPaths    添付する画像のパス(複数ある場合はカンマ区切り)
 * @param {String} replyToPostId リプライ先の投稿ID
 */
async function tweetPost(tweetText, mediaPaths, replyToPostId){
    let status = {};
    let mediaIds = '';
    let uploads = '';
    let action = 'ツイート';

    // テキストを追加
    status.status = tweetText;
    // リプライ
    if (replyToPostId){
        action = 'リプライ';
        status.in_reply_to_status_id = replyToPostId;
        status.auto_populate_reply_metadata = true;
    };
    // 画像があればアップロードする
    if (mediaPaths){
        const paths = mediaPaths.split(',');
        const pathLength = (paths.length > 4) ? 4 : paths.length;
        for (let i = 0; i < pathLength; i++){
            const filePath = paths[i].trim();
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
                // アップロード
                let media;
                try {
                    media = await client.post('media/upload', {media: file});
                } catch(err) {
                    console.error(`アップロードに失敗しました(${filePath})`.brightRed);
                    continue;
                };
                mediaIds += media.media_id_string + ',';
                uploads += filePath + ' ';
            } else {
                console.error(`未対応の拡張子です(${ext})`.brightRed);
                continue;
            };
        };
        status.media_ids = mediaIds;
    };
    // ツイートする
    const tweet = await client.post('statuses/update', status).catch(err => {
        util.showAPIErrorMsg(err);
    });
    if (tweet){
        console.log(`${action}しました！: `.cyan + tweet.text);
        if (mediaPaths){
            console.log('添付画像: '.cyan + uploads);
        };
    };
};

/**
 * ツイートを削除する
 * @param {String} tweetId ツイートID
 */
async function deleteTweet(tweetId){
    const tweet = await client.post(`statuses/destroy/${tweetId}`, {id: tweetId}).catch(err => {
        util.showAPIErrorMsg(err);
    });
    if (tweet){
        const width = process.stdout.columns - 20;
        const text = util.strCat(util.optimizeText(tweet.text), 0, width, 1);
        console.log('削除しました！: '.cyan + text);
    };
};

/**
 * いいねの操作
 * @param {String}  tweetId ツイートID
 * @param {Boolean} mode    0:いいね 1:取り消す
 */
async function favorite(tweetId, mode){
    const type = ['create', 'destroy'];
    const tweet = await client.post(`favorites/${type[mode]}`, {id: tweetId}).catch(err => {
        util.showAPIErrorMsg(err);
    });
    if (tweet){
        const msg = (mode) ? 'いいねを取り消しました！: ' : 'いいねしました！: ';
        const width = process.stdout.columns - util.getStrWidth(msg) - 4;
        const text = util.strCat(util.optimizeText(tweet.text), 0, width, 1);
        console.log(msg.cyan + text);
    };
};

/**
 * リツイートの操作
 * @param {String}  tweetId ツイートID
 * @param {Boolean} mode    0:リツイート 1:取り消す
 */
async function retweet(tweetId, mode){
    const type = ['retweet', 'unretweet'];
    const tweet = await client.post(`statuses/${type[mode]}/${tweetId}`, {id: tweetId}).catch(err => {
        util.showAPIErrorMsg(err);
    });
    if (tweet){
        const msg = (mode) ? 'リツイートを取り消しました！: ' : 'リツイートしました！: ';
        const width = process.stdout.columns - util.getStrWidth(msg) - 4;
        const text = util.strCat(util.optimizeText(tweet.text), 0, width, 1);
        console.log(msg.cyan + text);
    };
};

/**
 * タイムラインを取得する
 * @param  {Number} count 取得件数（最大200件）
 * @return {Array}        取得したツイート
 */
async function getTimeline(count){
    const param = {
        count: count,
        exclude_replies: true,
    };
    const tweets = await client.get('statuses/home_timeline', param).catch(err => {
        util.showAPIErrorMsg(err);
    });
    if (tweets) {
        showTweet(tweets);
    };
    return tweets;
};

/**
 * ユーザーのプロフィールと投稿を取得する
 * @param  {String} userName ユーザーID(空にすると自分の投稿を取得)
 * @param  {Number} count    取得件数（最大200件）
 * @return {Array}           取得したツイート
 */
async function getUserTimeline(userName, count){
    let param = {
        count: count
    };
    // ユーザーIDがあれば追加する
    if (userName){
        userName = userName.replace(/@|＠/, '');
        param.screen_name = '@' + userName;
    };
    const tweets = await client.get('statuses/user_timeline', param).catch(err => {
        util.showAPIErrorMsg(err);
    });
    if (tweets){
        // 対象ユーザーと自分との関係を取得
        const connections = await getUserLookup(tweets[0].user.id_str).catch(err => {console.error(err)});
        // ツイートを表示
        showTweet(tweets);
        // プロフィールを表示
        showUserInfo(tweets[0].user, connections);
    };
    return tweets;
};

/**
 * 対象のユーザーと自分との関係を取得
 * @param  {String} userId ユーザーID
 * @return {Object}        対象ユーザーとの関係
 */
async function getUserLookup(userId){
    const lookup = await client.get('friendships/lookup', {user_id: userId}).catch(err => {
        util.showAPIErrorMsg(err);
        throw(err);
    });
    // ユーザーとの関係
    let connections = {};
    for (let connection of lookup[0].connections){
        connections[connection] = true;
    };
    return connections;
};

/**
 * キーワードからツイートを検索する
 * @param  {String} query 検索キーワード
 * @param  {Number} count 取得件数（最大200件）
 * @return {Array}        取得したツイート
 */
async function searchTweet(query, count){
    const tweets = await client.get('search/tweets', {q: `${query}  exclude:retweets`, count: count}).catch(err => {
        util.showAPIErrorMsg(err);
    });
    if (tweets){
        showTweet(tweets.statuses);
    };
    return tweets;
};

/**
 * ツイートのインデックスからIDを取得する
 * @param  {Array}  tweets ツイートオブジェクト
 * @param  {Number} index  ツイートのインデックス
 * @return {String}        ツイートID
 */
function getTweetId(tweets, index){
    if (!index){
        console.error('Error: インデックスが指定されていません'.brightRed);
        return;
    } else if (index > tweets.length - 1){
        console.error('Error: ツイートが存在しません'.brightRed);
        return '';
    };
    return tweets[index].id_str;
};

/**
 * ツイートのインデックスからユーザーのスクリーンネームを取得する
 * @param  {Object} tweets ツイートオブジェクト
 * @param  {Number} index  ツイートのインデックス
 * @return {String}        スクリーンネーム
 */
function getUserId(tweets, index){
    // RTの場合はRT元のスクリーンネーム
    if (tweets[index].retweeted_status){
        return tweets[index].retweeted_status.user.screen_name;
    } else {
        return tweets[index].user.screen_name;
    };
};


/**
 * ユーザーのプロフィールを表示
 * @param {Object} user        ユーザーオブジェクト
 * @param {Object} connections ユーザーとの関係情報
 */
function showUserInfo(user, connections){
    const width = process.stdout.columns;

    // ユーザー名・ユーザーID
    const userName = createHeader(user);
    // 場所
    const location = util.optimizeText(user.location);
    // 説明
    let description = util.optimizeText(user.description);
    description = util.insert(description, (width - 14), '\n            ');
    // URL
    const url = user.url;
    // アカウント作成日
    let createdAt = moment(new Date(user.created_at)).format('YYYY/MM/DD HH:mm:ss');
    createdAt =  `  created at ${createdAt}`;
    // フォロー数とフォローされているか
    let follow = user.friends_count;
    follow = (connections.followed_by) ? `${follow} ${'[followed by]'.cyan}` : follow;
    // フォロワー数とフォローしているか
    let follower = user.followers_count;
    follower = (connections.following) ? `${follower} ${'[following]'.cyan}` : follower;
    // ブロック・ミュート状況
    if (connections.blocking){
        follower += ' [blocking]'.red;
    };
    if (connections.muting){
        follower += ' [muting]'.yellow;
    };
    // ツイート数
    const tweetCount = `${user.statuses_count} tweets`;

    // 表示する
    console.log(`${'='.repeat(width)}\n`.rainbow);
    console.log(`  ${userName}  ${tweetCount.brightCyan}\n`);
    console.log(`      desc: ${description}`);
    console.log(`    locate: ${location}`);
    console.log(`       URL: ${url}`);
    console.log(`    follow: ${follow}`);
    console.log(`  follower: ${follower}`);
    console.log(' '.repeat(width - createdAt.length) + createdAt.brightBlue);
    console.log(`${'='.repeat(width)}`.rainbow);
};

/**
 * ツイートを表示
 * @param {Array} tweets ツイートオブジェクト
 */
function showTweet(tweets){
    const width = process.stdout.columns;
    const hr = '-'.repeat(width);
    console.log(hr);

    for (let i = tweets.length - 1;i >= 0;i--){
        let tweet = tweets[i];
        // 公式RTだった場合、RT元のツイートに置き換える
        let rtByUser;
        if (tweet.retweeted_status){
            rtByUser = `RT by ${util.optimizeText(tweet.user.name)} (@${tweet.user.screen_name})`;
            tweet = tweet.retweeted_status;
        };
        // ヘッダー
        const index = ` ${i}:`.brightWhite.bgBrightBlue;
        const header = index + ' ' + createHeader(tweet.user);
        // 投稿内容
        const postText = createTweet(tweet);
        // フッター
        const fotter = createFotter(tweet);

        // リプライだった場合の表示
        let rpToUser = tweet.in_reply_to_screen_name;
        if (rpToUser){
            console.log(`Reply to @${rpToUser}`.brightGreen);
        };
        // ツイートを表示
        if (rtByUser){
            console.log(rtByUser.green);
        };
        console.log(header + '\n');
        console.log(postText);
        console.log(fotter);
        console.log(hr);
    };
};

/**
 * ヘッダーを作成
 * @param  {Object} tweet ユーザーオブジェクト
 * @return {String}       ヘッダー
 */
function createHeader(user){
    // ユーザー情報
    const userName = util.optimizeText(user.name);
    const userId = `  @${user.screen_name}`;
    // 公式・鍵アカウント
    const badge = (
          (user.verified) ? ' [verified]'.cyan
        : (user.protected) ? ' [private]'.gray
        : ''
    );
    // ヘッダー
    const header = userName.bold.underline + userId.dim + badge;
    return header;
};

/**
 * ツイート内容を見やすい形に成形する
 * @param  {Object} tweet ツイートオブジェクト
 * @return {String}       ツイート内容
 */
function createTweet(tweet){
    const width = process.stdout.columns;
    const post = tweet.text;
    let result = '';
    // 改行で分割
    let posts = post.split('\n');
    for (text of posts){
        // 一行に収まらない場合、折り返す
        text = util.optimizeText(text);
        text = '  ' + util.insert(text, (width - 4), '\n  ');
        result += text + '\n';
    };
    // メンションをハイライト (途中で改行されると無力)
    let mentions = tweet.entities.user_mentions;
    if (mentions){
        mentions = util.sortTag(mentions, 'screen_name');
        for (let mention of mentions){
            const text = mention.screen_name;
            result = result.replace(`@${text}`, '@'.brightGreen + text.brightGreen);
        };
    };
    // ハッシュタグをハイライト (途中で改行されると無力)
    let hashtags = tweet.entities.hashtags;
    if (hashtags){
        hashtags = util.sortTag(hashtags, 'text');
        for (let tag of hashtags){
            const text = tag.text;
            result = result.replace(`#${text}`, '#'.brightCyan + text.brightCyan);
        };
    };
    return result;
};

/**
 * フッターを作成
 * @param  {Object} tweet ツイートオブジェクト
 * @return {String}       フッター
 */
function createFotter(tweet){
    const width = process.stdout.columns;
    let textCount = 0;
    // いいね
    const favCount = tweet.favorite_count;
    let favText = '';
    if (favCount){
        favText = `fav: ${favCount}`;
        textCount += favText.length + 1;
        favText = (tweet.favorited) ? `${favText.black.bgBrightMagenta} ` : `${favText.brightMagenta} `;
    };
    // RT
    const rtCount = tweet.retweet_count;
    let rtText = '';
    if (rtCount){
        rtText = `RT: ${rtCount}`;
        textCount += rtText.length + 2;
        rtText = (tweet.retweeted) ? ` ${rtText.black.bgBrightGreen} ` : ` ${rtText.brightGreen} `;
    };
    // いいねとRT情報
    const impression = (textCount) ? ' '.repeat(width - textCount) + `${favText}${rtText}\n` : '';

    // via
    const start = tweet.source.indexOf('>') + 1;
    const end = tweet.source.indexOf('</a>');
    let via = `via ${tweet.source.slice(start, end)} `;
    // フッター
    const postTime = `${moment(new Date(tweet.created_at)).format('YYYY/MM/DD HH:mm:ss')}  `;
    textCount = postTime.length + util.getStrWidth(via);
    const fotter = ' '.repeat(width - textCount) + postTime.cyan + via.brightBlue;
    return impression + fotter;
};

module.exports = {
    tweetPost,
    deleteTweet,
    favorite,
    retweet,
    getTimeline,
    getUserTimeline,
    getTweetId,
    getUserId,
    searchTweet
};
