#!/usr/bin/env node
'use strict';
const program = require('commander');
const colors = require('colors');
const packageJson = require("../package.json");
const api = require('./api.js');
const util = require('./util.js');
let displayingTweets = [];  // 表示中のツイート


/**
 * ツイート/リプライ
 * @param {String} tweetId リプライ先のツイートID
 * @param {String} text    ツイート文
 * @param {Array}  options コマンドのオプション
 */
async function tweet(tweetId, text, options) {
    const path = options.media || '';
    // 空の場合にゃーんに置き換える
    text = (!text && !path) ? 'にゃーん' : text;
    // ツイート
    await api.tweetPost(text, path, tweetId).catch(err => console.error(err));
    // プロパティを削除
    delete options.media;
};

/**
 * スクリーンネームを取得
 * @param {*}       userId         スクリーンネームもしくはツイートのインデックス
 * @param {Boolean} hasModifyValue 無効な値を0に修正するか
 */
function getScreenName(userId, hasModifyValue) {
    // 無効な値を0に修正
    userId = (!hasModifyValue || userId) ? userId : '0';
    // インデックスが指定されている場合、対象ツイートのスクリーンネームに置き換える
    if (!isNaN(userId)) {
        userId = api.getUserId(displayingTweets, Number(userId), 0);
    };

    return userId;
};

/**
 * 対話モード（無理矢理）
 */
async function interactive() {
    let array = '';
    
    // タイムライン表示
    displayingTweets = await api.getTimeline(0, 20).catch(err => console.error(err));
    
    while (1) {
        // 入力を待つ
        array = await util.readlineSync().catch(err => console.error(err));
        // 空エンターでTL更新
        if (!array[0]) {
            array[0] = 'tl';
        };
        // コマンドを解析
        try {
            await program.parseAsync(array, { from: 'user' });
        } catch(err) {
            util.showCMDErrorMsg(err);
        };
    };
};


// process.exitをオーバーライド
program.exitOverride();

// バージョン
program.version(packageJson.version, '-v, --version');

// 名前とおおまかな使い方
program.name('nyaan').usage('command [オプション]');

// コンソールをクリア
program
    .command('clear')
    .alias('c')
    .description('コンソールをクリアします')
    .action(() => console.clear());

// ツイート
program
    .command('tweet [text]')
    .alias('tw')
    .usage('[テキスト]')
    .description('ツイートします')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .action(async (text, options) => tweet('', text, options))
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・テキストを省略すると、「にゃーん」に変換されます');
    });

// リプライ
program
    .command('reply <index> [text]')
    .alias('rp')
    .usage('<ツイートの番号> [テキスト]')
    .description('リプライします')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .action(async (index, text, options) => {
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await tweet(tweetId, text, options);
        };
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・テキストを省略すると、「にゃーん」に変換されます');
    });

// ツイートを削除
program
    .command('deltweet <index>')
    .alias('dtw')
    .usage('<ツイートの番号>')
    .description('ツイートを削除します')
    .action(async (index) => {
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await api.deleteTweet(tweetId).catch(err => console.error(err));
        };
    });

// タイムライン表示
program
    .command('timeline [counts]')
    .alias('tl')
    .usage('[取得件数]')
    .description('タイムラインを表示します')
    .action(async (counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await api.getTimeline(0, counts).catch(err => console.error(err));
        displayingTweets = (timeline) ? timeline : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・最大200件まで取得できます');
        console.log('  ・取得件数を省略すると、20件取得します');
    });

// メンション一覧表示
program
    .command('mentionTL [counts]')
    .alias('mtl')
    .usage('[取得件数]')
    .description('自分宛てのメンションを表示します')
    .action(async (counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await api.getTimeline(1, counts).catch(err => console.error(err));
        displayingTweets = (timeline) ? timeline : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・最大200件まで取得できます');
        console.log('  ・取得件数を省略すると、20件取得します');
    });

// ユーザータイムライン表示
program
    .command('userTL [userId] [counts]')
    .alias('utl')
    .usage('[ユーザーID / ツイートの番号] [取得件数]')
    .description('ユーザーのタイムラインを表示します')
    .action(async (userId, counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const screenName = getScreenName(userId, 0);
        const timeline = await api.getUserTimeline(screenName, counts).catch(err => console.error(err));
        displayingTweets = (timeline) ? timeline : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ユーザーIDを省略した場合、 自分のツイートが表示されます');
        console.log('  ・指定したツイートがRTの場合、RT元のユーザーが指定されます');
        console.log('  ・最大200件まで取得できます');
        console.log('  ・取得件数を省略すると、20件取得します');
    });

// ツイート検索
program
    .command('search <keyword> [counts]')
    .alias('sh')
    .usage('<検索ワード> [取得件数]')
    .description('キーワードからツイートを検索します')
    .action(async (keyword, counts) => {
        counts = (!counts || counts < 1 || counts > 100) ? 20 : counts;
        const tweets = await api.searchTweet(keyword, counts).catch(err => console.error(err));
        displayingTweets = (tweets) ? tweets.statuses : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・最大100件まで取得できます');
        console.log('  ・取得件数を省略すると、20件取得します');
    });

// いいねの操作
program
    .command('favorite <index>')
    .alias('fv')
    .usage('<ツイートの番号>')
    .description('いいね！の操作をします')
    .option('-r, --remove', 'いいねを取り消します')
    .action(async (index, options) => {
        const isRemoved = (options.remove) ? 1 : 0;
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await api.favorite(tweetId, isRemoved).catch(err => console.error(err));
        };
        delete options.remove;
    });

// リツイートの操作
program
    .command('retweet <index>')
    .alias('rt')
    .usage('<ツイートの番号>')
    .description('リツイートの操作をします')
    .option('-r, --remove', 'リツイートを取り消します')
    .action(async (index, options) => {
        const isRemoved = (options.remove) ? 1 : 0;
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await api.retweet(tweetId, isRemoved).catch(err => console.error(err));
        };
        delete options.remove;
    });

// いいね＆リツイート
program
    .command('favrt <index>')
    .alias('frt')
    .usage('<ツイートの番号>')
    .description('いいねとリツイートをします')
    .action(async (index) => {
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await api.favorite(tweetId, 0).catch(err => console.error(err));
            await api.retweet(tweetId, 0).catch(err => console.error(err));
        };
    });

// フォローの操作
program
    .command('follow [userId]')
    .alias('fw')
    .usage('[ユーザーID / ツイートの番号]')
    .description('フォローの操作をします')
    .option('-r, --remove', 'フォローを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        const screenName = getScreenName(userId, 1);
        if (screenName) {
            await api.follow(screenName, mode).catch(err => console.error(err));
        };
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ユーザーIDを省略した場合、 0番のツイートが指定されます');
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます');
    });

// ブロックの操作
program
    .command('block [userId]')
    .alias('bk')
    .usage('[ユーザーID / ツイートの番号]')
    .description('ブロックの操作をします')
    .option('-r, --remove', 'ブロックを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        const screenName = getScreenName(userId, 1);
        if (screenName) {
            await api.block(screenName, mode).catch(err => console.error(err));
        };
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ユーザーIDを省略した場合、 0番のツイートが指定されます');
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます');
    });

// ミュートの操作
program
    .command('mute [userId]')
    .alias('mt')
    .usage('[ユーザーID / ツイートの番号]')
    .description('ミュートの操作をします')
    .option('-r, --remove', 'ミュートを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        const screenName = getScreenName(userId, 1);
        if (screenName) {
            await api.mute(screenName, mode).catch(err => console.error(err));
        };
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ユーザーIDを省略した場合、 0番のツイートが指定されます');
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます');
    });

// 終了
program
    .command('exit')
    .alias('e')
    .description('nyaanを終了します')
    .action(() => process.exit(0));


// コマンドがあれば解析、なければ対話型のやつを開始
if (process.argv[2]) {
    try {
        program.parse(process.argv);
    } catch(err) {
        util.showCMDErrorMsg(err);
    };
} else {
    interactive();
};
