'use strict';
const colors = require('colors');
const moment = require('moment');
const util = require('./util.js');


/**
 * ユーザーのプロフィールを表示
 * @param {Object} user        ユーザーオブジェクト
 * @param {Object} connections ユーザーとの関係情報
 */
function showUserInfo(user, connections) {
    // 画面幅
    const width = process.stdout.columns;
    // ユーザー名・ユーザーID
    const userName = createHeader(user);1
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
    if (connections.blocking) {
        follower += ' [blocking]'.red;
    };
    if (connections.muting) {
        follower += ' [muting]'.yellow;
    };
    // ツイート数
    const tweetCount = `${user.statuses_count} tweets`;
    // 表示
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
function showTweet(tweets) {
    // 画面幅
    const width = process.stdout.columns;
    // 水平線
    const hr = '-'.repeat(width);
    console.log(hr);    
    // ツイートの解析
    for (let i = tweets.length - 1;i >= 0;i--) {
        let tweet = tweets[i];
        // RTだった場合、RT元のツイートに置き換える
        let rtByUser;
        if (tweet.retweeted_status) {
            rtByUser = `RT by ${util.optimizeText(tweet.user.name)} (@${tweet.user.screen_name})`;
            tweet = tweet.retweeted_status;
        };
        // 表示内容を作成
        const index = ` ${i} `.brightWhite.bgBrightBlue;
        const header = index + ' ' + createHeader(tweet.user);
        const postText = formatTweet(tweet);
        const fotter = createFotter(tweet);
        // RTの表示
        if (rtByUser) {
            console.log(rtByUser.green);
        };
        // リプライの表示
        let rpToUser = tweet.in_reply_to_screen_name;
        if (rpToUser) {
            console.log(`Reply to @${rpToUser}`.brightGreen);
        };
        // ツイートを表示
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
function createHeader(user) {
    // ユーザー情報
    const userName = util.optimizeText(user.name);
    const userId = `  @${user.screen_name}`;
    let badge = '';
    // 公式アカウント
    if (user.verified) {
        badge += ' [verified]'.cyan;
    };
    // 鍵アカウント
    if (user.protected) {
        badge += ' [private]'.gray;
    };
    // 連結
    const header = userName.bold + userId.dim + badge;
    return header;
};

/**
 * ツイート内容を整形する
 * @param  {Object} tweet ツイートオブジェクト
 * @return {String}       ツイート内容
 */
function formatTweet(tweet) {
    const width = process.stdout.columns;
    const post = tweet.text;
    let result = '';
    let posts = post.split('\n');
    // 一行に収まらない場合、折り返す
    for (let text of posts) {
        text = util.optimizeText(text);
        text = '  ' + util.insert(text, (width - 4), '\n  ');
        result += text + '\n';
    };
    // メンションをハイライト (途中で改行されると無力)
    let mentions = tweet.entities.user_mentions;
    if (mentions) {
        mentions = util.sortTag(mentions, 'screen_name');
        for (let mention of mentions) {
            const text = mention.screen_name;
            result = result.replace(`@${text}`, '@'.brightGreen + text.brightGreen);
        };
    };
    // ハッシュタグをハイライト (途中で改行されると無力)
    let hashtags = tweet.entities.hashtags;
    if (hashtags) {
        hashtags = util.sortTag(hashtags, 'text');
        for (let tag of hashtags) {
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
function createFotter(tweet) {
    const width = process.stdout.columns;
    let textCount = 0;
    // いいね
    const favCount = tweet.favorite_count;
    let favText = '';
    if (favCount) {
        favText = `fav: ${favCount}`;
        textCount += favText.length + 1;
        favText = (tweet.favorited) ? `${favText.black.bgBrightMagenta} ` : `${favText.brightMagenta} `;
    };
    // RT
    const rtCount = tweet.retweet_count;
    let rtText = '';
    if (rtCount) {
        rtText = `RT: ${rtCount}`;
        textCount += rtText.length + 2;
        rtText = (tweet.retweeted) ? ` ${rtText.black.bgBrightGreen} ` : ` ${rtText.brightGreen} `;
    };
    // いいねとRTを連結
    const impression = (textCount) ? ' '.repeat(width - textCount) + `${favText}${rtText}\n` : '';   
    // via
    const start = tweet.source.indexOf('>') + 1;
    const end = tweet.source.indexOf('</a>');
    let via = `via ${tweet.source.slice(start, end)}  `;
    // 投稿時刻とviaを連結
    const postTime = `Posted at ${moment(new Date(tweet.created_at)).format('YYYY/MM/DD HH:mm:ss')}`;
    textCount = postTime.length + util.getStrWidth(via);
    const fotter = ' '.repeat(width - textCount)  + via.gray + postTime.cyan;    
    return impression + fotter;
};

module.exports = {
    showTweet,
    showUserInfo
};
