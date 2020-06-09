#!/usr/bin/env node
'use strict';

const colors = require('colors');
const program = require('commander');

function list(val) {
    return val.split(',');
}

// バージョン
program
    .version('1.0.0', '-v, --version')

// ツイート
program
    .command('tweet <text>')
    .alias('tw')
    .description('そのままツイートします 文中にスペースを使う場合は"で囲んで下さい！')
    .option('-m, --media <path>', '画像/動画を添付します 複数ある場合は,で区切って下さい')
    .action((text, options) => {
        const path = options.media || '';
        tweetPost(text, path);
    }).on('--help', () => {
        process.stdout.write('\nExamples:\n');
        process.stdout.write('  $ mum tweet にゃーん\n');
        process.stdout.write('  $ mum tw "にゃーん にゃーん" -m [画像のパス]\n');
    });

program.parse(process.argv);

// テスト
function tweetPost(text, mediaPath) {
    const paths = list(mediaPath);
    console.log(`テキスト: ${text}`);

    if (paths[0]){
        paths.forEach(path => {
            console.log(path);
        });
    };
};
