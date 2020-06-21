#!/usr/bin/env node
'use strict';
const packageJson = require("../package.json");
const program = require('commander');
const colors = require('colors');
const tweet = require('./tweet.js');
const util = require('./util.js');
const Twitter = require("twitter");

// どうしてこうなった
let tweetsData = [];

// process.exitをオーバーライド
program.exitOverride();

// バージョン
program.version(packageJson.version, '-v, --version');

// 名前と大体の使い方
program.name('nyaan').usage('command [オプション]');

// コンソールをクリアする
program
    .command('clear')
    .alias('cls')
    .description('コンソールをクリアします')
    .action(() => {
        console.clear();
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan claer'.brightMagenta);
        console.log('  $ nyaan cls'.brightMagenta);
    });

// ツイートする
program
    .command('tweet [text]')
    .alias('tw')
    .description('ツイートします (スペースを含む文は"で囲んでね)')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .option('-n, --nyaan', '鳴き声を世界に発信します')
    .action(async (text, options) => {
        // 画像のパス
        const path = options.media || '';
        // にゃーん
        text = (options.nyaan || !text) ? 'にゃーん' : text;
        // ツイート
        await tweet.tweetPost(text, path, '').catch(err => {
            console.error(err);
        });
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan tweet にゃーん'.brightMagenta);
        console.log('  $ nyaan tw -n -m nyaan.png'.brightMagenta);
    });

// リプライする
program
    .command('reply [index] [text]')
    .alias('rp')
    .description('リプライします (スペースを含む文は"で囲んでね)')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .option('-n, --nyaan', '鳴き声で返信します')
    .action(async (index, text, options) => {
        // 投稿IDを取得
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (!tweetId){
            return;
        };
        // 画像のパス
        const path = options.media || '';
        // にゃーん
        text = (options.nyaan || !text) ? 'にゃーん' : text;
        // ツイート
        await tweet.tweetPost(text, path, tweetId).catch(err => {
            console.error(err);
        });
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan reply 0 おはよー'.brightMagenta);
        console.log('  $ nyaan rp 10'.brightMagenta);
    });


// ツイートを削除する
program
    .command('deltweet [index]')
    .alias('dtw')
    .description('ツイートを削除します')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (!tweetId){
            return;
        };
        await tweet.deleteTweet(tweetId).catch(err => {
            console.error(err);
        });
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan deltweet 1'.brightMagenta);
        console.log('  $ nyaan dtw 10'.brightMagenta);
    });

// タイムラインを見る
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
        console.log('\nExamples:');
        console.log('  $ nyaan timeline'.brightMagenta);
        console.log('  $ nyaan tl 50'.brightMagenta);
    });

// ユーザーのタイムラインを見る
program
    .command('usertimeline [userId] [counts]')
    .alias('utl')
    .description('指定したユーザーのタイムラインを表示します')
    .action(async (userId, counts) => {
        if (userId){
            userId = userId.replace(/@|＠/, '');
        };
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await tweet.getUserTimeline(userId, counts).catch(err => {
            console.error(err);
        });
        tweetsData = (timeline) ? timeline : tweetsData;
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan userTimeline @Twitter'.brightMagenta);
        console.log('  $ nyaan utl Twitter 50'.brightMagenta);
    });

// キーワードでツイートを探す
program
    .command('search [keyword] [counts]')
    .alias('sch')
    .description('キーワードからツイートを検索します')
    .action(async (keyword, counts) => {
        if (!keyword){
            console.error('Error: キーワードがありません'.brightRed);
            return;
        };
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const tweets = await tweet.searchTweet(keyword, counts).catch(err => {
            console.error(err);
        });
        tweetsData = (tweets) ? tweets.statuses : tweetsData;
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan search 三毛猫'.brightMagenta);
        console.log('  $ nyaan sch cat 50'.brightMagenta);
    });

// ふぁぼる
program
    .command('favorite [index]')
    .alias('fav')
    .description('いいね！します')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId){
            await tweet.favorite(tweetId, 0).catch(err => {
                console.error(err);
            });
        };
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan favorite 1'.brightMagenta);
        console.log('  $ nyaan fav 10'.brightMagenta);
    });

// ふぁぼを取り消す
program
    .command('unfavorite [index]')
    .alias('ufav')
    .description('いいね！を取り消します')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId){
            await tweet.favorite(tweetId, 1).catch(err => {
                console.error(err);
            });
        };
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan unfavorite 1'.brightMagenta);
        console.log('  $ nyaan ufav 10'.brightMagenta);
    });

// リツイートする
program
    .command('retweet [index]')
    .alias('rt')
    .description('リツイートします')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId){
            await tweet.retweet(tweetId, 0).catch(err => {
                console.error(err);
            });
        };
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan retweet 1'.brightMagenta);
        console.log('  $ nyaan rt 10'.brightMagenta);
    });

// リツイートを取り消す
program
    .command('unretweet [index]')
    .alias('urt')
    .description('リツイートを取り消します')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (tweetId){
            await tweet.retweet(tweetId, 1).catch(err => {
                console.error(err);
            });
        };
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan unretweet 1'.brightMagenta);
        console.log('  $ nyaan urt 10'.brightMagenta);
    });

// いいね&リツイート
program
    .command('favrt [index]')
    .alias('frt')
    .description('いいねとリツイートをまとめてします')
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
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan favrt 1'.brightMagenta);
        console.log('  $ nyaan frt 10'.brightMagenta);
    });

// 終了コマンド
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
 * 無理やり対話型にしてるやつ
 */
async function interactive(){
    // とりあえずタイムライン表示
    tweetsData = await tweet.getTimeline(20).catch(err => {console.error(err)});
    // ループ
    let array = '';
    while (1) {
        // 入力待ち
        array = await util.readlineSync().catch(err => {console.error(err)});
        // コマンド実行
        try {
            await program.parseAsync(array, {from: 'user'});
        } catch(err) {
            util.showCMDErrorMsg(err);
        };
    };
};
