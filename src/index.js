#!/usr/bin/env node
'use strict';
const program     = require('commander');
const api         = require('./api.js');
const util        = require('./util.js');
const oauth       = require('./oauth.js');
const packageJson = require("../package.json");

let token = {};
let displayingTweets = [];

//-------------------------------------------------------------------------
//  なんかいろいろ
//-------------------------------------------------------------------------

/**
 * ツイート/リプライ
 * 
 * @param {String} tweetId リプライ先のツイートID
 * @param {String} text    ツイート文
 * @param {Array}  options コマンドのオプション
 */
async function tweet(tweetId, text, options) {
    const path = options.media || '';

    // テキストファイルを読み込む
    if (options.load) {
        text = util.loadTextFile(options.load);
        if (!text) return;
    };

    // 空文字の場合にゃーんに置き換える
    text = (!text && !path) ? 'にゃーん' : text;

    // 装飾文字
    if (options.bold || options.italic || options.serifbold || options.serifitaric || options.script) {
        text = util.decorateCharacter(options, text);
    };

    // ツイート
    await api.tweetPost(token, text, path, tweetId).catch(err => console.error(err));

    // プロパティを削除
    delete options.bold;
    delete options.italic;
    delete options.serifbold;
    delete options.serifitaric;
    delete options.script;
    delete options.media;
    delete options.load;
};

/**
 * 対話モード（無理矢理）
 */
async function interactive() {
    let array = '';

    // タイムライン表示
    displayingTweets = await api.getTimeline(token, false, 20).catch(err => console.error(err));    

    while (1) {
        // 入力を待つ
        array = await util.readlineSync().catch(err => console.error(err));

        // 空エンターでTL更新
        if (!array[0]) array[0] = 'tl';

        // コマンドを解析
        try {
            await program.parseAsync(array, { from: 'user' });
        } catch(err) {
            util.showCMDErrorMsg(err);
        };
    };
};

//-------------------------------------------------------------------------
//  コマンド登録
//-------------------------------------------------------------------------

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
    .option('-b, --bold', '英数字を装飾します（𝘀𝗮𝗺𝗽𝗹𝗲）')
    .option('-i, --italic', '英数字を装飾します（𝙨𝙖𝙢𝙥𝙡𝙚）')
    .option('-sb, --serifbold', '英数字を装飾します（𝐬𝐚𝐦𝐩𝐥𝐞）')
    .option('-si, --serifitalic', '英数字を装飾します（𝒔𝒂𝒎𝒑𝒍𝒆）')
    .option('-sc, --script', '英数字を装飾します（𝓼𝓪𝓶𝓹𝓵𝓮）')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .option('-l, --load <path>', 'ファイルの内容をテキストとしてツイートします')
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
    .option('-b, --bold', '英数字を装飾します（𝘀𝗮𝗺𝗽𝗹𝗲）')
    .option('-i, --italic', '英数字を装飾します（𝙨𝙖𝙢𝙥𝙡𝙚）')
    .option('-sb, --serifbold', '英数字を装飾します（𝐬𝐚𝐦𝐩𝐥𝐞）')
    .option('-si, --serifitalic', '英数字を装飾します（𝒔𝒂𝒎𝒑𝒍𝒆）')
    .option('-sc, --script', '英数字を装飾します（𝓼𝓪𝓶𝓹𝓵𝓮）')
    .option('-m, --media <path>', '画像を添付します (複数ある場合は,で区切ってね)')
    .option('-l, --load <path>', 'ファイルの内容をテキストとしてツイートします')
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
    .action(async (indexes) => {
        const indexArray = indexes.split(',');
        for (let index of indexArray) {
            const tweetId = api.getTweetId(displayingTweets, index);
            if (!tweetId) continue;
            await api.deleteTweet(token, tweetId).catch(err => console.error(err));
        };
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ツイートの番号はカンマ区切りで複数指定することもできます');
    });

// タイムライン表示
program
    .command('timeline [counts]')
    .alias('tl')
    .usage('[取得件数]')
    .description('タイムラインを表示します')
    .action(async (counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await api.getTimeline(token, false, counts).catch(err => console.error(err));
        displayingTweets = (timeline) ? timeline : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・最大200件まで取得できます');
        console.log('  ・取得件数を省略すると、20件取得します');
    });

// メンション一覧表示
program
    .command('mention [counts]')
    .alias('m')
    .usage('[取得件数]')
    .description('自分宛てのメンション一覧を表示します')
    .action(async (counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const timeline = await api.getTimeline(token, true, counts).catch(err => console.error(err));
        displayingTweets = (timeline) ? timeline : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・最大200件まで取得できます');
        console.log('  ・取得件数を省略すると、20件取得します');
    });

// ユーザー表示
program
    .command('user [userId] [counts]')
    .alias('u')
    .usage('[ユーザーID / ツイートの番号] [取得件数]')
    .description('ユーザーのツイート一覧を表示します')
    .action(async (userId, counts) => {
        counts = (!counts || counts < 1 || counts > 200) ? 20 : counts;
        const screenName = api.getScreenName(displayingTweets, userId, true);
        const timeline = await api.getUserTimeline(token, screenName, counts).catch(err => console.error(err));
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
    .description('キーワードを含む、過去一週間のツイートを検索します')
    .action(async (keyword, counts) => {
        counts = (!counts || counts < 1 || counts > 100) ? 20 : counts;
        const tweets = await api.searchTweet(token, keyword, counts).catch(err => console.error(err));
        displayingTweets = (tweets) ? tweets : displayingTweets;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・AND検索する際は、全角スペースで区切って下さい');
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
    .action(async (indexes, options) => {
        const isRemoved = (options.remove) ? true : false;
        const indexArray = indexes.split(',');
        for (let index of indexArray) {
            const tweetId = api.getTweetId(displayingTweets, index);
            if (!tweetId) continue;
            await api.favorite(token, tweetId, isRemoved).catch(err => console.error(err));
        };
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ツイートの番号はカンマ区切りで複数指定することもできます');
    });

// リツイートの操作
program
    .command('retweet <index>')
    .alias('rt')
    .usage('<ツイートの番号>')
    .description('リツイートの操作をします')
    .option('-r, --remove', 'リツイートを取り消します')
    .action(async (indexes, options) => {
        const isRemoved = (options.remove) ? true : false;
        const indexArray = indexes.split(',');
        for (let index of indexArray) {
            const tweetId = api.getTweetId(displayingTweets, index);
            if (!tweetId) continue;
            await api.retweet(token, tweetId, isRemoved).catch(err => console.error(err));
        };
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ツイートの番号はカンマ区切りで複数指定することもできます');
    });

// いいね＆リツイート
program
    .command('favrt <index>')
    .alias('fr')
    .usage('<ツイートの番号>')
    .description('いいねとリツイートをします')
    .action(async (indexes) => {
        const indexArray = indexes.split(',');
        for (let index of indexArray) {
            const tweetId = api.getTweetId(displayingTweets, index);
            if (!tweetId) continue;
            await api.favorite(token, tweetId, false).catch(err => console.error(err));
            await api.retweet(token, tweetId, false).catch(err => console.error(err));
        };
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ツイートの番号はカンマ区切りで複数指定することもできます');
    });

// フォローの操作
program
    .command('follow [userId]')
    .alias('fw')
    .usage('[ユーザーID / ツイートの番号]')
    .description('フォローの操作をします')
    .option('-r, --remove', 'フォローを解除します')
    .action(async (userId, options) => {
        const isRemoved = (options.remove) ? true : false;
        const screenName = api.getScreenName(displayingTweets, userId, false);
        if (!screenName) return;
        await api.follow(token, screenName, isRemoved).catch(err => console.error(err));
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
        const isRemoved = (options.remove) ? true : false;
        const screenName = api.getScreenName(displayingTweets, userId, false);
        if (!screenName) return;
        await api.block(token, screenName, isRemoved).catch(err => console.error(err));
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
        const isRemoved = (options.remove) ? true : false;
        const screenName = api.getScreenName(displayingTweets, userId, false);
        if (!screenName) return;
        await api.mute(token, screenName, isRemoved).catch(err => console.error(err));
        delete options.remove;
    })
    .on('--help', () => {
        console.log('\nTips:');
        console.log('  ・ユーザーIDを省略した場合、 0番のツイートが指定されます');
        console.log('  ・指定したツイートがRTの場合、RTしたユーザーが指定されます');
    });

// ツイートのURLを表示
program
    .command('URL <index>')
    .alias('U')
    .usage('<ツイートの番号>')
    .description('対象ツイートのURLを表示します')
    .action((index) => api.createURL(displayingTweets, index))

// 設定の削除
program
    .command('init')
    .description('認証データを削除します')
    .action(() => util.deleteConfig())

// 終了
program
    .command('exit')
    .alias('e')
    .description('nyaanを終了します')
    .action(() => process.exit(0));

//-------------------------------------------------------------------------
//  メイン
//-------------------------------------------------------------------------

(async () => {
    token = await oauth.loadToken();
    // コマンドがあれば解析、なければ対話型で実行
    if (process.argv[2]) {
        try {
            program.parse(process.argv);
        } catch(err) {
            util.showCMDErrorMsg(err);
        };
    } else {
        interactive();
    };
})();
