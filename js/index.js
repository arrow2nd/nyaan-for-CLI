#!/usr/bin/env node
'use strict';
const program = require('commander');
const colors = require('colors');
const tweet = require('./tweet.js');
const util = require('./util.js');

// どうしてこうなった
let tweetsData = [];

// process.exitをオーバーライド
program.exitOverride();

// バージョン
program.version('1.0.0', '-v, --version');

// 名前と大体の使い方
program.name('nyaan').usage('command [オプション]');

// コマンドが無い場合のメッセージ
program.on('command:*', (operands) => {
    console.error(`Error: "${operands[0]}" は有効なコマンドではありません`);
    return;
});

// コンソールをクリアする
program
    .command('clear')
    .alias('cls')
    .description('コンソールをクリアします')
    .usage(' ')
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
    .usage('[テキスト] [オプション]')
    .option('-m, --media <path>', '画像を添付します。複数ある場合は,で区切ってね。')
    .option('-n, --nyaan', '鳴き声を世界に発信します')
    .action(async (text, options) => {
        const path = options.media || '';
        text = (options.nyaan || !text) ? 'にゃーん' : text;
        await tweet.tweetPost(text, path).catch(err => {
            console.error(err);
        });
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan tweet にゃーん'.brightMagenta);
        console.log('  $ nyaan tw -n -m nyaan.png'.brightMagenta);
    });

// ツイートを削除する
program
    .command('deltweet [index]')
    .alias('dtw')
    .description('ツイートを削除します')
    .usage('<インデックス>')
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
    .usage('[取得件数(最大200)]')
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
    .usage('[ユーザーID] [取得件数(最大200)]')
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
    .usage('<キーワード> [取得件数(最大200)]')
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
        console.log('  $ nyaan sch "calico cat" 50'.brightMagenta);
    });

// ふぁぼる
program
    .command('favorite [index]')
    .alias('fav')
    .description('いいね！します')
    .usage('<インデックス>')
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
    .usage('<インデックス>')
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
    .usage('<インデックス>')
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
    .usage('<インデックス>')
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
    .command('favorite&retweet [index]')
    .alias('favrt')
    .description('いいねとリツイートをまとめてします')
    .usage('<インデックス>')
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
        console.log('  $ nyaan favorite&retweet 1'.brightMagenta);
        console.log('  $ nyaan favrt 10'.brightMagenta);
    });


// 終了コマンド
program.command('exit').description('nyaanを終了します');


// コマンドがあれば解析、なければ対話型のやつを開始
if (process.argv[2]){
    program.parse(process.argv);
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
    do {
        // 入力待ち
        array = await util.readlineSync().catch(err => {console.error(err)});
        // コマンド実行
        try {
            await program.parseAsync(array, {from: 'user'});
        } catch(err) {
            if (err.exitCode){
                console.error(err);
            };
        };
    } while(array[0] != 'exit');
};
