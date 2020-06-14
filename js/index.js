#!/usr/bin/env node
'use strict';
const program = require('commander');
const colors = require('colors');
const tweet = require('./tweet.js');
const util = require('./util.js');

// どうしてこうなった
let tweetsData = [];

// バージョン
program.version('1.0.0', '-v, --version')

// 名前と大体の使い方
program.name('nyaan').usage('command [options]');

// コマンドが無い場合のメッセージ
program.on('command:*', (operands) => {
    console.error(`Error: ${operands[0]}は有効なコマンドではありません`);
    return;
});

// 終了
program
    .command('exit')
    .description('nyaanを終了します')

// ツイートする
program
    .command('tweet [text]')
    .alias('tw')
    .description('ツイートします (スペースを含む文は"で囲んでね)')
    .option('-m, --media <path>', '画像を添付します。複数ある場合は,で区切ってね。')
    .option('-n, --nyaan', '鳴き声を世界に発信します')
    .action(async (text, options) => {
        const path = options.media || '';
        text = (options.nyaan || !text) ? 'にゃーん' : text;
        await tweet.tweetPost(text, path);
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan tweet にゃーん'.brightMagenta);
        console.log('  $ nyaan tw -n -m nyaan.png'.brightMagenta);
    });

// タイムラインを見る
program
    .command('timeline [counts]')
    .alias('tl')
    .description('タイムラインを表示します (最大200件)')
    .action(async (counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await tweet.getTimeline(counts);
        tweetsData = (timeline) ? timeline : tweetsData;
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan timeline'.brightMagenta);
        console.log('  $ nyaan tl 50'.brightMagenta);
    });

// 指定ユーザーのタイムラインを見る
program
    .command('userTimeline <userId> [counts]')
    .alias('utl')
    .description('指定したユーザーのタイムラインを表示します (最大200件)')
    .action(async (userId, counts) => {
        userId = userId.replace(/@|＠/, '');
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await tweet.getUserTimeline(userId, counts);
        tweetsData = (timeline) ? timeline : tweetsData;
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan userTimeline @Twitter'.brightMagenta);
        console.log('  $ nyaan utl Twitter 50'.brightMagenta);
    });

// キーワードでツイートを探す
program
    .command('search <keyword> [counts]')
    .alias('sch')
    .description('キーワードからツイートを検索します (最大200件)')
    .action(async (keyword, counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const tweets = await tweet.searchTweet(keyword, counts);
        tweetsData = (tweets) ? tweets : tweetsData;
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan search 三毛猫'.brightMagenta);
        console.log('  $ nyaan sch "calico cat" 50'.brightMagenta);
    });

// ふぁぼる
program
    .command('favorite <index>')
    .alias('fav')
    .description('いいね！します')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (!tweetId){
            return;
        };
        await tweet.favorite(tweetId, 0);
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan favorite 1'.brightMagenta);
        console.log('  $ nyaan fav 10'.brightMagenta);
    });

// ふぁぼを取り消す
program
    .command('unfavorite <index>')
    .alias('ufav')
    .description('いいね！を取り消します')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (!tweetId){
            return;
        };
        await tweet.favorite(tweetId, 1);
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan unfavorite 1'.brightMagenta);
        console.log('  $ nyaan ufav 10'.brightMagenta);
    });

// リツイートする
program
    .command('retweet <index>')
    .alias('rt')
    .description('リツイートします')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (!tweetId){
            return;
        };
        await tweet.retweet(tweetId, 0);
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan retweet 1'.brightMagenta);
        console.log('  $ nyaan rt 10'.brightMagenta);
    });

// リツイートを取り消す
program
    .command('unretweet <index>')
    .alias('urt')
    .description('リツイートを取り消します')
    .action(async (index) => {
        const tweetId = tweet.getTweetId(tweetsData, index);
        if (!tweetId){
            return;
        };
        await tweet.retweet(tweetId, 1);
    }).on('--help', () => {
        console.log('\nExamples:');
        console.log('  $ nyaan unretweet 1'.brightMagenta);
        console.log('  $ nyaan urt 10'.brightMagenta);
    });


// コマンドがあれば解析、なければ対話型のやつを開始
if (process.argv[2]){
    program.parse(process.argv);
} else {
    interactive();
};


// TODO: --helpコマンドを入力すると終了する問題

/**
 * 無理やり対話型にしてるやつ
 */
async function interactive(){
    // とりあえずタイムライン表示
    tweetsData = await tweet.getTimeline(20);
    // ループ
    let array = '';
    do {
        // 入力待ち
        array = await util.readlineSync();
        // コマンド実行
        await program.parseAsync(array, {from: 'user'});
    } while(array[0] != 'exit');
};
