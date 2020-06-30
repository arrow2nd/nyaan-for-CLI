#!/usr/bin/env node
'use strict';
const packageJson = require("../package.json");
const program = require('commander');
const colors = require('colors');
const tweet = require('./tweet.js');
const util = require('./util.js');

// どうしてこうなった
let tweetsData = [];

// process.exitをオーバーライド
program.exitOverride();

// バージョン
program.version(packageJson.version, '-v, --version');

// 名前と大体の使い方
program.name('nyaan').usage('command [オプション]');


/**
 * コンソールをクリアする
 */
program
    .command('clear')
    .alias('cls')
    .description('コンソールをクリアします')
    .action(() => {
        console.clear();
    });

/**
 * ツイートする 
 */
program
    .command('tweet [text]')
    .alias('tw')
    .description('ツイートします')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .action(async (text, options) => {
        const path = options.media || '';
        text = (!text) ? 'にゃーん' : text;
        await tweet.tweetPost(text, path, '').catch(err => {
            console.error(err);
        });
        delete options.media;
        delete options.nyaan;
    }).on('--help', () => {
        console.log('\nTips:');
        console.log('  ・テキストを省略すると、「にゃーん」に変換されます'.brightMagenta);
    });

/**
 * リプライする
 */
program
    .command('reply <index> [text]')
    .alias('rp')
    .description('リプライします')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .action(async (index, text, options) => {
        // 投稿IDを取得
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId){
            const path = options.media || '';
            text = (!text) ? 'にゃーん' : text;
            await tweet.tweetPost(text, path, tweetId).catch(err => {
                console.error(err);
            });
        };
        delete options.media;
        delete options.nyaan;
    }).on('--help', () => {
        console.log('\nTips:');
        console.log('  ・テキストを省略すると、「にゃーん」に変換されます'.brightMagenta);
    });

/**
 * ツイートを削除する
 */
program
    .command('deltweet <index>')
    .alias('dtw')
    .description('ツイートを削除します')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId) {
            await tweet.deleteTweet(tweetId).catch(err => {
                console.error(err);
            });
        };
    });

/**
 * タイムラインを見る
 */
program
    .command('timeline [counts]')
    .alias('tl')
    .description('タイムラインを表示します')
    .action(async (counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await tweet.getTimeline(counts).catch(err => {
            console.error(err);
        });
        tweetsData = (timeline) ? timeline : tweetsData;
    }).on('--help', () => {
        console.log('\nTips:');
        console.log('  ・countsを省略すると、20件を指定したことになります'.brightMagenta);
    });

/**
 * ユーザーのタイムラインを見る
 */
program
    .command('usertimeline [userId] [counts]')
    .alias('utl')
    .description('ユーザーのタイムラインを表示します')
    .action(async (userId, counts) => {
        // インデックスが指定された場合、対象ツイートのスクリーンネームに置き換える
        if (!isNaN(userId)){
            userId = tweet.getUserId(tweetsData, Number(userId), 1);
        };
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await tweet.getUserTimeline(userId, counts).catch(err => {
            console.error(err);
        });
        tweetsData = (timeline) ? timeline : tweetsData;
    }).on('--help', () => {
        console.log('\nTips:');
        console.log('  ・userIdにはツイートのインデックスを指定することも可能です'.brightMagenta);
        console.log('  ・指定したツイートがRTの場合、RT元のユーザーが指定されます'.brightMagenta);
        console.log('  ・countsを省略すると、20件を指定したことになります'.brightMagenta);
    });

/**
 * キーワードからツイートを検索する
 */
program
    .command('search <keyword> [counts]')
    .alias('sch')
    .description('キーワードからツイートを検索します')
    .action(async (keyword, counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const tweets = await tweet.searchTweet(keyword, counts).catch(err => {
            console.error(err);
        });
        tweetsData = (tweets) ? tweets.statuses : tweetsData;
    }).on('--help', () => {
        console.log('\nTips:');
        console.log('  ・countsを省略すると、20件を指定したことになります'.brightMagenta);
    });

/**
 * いいねする/取り消す
 */
program
    .command('favorite <index>')
    .alias('fav')
    .description('いいね！します')
    .option('-r, --remove', 'いいねを取り消します')
    .action(async (index, options) => {
        // 0: 取り消し 1: いいね
        const mode = (options.remove) ? 1 : 0;
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId){
            await tweet.favorite(tweetId, mode).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    });

/**
 * リツイートする/取り消す
 */
program
    .command('retweet <index>')
    .alias('rt')
    .description('リツイートします')
    .option('-r, --remove', 'リツイートを取り消します')
    .action(async (index, options) => {
        // 0: 取り消す 1: リツイート
        const mode = (options.remove) ? 1 : 0;
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId) {
            await tweet.retweet(tweetId, mode).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    });

/**
 * いいねとリツイートを同時にする
 */
program
    .command('fav&rt <index>')
    .alias('favrt')
    .description('いいねとリツイートします')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId){
            await tweet.favorite(tweetId, 0).catch(err => {
                console.error(err);
            });
            await tweet.retweet(tweetId, 0).catch(err => {
                console.error(err);
            });
        };
    });

/**
 * フォローする/取り消す
 */
program
    .command('follow [userId]')
    .alias('fw')
    .description('ユーザーをフォローします')
    .option('-r, --remove', 'フォローを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        // userIdが指定されていない場合、インデックス0を指定
        userId = (userId) ? userId : '0';
        // インデックスが指定された場合、対象ツイートのスクリーンネームに置き換える
        if (!isNaN(userId)){
            userId = tweet.getUserId(tweetsData, Number(userId), 0);
        };
        if (userId){
            await tweet.follow(userId, mode).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    }).on('--help', () => {
        console.log('\nTips:');
        console.log('  ・userIdにはツイートのインデックスを指定することも可能です'.brightMagenta);
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます'.brightMagenta);
    });

/**
 * ブロックする/解除する
 */
program
    .command('block [userId]')
    .alias('bk')
    .description('ユーザーをブロックします')
    .option('-r, --remove', 'ブロックを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        // userIdが指定されていない場合、インデックス0を指定
        userId = (userId) ? userId : '0';
        // インデックスが指定された場合、対象ツイートのスクリーンネームに置き換える
        if (!isNaN(userId)){
            userId = tweet.getUserId(tweetsData, Number(userId), 0);
        };
        if (userId){
            await tweet.block(userId, mode).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    }).on('--help', () => {
        console.log('\nTips:');
        console.log('  ・userIdにはツイートのインデックスを指定することも可能です'.brightMagenta);
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます'.brightMagenta);
    });

/**
 * ミュートする/解除する
 */
program
    .command('mute [userId]')
    .alias('mt')
    .description('ユーザーをミュートします')
    .option('-r, --remove', 'ミュートを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        // userIdが指定されていない場合、インデックス0を指定
        userId = (userId) ? userId : '0';
        // インデックスが指定された場合、対象ツイートのスクリーンネームに置き換える
        if (!isNaN(userId)){
            userId = tweet.getUserId(tweetsData, Number(userId), 0);
        };
        if (userId){
            await tweet.mute(userId, mode).catch(err => {
                console.error(err);
            });
        };
        options.remove = false;
    }).on('--help', () => {
        console.log('\nTips:');
        console.log('  ・userIdにはツイートのインデックスを指定することも可能です'.brightMagenta);
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます'.brightMagenta);
    });


/**
 * nyaanを終了する
 */
program
    .command('exit')
    .alias('e')
    .description('nyaanを終了します')
    .action(() => {
        process.exit(0);
    });


// コマンドがあれば解析、なければ対話型のやつを開始
if (process.argv[2]){
    try {
        program.parse(process.argv);
    } catch(err) {
        util.showCMDErrorMsg(err);
    };
} else {
    interactive();
};


/**
 * 対話型モード（無理矢理）
 */
async function interactive(){
    // とりあえずタイムライン表示
    tweetsData = await tweet.getTimeline(20).catch(err => {console.error(err)});
    let array = '';
    while (1) {
        array = await util.readlineSync().catch(err => {console.error(err)});
        try {
            await program.parseAsync(array, {from: 'user'});
        } catch(err) {
            util.showCMDErrorMsg(err);
        };
    };
};
