#!/usr/bin/env node
'use strict';
const program = require('commander');
const colors = require('colors');
const tweet = require('./tweet.js');
const util = require('./util.js');

// どうしてこうなった
let tweetsData = [];

// バージョン
program
    .version('1.0.0', '-v, --version')

// ツイートする
program
    .command('tweet [text]')
    .alias('tw')
    .description('  ツイートします。スペースを含む文は"で囲んでね。文が無い場合、にゃーんします。')
    .option('-m, --media <path>', '画像を添付します。複数ある場合は,で区切ってね。')
    .option('-n, --nyaan', '鳴き声を世界に発信します')
    .action((text, options) => {
        const path = options.media || '';
        text = (options.nyaan || !text) ? 'にゃーん' : text;
        tweet.tweetPost(text, path);
    }).on('--help', () => {
        process.stdout.write('\nExamples:\n');
        process.stdout.write('  $ nyaan tweet にゃーん\n'.brightMagenta);
        process.stdout.write('  $ nyaan tw -n -m nyaan.png\n'.brightMagenta);
    });

// タイムラインを見る
program
    .command('timeline [counts]')
    .alias('tl')
    .description('  タイムラインを表示します。取得件数は最大200件です。')
    .action((counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        tweetsData = tweet.getTimeline(counts);
    }).on('--help', () => {
        process.stdout.write('\nExamples:\n');
        process.stdout.write('  $ nyaan timeline\n'.brightMagenta);
        process.stdout.write('  $ nyaan tl 50\n'.brightMagenta);
    });

// 指定ユーザーのタイムラインを見る
program
    .command('userTimeline <userId> [counts]')
    .alias('utl')
    .description('  指定したユーザーのタイムラインを表示します。取得件数は最大200件です。')
    .action((userId, counts) => {
        userId = userId.replace(/@|＠/, '');
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        tweetsData = tweet.getUserTimeline(userId, counts);
    }).on('--help', () => {
        process.stdout.write('\nExamples:\n');
        process.stdout.write('  $ nyaan userTimeline @Twitter\n'.brightMagenta);
        process.stdout.write('  $ nyaan utl Twitter 50\n'.brightMagenta);
    });

// キーワードでツイートを探す
program
    .command('search <keyword> [counts]')
    .alias('sch')
    .description('  キーワードからツイートを検索します。取得件数は最大200件です。')
    .action((keyword, counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        tweetsData = tweet.searchTweet(keyword, counts);
    }).on('--help', () => {
        process.stdout.write('\nExamples:\n');
        process.stdout.write('  $ nyaan search 三毛猫\n'.brightMagenta);
        process.stdout.write('  $ nyaan sch "calico cat" 50\n'.brightMagenta);
    });

// コマンドがあれば解析
if (process.argv[2]){
    program.parse(process.argv);
} else {
    // TODO: 対話型インターフェイスを開く
    interactive();
};


/**
 * 対話型インターフェイスみたいな
 */
async function interactive(){
    // とりあえずタイムライン表示
    tweetsData = await tweet.getTimeline(20);
    // 入力待ち
    let array = '';
    do {
        console.log(tweetsData);
        array = await util.readlineSync();
        await program.parseAsync(array, {from: 'user'});
    } while (array[0] != 'exit' || array[0] != 'quit');
};
