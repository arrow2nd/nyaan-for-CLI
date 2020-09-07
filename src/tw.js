'use strict';
const chalk = require('chalk');
const moment = require('moment');
const eaw = require('eastasianwidth');
const util = require('./util.js');
const color = require('../config/color.json');

/**
 * ユーザーのプロフィールを表示
 * @param {Object} user        ユーザーオブジェクト
 * @param {Object} connections ユーザーとの関係情報
 */
function showUserInfo(user, connections) {
    // 画面幅
    const width = process.stdout.columns;
    // ユーザー名・ID
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
    follow = (connections.followed_by) ? `${follow} ${chalk.hex('#2196F3')('[followed by]')}` : follow;
    // フォロワー数とフォローしているか
    let follower = user.followers_count;
    follower = (connections.following) ? `${follower} ${chalk.hex('#2196F3')('[following]')}` : follower;
    // ブロック・ミュート状況
    if (connections.blocking) follower += chalk.redBright.bold(' [blocking]');
    if (connections.muting)   follower += chalk.yellowBright.bold(' [muting]');
    // ツイート数
    const tweetCount = `${user.statuses_count} tweets`;

    // 表示
    console.log(`\n  ${userName}  ${chalk.hex(color.ui.tweet)(tweetCount)}\n`);
    console.log(`      desc: ${description}`);
    console.log(`    locate: ${location}`);
    console.log(`       URL: ${url}`);
    console.log(`    follow: ${follow}`);
    console.log(`  follower: ${follower}`);
    console.log(' '.repeat(width - createdAt.length) + chalk.hex(color.ui.accent)(createdAt));
    util.drawHr(false);
};

/**
 * ツイートを表示
 * @param {Number} idx   インデックス
 * @param {Object} tweet ツイートオブジェクト
 */
function showTweet(idx, tweet) {
    if (!tweet) return;
    const isQT = (idx == null) ? true : false;

    // RTだった場合RT元のツイートに置き換える
    let rtByUser;
    if (tweet.retweeted_status) {
        rtByUser = chalk.hex(color.ui.rt)(`RT by ${util.optimizeText(tweet.user.name)} (@${tweet.user.screen_name})`);
        tweet = tweet.retweeted_status;
    };

    // 表示内容を作成
    const rpToUser = tweet.in_reply_to_screen_name;
    const index    = (isQT) ? '' : chalk.black.bgHex(color.ui.accent)(` ${idx} `);
    const header   = index + ' ' + createHeader(tweet.user);
    const postText = formatTweet(tweet);
    const fotter   = createFotter(tweet);

    // RT by
    if (rtByUser) console.log((isQT ? ' ' : '') + rtByUser);
    // Reply to
    if (rpToUser) console.log((isQT ? ' ' : '') + chalk.hex(color.ui.reply)(`Reply to @${rpToUser}`));
    // ツイートを表示
    console.log(header + '\n');
    console.log(postText);
    console.log(fotter);
    // 引用リツイート
    if (tweet.is_quote_status && tweet.quoted_status) {
        util.drawHr(true);
        showTweet(null, tweet.quoted_status);
    };
};

/**
 * ツイートをまとめて表示
 * @param {Array} tweets ツイートオブジェクト
 */
function showTweets(tweets) {
    util.drawHr(false);
    for (let i = tweets.length - 1; i >= 0; i--) {
        const tweet = tweets[i]; 
        showTweet(i, tweet);
        util.drawHr(false);
    };
};

/**
 * ヘッダーを作成
 * @param  {Object} tweet ユーザーオブジェクト
 * @return {String}       ヘッダー
 */
function createHeader(user) {
    // ユーザー情報
    const userName = chalk.whiteBright.bold(util.optimizeText(user.name));
    const userId = chalk.hex('#9E9E9E')(` (@${user.screen_name})`);
    let badge = '';
    // 公式アカウント
    if (user.verified)  badge += chalk.hex(color.ui.verified)(' [verified]');
    // 鍵アカウント
    if (user.protected) badge += chalk.hex(color.ui.private)(' [private]');

    const header = userName + userId + badge;
    return header;
};

/**
 * ツイート内容を整形
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
            const regex = new RegExp(`@${text}|＠${text}`, 'g');
            result = result.replace(regex, chalk.hex(color.ui.reply)(`@${text}`));
        };
    };
    // ハッシュタグをハイライト (途中で改行されると無力)
    let hashtags = tweet.entities.hashtags;
    if (hashtags) {
        hashtags = util.sortTag(hashtags, 'text');
        for (let tag of hashtags) {
            const text = tag.text;
            const regex = new RegExp(`#${text}|＃${text}`, 'g');
            result = result.replace(regex, chalk.hex(color.ui.hash)(`#${text}`));
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
        favText = `fav ${favCount}`;
        textCount += favText.length + 1;
        favText = (tweet.favorited) ? ' ' + chalk.black.bgHex(color.ui.fav)(favText) : ' ' + chalk.hex(color.ui.fav)(favText);
    };
    // RT
    const rtCount = tweet.retweet_count;
    let rtText = '';
    if (rtCount) {
        rtText = `RT ${rtCount}`;
        textCount += rtText.length + 1;
        rtText = (tweet.retweeted) ? ' ' + chalk.black.bgHex(color.ui.rt)(rtText) : ' ' + chalk.hex(color.ui.rt)(rtText);
    };

    // via
    const start = tweet.source.indexOf('>') + 1;
    const end = tweet.source.indexOf('</a>');
    let via = `via ${tweet.source.slice(start, end)}  `;
    textCount += eaw.length(via);
    via = chalk.hex(color.ui.via)(via);

    // 投稿時刻
    let postTime = `${moment(new Date(tweet.created_at)).format('YYYY/MM/DD HH:mm:ss')} `;
    textCount += postTime.length;
    postTime = chalk.hex(color.ui.accent)(postTime);

    const fotter = `${favText}${rtText}` + ' '.repeat(width - textCount) + via + postTime;
    return fotter;
};

module.exports = {
    showTweets,
    showUserInfo
};
