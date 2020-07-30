#!/usr/bin/env node
'use strict';
const program = require('commander');
const colors = require('colors');
const packageJson = require("../package.json");
const api = require('./api.js');
const util = require('./util.js');


// 表示中のツイート
let displayingTweets = [];

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
    .description('ツイートします')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .action(async (text, options) => {
        // パスがあるか確認
        const path = options.media || '';
        // テキストがない場合、にゃーんする
        text = (!text && !path) ? 'にゃーん' : text;
        // 投稿
        await api.tweetPost(text, path, '').catch(err => {
            console.error(err);
        });
        // オブジェクトを削除
        delete options.media;
        delete options.nyaan;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・テキストを省略すると、「にゃーん」に変換されます');
    });

// リプライ
program
    .command('reply <index> [text]')
    .alias('rp')
    .description('リプライします')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .action(async (index, text, options) => {
        // ツイートIDを取得
        const tweetId = api.getTweetId(displayingTweets, index);
        // リプライ
        if (tweetId) {
            const path = options.media || '';
            text = (!text && !path) ? 'にゃーん' : text;
            await api.tweetPost(text, path, tweetId).catch(err => {
                console.error(err);
            });
        };
        // オブジェクトを削除
        delete options.media;
        delete options.nyaan;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・テキストを省略すると、「にゃーん」に変換されます');
    });

// ツイートを削除
program
    .command('deltweet <index>')
    .alias('dtw')
    .description('ツイートを削除します')
    .action(async (index) => {
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await api.deleteTweet(tweetId).catch(err => {
                console.error(err);
            });
        };
    });

// タイムライン表示
program
    .command('timeline [counts]')
    .alias('tl')
    .description('タイムラインを表示します')
    .action(async (counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await api.getTimeline(0, counts).catch(err => {
            console.error(err);
        });
        displayingTweets = (timeline) ? timeline : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・countsは最大200件まで指定できます');
        console.log('  ・countsを省略すると、20件を指定したことになります');
    });

// メンション一覧表示
program
    .command('mentionTL [counts]')
    .alias('mtl')
    .description('自分宛てのメンションを表示します')
    .action(async (counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await api.getTimeline(1, counts).catch(err => {
            console.error(err);
        });
        displayingTweets = (timeline) ? timeline : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・countsは最大200件まで指定できます');
        console.log('  ・countsを省略すると、20件を指定したことになります');
    });

// ユーザータイムライン表示
program
    .command('userTL [userId] [counts]')
    .alias('utl')
    .description('ユーザーのタイムラインを表示します')
    .action(async (userId, counts) => {
        // インデックスが指定された場合、対象ツイートのスクリーンネームに置き換える
        if (!isNaN(userId)) {
            userId = api.getUserId(displayingTweets, Number(userId), 1);
        };
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await api.getUserTimeline(userId, counts).catch(err => {
            console.error(err);
        });
        displayingTweets = (timeline) ? timeline : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・userIdにはツイートのインデックスを指定することも可能です');
        console.log('  ・指定したツイートがRTの場合、RT元のユーザーが指定されます');
        console.log('  ・countsは最大200件まで指定できます');
        console.log('  ・countsを省略すると、20件を指定したことになります');
    });

// ツイート検索
program
    .command('search <keyword> [counts]')
    .alias('sh')
    .description('キーワードからツイートを検索します')
    .action(async (keyword, counts) => {
        counts = (!counts || counts < 1 || counts > 100) ? 20 : counts;
        const tweets = await api.searchTweet(keyword, counts).catch(err => {
            console.error(err);
        });
        displayingTweets = (tweets) ? tweets.statuses : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・countsは最大100件まで指定できます');
        console.log('  ・countsを省略すると、20件を指定したことになります');
    });

// いいねの操作
program
    .command('favorite <index>')
    .alias('fv')
    .description('いいね！の操作をします')
    .option('-d, --delete', 'いいねを取り消します')
    .action(async (index, options) => {
        const isRemoved = (options.remove) ? 1 : 0;
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await api.favorite(tweetId, isRemoved).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    });

// リツイートの操作
program
    .command('retweet <index>')
    .alias('rt')
    .description('リツイートの操作をします')
    .option('-d, --delete', 'リツイートを取り消します')
    .action(async (index, options) => {
        const isRemoved = (options.remove) ? 1 : 0;
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await api.retweet(tweetId, isRemoved).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    });

// いいね＆リツイート
program
    .command('favrt <index>')
    .alias('frt')
    .description('いいねとリツイートをします')
    .action(async (index) => {
        const tweetId = api.getTweetId(displayingTweets, index);
        if (tweetId) {
            await api.favorite(tweetId, 0).catch(err => {
                console.error(err);
            });
            await api.retweet(tweetId, 0).catch(err => {
                console.error(err);
            });
        };
    });

// フォローの操作
program
    .command('follow [userId]')
    .alias('fw')
    .description('フォローの操作をします')
    .option('-d, --delete', 'フォローを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        // userIdが指定されていない場合、0を指定
        userId = (userId) ? userId : '0';
        // インデックスが指定された場合、対象ツイートのスクリーンネームに置き換える
        if (!isNaN(userId)) {
            userId = api.getUserId(displayingTweets, Number(userId), 0);
        };
        if (userId) {
            await api.follow(userId, mode).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・userIdにはツイートのインデックスを指定することも可能です');
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます');
    });

// ブロックの操作
program
    .command('block [userId]')
    .alias('bk')
    .description('ブロックの操作をします')
    .option('-d, --delete', 'ブロックを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        // userIdが指定されていない場合、0を指定
        userId = (userId) ? userId : '0';
        // インデックスが指定された場合、対象ツイートのスクリーンネームに置き換える
        if (!isNaN(userId)) {
            userId = api.getUserId(displayingTweets, Number(userId), 0);
        };
        if (userId) {
            await api.block(userId, mode).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・userIdにはツイートのインデックスを指定することも可能です');
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます');
    });

// ミュートの操作
program
    .command('mute [userId]')
    .alias('mt')
    .description('ミュートの操作をします')
    .option('-d, --delete', 'ミュートを解除します')
    .action(async (userId, options) => {
        const mode = (options.remove) ? 1 : 0;
        // userIdが指定されていない場合、0を指定
        userId = (userId) ? userId : '0';
        // インデックスが指定された場合、対象ツイートのスクリーンネームに置き換える
        if (!isNaN(userId)) {
            userId = api.getUserId(displayingTweets, Number(userId), 0);
        };
        if (userId) {
            await api.mute(userId, mode).catch(err => {
                console.error(err);
            });
        };
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・userIdにはツイートのインデックスを指定することも可能です');
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます');
    });


/**
 * 終了
 */
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


/**
 * 対話型モード（無理矢理）
 */
async function interactive() {
    // タイムライン表示
    displayingTweets = await api.getTimeline(0, 20).catch(err => console.error(err));
    let array = '';
    while (1) {
        array = await util.readlineSync().catch(err => { console.error(err) });
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
