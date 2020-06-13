'use strct';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Twitter = require('twitter');
const colors = require('colors');
const moment = require('moment');
const emoji = require('node-emoji');

dotenv.config();

// 認証情報
const client = new Twitter({
    consumer_key: `${process.env.CONSUMER_KEY}`,
    consumer_secret: `${process.env.CONSUMER_SECRET}`,
    access_token_key: `${process.env.ACCESS_TOKEN}`,
    access_token_secret: `${process.env.ACCESS_TOKEN_SECRET}`
});


//tweetPost('ツイート削除のテスト！\nすぐに消えるはず', []).catch((err) => {console.error(err)});
//getTimeline(20);
//getUserTimeline('Arrow_0723_2nd', 5);
//searchTweet('apple', 10);

//favorite('', 1);
//retweet('', 1);
//deleteTweet();

/**
 * ツイートする
 * @param {String} tweetText ツイート内容
 * @param {Array}  paths     添付する画像のパス
 */
async function tweetPost(tweetText, paths){
    let status = {};
    let mediaIds = '';

    // テキストを追加
    status.status = tweetText;

    // 画像があればアップロードする
    if (paths.length){
        if (paths.length > 4){
            throw new Error('添付画像は4枚までです');
        };
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
        status.media_ids = mediaIds;
    };

    // ツイートする
    client.post('statuses/update', status, (err, tweet, res) => {
        if (!err) {
            console.log(`ツイートしました！: ${tweetText}`.cyan);
        } else {
            showErrorMsg(err);
        };
    });
};

/**
 * いいねの操作
 * @param {String}  tweetId ツイートID
 * @param {Boolean} mode    0:いいね 1:取り消す
 */
function favorite(tweetId, mode){
    const type = ['create', 'destroy'];
    client.post(`favorites/${type[mode]}`, {id: tweetId}, (err, tweet, res) => {
        if (!err) {
            const msg = (mode) ? 'いいねを取り消しました！' : 'いいねしました！';
            console.log(msg.cyan);
        } else {
            showErrorMsg(err);
        };
    });
};

/**
 * リツイートの操作
 * @param {String}  tweetId ツイートID
 * @param {Boolean} mode    0:リツイート 1:取り消す
 */
function retweet(tweetId, mode){
    const type = ['retweet', 'unretweet'];
    client.post(`statuses/${type[mode]}/${tweetId}`, {id: tweetId}, (err, tweet, res) => {
        if (!err) {
            const msg = (mode) ? 'リツイートを取り消しました！' : 'リツイートしました！';
            console.log(msg.cyan);
        } else {
            showErrorMsg(err);
        };
    });
};

/**
 * ツイートを削除
 * @param {String} tweetId ツイートID
 */
function deleteTweet(tweetId){
    client.post(`statuses/destroy/${tweetId}`, {id: tweetId}, (err, tweet, res) => {
        if (!err) {
            console.log(`削除しました！: ${tweet.text}`.cyan);
        } else {
            showErrorMsg(err);
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
    };
    client.get('statuses/home_timeline', param, (err, tweets, res) => {
        if (!err) {
            showTweet(tweets);
        } else {
            showErrorMsg(err);
        };
    });
};

/**
 * 特定ユーザーの投稿（TL）を取得
 * @param {String} userName ユーザーID
 * @param {Number} count    取得件数（最大200件）
 */
function getUserTimeline(userName, count){
    const param = {
        screen_name: '@' + userName,
        count: count,
        exclude_replies: false
    };
    client.get('statuses/user_timeline', param, (err, tweets, res) => {
        if (!err) {
            showUserInfo(tweets[0].user);
            showTweet(tweets);
        } else {
            showErrorMsg(err);
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
            showTweet(tweets.statuses);
        } else {
            showErrorMsg(err);
        };
    });
};

/**
 * ツイートを表示
 * @param {Object} tweets ツイートオブジェクト
 */
function showTweet(tweets){
    const width = process.stdout.columns;
    process.stdout.write('-'.repeat(width) + '\n');

    for (let i = tweets.length - 1;i >= 0;i--){
        let tweet = tweets[i];

        // 公式RTだった場合、RT元のツイートに置き換える
        let rtByUser;
        if (tweet.retweeted_status){
            rtByUser = `RT by ${optimizeText(tweet.user.name)} (@${tweet.user.screen_name})`;
            tweet = tweet.retweeted_status;
        };

        // ヘッダー
        const header = ` ${i}:`.brightWhite.bgBrightBlue + ' ' + createHeader(tweet.user);

        // 投稿内容
        const postText = createTweet(tweet);

        // フッター
        const fotter = createFotter(tweet);

        // 表示する
        if (rtByUser){
            process.stdout.write(rtByUser.green + '\n');
        };
        process.stdout.write(header + '\n\n');
        process.stdout.write(postText + '\n');
        process.stdout.write(fotter + '\n');
        process.stdout.write('-'.repeat(width) + '\n');
    };
};

/**
 * ヘッダーを作成
 * @param  {Object} tweet ユーザーオブジェクト
 * @return {String}       ヘッダー
 */
function createHeader(user){
    // ユーザー情報
    const userName = optimizeText(user.name);
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
    // 見やすい形に成形
    for (text of posts){
        // 一行に収まらない場合、折り返す
        text = optimizeText(text);
        text = '  ' + insert(text, (width - 4), '\n  ');
        result += text + '\n';
    };
    //  メンションをハイライト (途中で改行されると無力)
    const mentions = tweet.entities.user_mentions;
    if (mentions){
        for (let mention of mentions){
            const mentionId = `@${mention.screen_name}`;
            result = result.replace(mentionId, mentionId.brightGreen);
        };
    };
    // ハッシュタグをハイライト (途中で改行されると無力)
    const hashtags = tweet.entities.hashtags;
    if (hashtags){
        for (let tag of hashtags){
            const tagText = `#${tag.text}`;
            result = result.replace(tagText, tagText.brightCyan);
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
        textCount += rtText.length + 1;
        rtText= (tweet.retweeted) ? `${rtText.black.bgBrightGreen} ` : `${rtText.brightGreen} `;
    };
    // via
    const start = tweet.source.indexOf('>') + 1;
    const end = tweet.source.indexOf('</a>');
    let via = `  via ${tweet.source.slice(start, end)}`;
    textCount += getStrWidth(via);
    // フッター
    let postTime = ` ${moment(new Date(tweet.created_at)).format('YYYY/MM/DD HH:mm:ss')}`;
    textCount += postTime.length;
    const fotter = ' '.repeat(width - textCount) + favText + rtText + postTime.cyan + via.brightBlue;
    return fotter;
};

/**
 * ユーザーのプロフィールを表示
 * @param {Object} user ユーザーオブジェクト
 */
function showUserInfo(user){
    const width = process.stdout.columns;

    // ユーザー名・ユーザーID
    const userName = createHeader(user);
    // 場所
    const location = optimizeText(user.location);
    // 説明
    let description = optimizeText(user.description);
    description = insert(description, (width - 14), '\n            ');
    // URL
    const url = user.url;
    // アカウント作成日
    let createdAt = moment(new Date(user.created_at)).format('YYYY/MM/DD HH:mm:ss');
    createdAt =  `  created at ${createdAt}`;
    // フォロー・フォロワー・ツイート数
    let follower = user.followers_count;
    const follow = user.friends_count;
    const tweetCount = `${user.statuses_count} tweets`;
    // フォロー中
    if (user.following){
        follower = `${follower} ${'[following]'.cyan}`;
    };

    // 表示する
    process.stdout.write(`${'='.repeat(width)}\n\n`.rainbow);
    process.stdout.write(`  ${userName}  ${tweetCount.brightCyan}\n\n`);
    process.stdout.write(`      desc: ${description}\n`);
    process.stdout.write(`    locate: ${location}\n`);
    process.stdout.write(`       URL: ${url}\n`);
    process.stdout.write(`    follow: ${follow}\n`);
    process.stdout.write(`  follower: ${follower}\n`);
    process.stdout.write(' '.repeat(width - createdAt.length) + createdAt.brightBlue + '\n');
    process.stdout.write(`${'='.repeat(width)}\n`.rainbow);
};

/**
 * 文字列の表示幅を取得
 * @param  {String} text テキスト
 * @return {Number}      全角文字を2とした文字列全体の表示幅
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

/**
 * 文字列に指定した間隔で文字を挿入（ちょっと怪しい）
 * @param  {String} text   文字列
 * @param  {Number} length 挿入する間隔（偶数推奨）
 * @param  {String} add    挿入する文字
 * @return {String}        編集後の文字列
 */
function insert(text, length, add){
    let index, len, start = 0;
    let result = '', rest = text;

    while (length < getStrWidth(rest)){
        // 文字の表示幅を考慮して範囲を切り出し
        for (index = start, len = length; len > 0; index++, len--){
            const value = text[index];
            if (!value){
                break;
            } else if (getStrWidth(value) == 2){
                len--;
            };
            result += value;
        };
        // 指定の文字を追加
        result += add;
        // 切り出し位置をズラす
        start = index;
        // 残り
        rest = text.slice(start);
    };

    // 残りの文字列を結合
    result += rest;
    return result;
};

/**
 * 文字列から全角スペース・改行・絵文字を取り除く
 * @param  {String} text 文字列
 * @return {String}      編集後の文字列
 */
function optimizeText(text){
    text = text.replace(/　/g, ' ');
    text = text.replace(/\n/g, ' ');
    text = emoji.strip(text);
    return text;
};

/**
 * エラー内容を表示
 * @param {Object} error エラーオブジェクト
 */
function showErrorMsg(error){
    const err = {
        32: '処理を完了できませんでした',
        34: '見つかりませんでした',
        64: 'アカウントが凍結されています',
        88: '読み込み回数の制限に達しました',
        130: '現在Twitterへのアクセスが集中しています',
        131: 'Twitter側で不明なエラーが発生しました',
        144: '該当するツイートが見つかりませんでした',
        161: 'フォローに失敗しました',
        179: 'ツイートを閲覧する権限がありません',
        185: '投稿回数の制限に達しました',
        187: 'ツイートが重複しています'
    };
    const code = error[0].code;
    let msg = err[code];
    if (!msg){
        msg = error[0].message;
    };
    console.log(`Error: ${msg}(${code})`.brightRed);
};
