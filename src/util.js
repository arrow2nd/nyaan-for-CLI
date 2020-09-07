'use strict';
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const split = require('graphemesplit');
const meaw = require('meaw');
const color = require('../config/color.json');

/**
 * メッセージを表示
 * @param {String|Object} type メッセージの種類、タイトル
 * @param {String}        text 内容
 */
function info(type, text) {
    let title;
    // タイトル
    switch (type) {
        case 'e':
            title = chalk.black.bgHex(color.sys.error)(' Error ');
            break;
        case 'i':
            title = chalk.black.bgHex(color.sys.info)(' Info ');
            break;
        case 's':
            title = chalk.black.bgHex(color.sys.success)(' Success ');
            break;
        default:
            title = type
    };
    // メッセージ
    switch (type) {
        case 'e':
            text = chalk.hex(color.sys.error)(text);
            break;
        case 'i':
            text = chalk.hex(color.sys.info)(text);
            break;
        case 's':
            text = chalk.hex(color.sys.success)(text);
            break;
    };
    console.log(title + ' ' + text);
};

/**
 * ファイルをテキストとして読み込む
 * @param  {String} fpath パス
 * @return {String}       ファイルの内容
 */
function loadTextFile(fpath) {
    // 存在するかチェック
    if (!fs.existsSync(fpath)) {
        info('e', `ファイルが見つかりません(${fpath})`);
        return;
    };
    return fs.readFileSync(fpath, 'utf8');
};

/**
 * 水平線を描画する
 * @param {boolean} hasPutSpace 左右に1スペースを空けるか
 */
function drawHr(hasPutSpace) {
    const width = process.stdout.columns;
    const hr = (hasPutSpace) ? ' ' + chalk.grey('-'.repeat(width - 2)) : '-'.repeat(width);
    console.log(hr);
};

/**
 * コンソールからの入力を受け付ける
 * @return {Array} 文字列配列
 */
function readlineSync() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        // 入力受付
        rl.question('>' + chalk.cyan('> '), (input) => {
            rl.close();
            resolve(input.split(' '));
        });
    });
};

/**
 * 文字列に指定した間隔で文字を挿入（ちょっと怪しい）
 * @param  {String} text   文字列
 * @param  {Number} length 挿入する間隔（半角を1とした表示幅）
 * @param  {String} add    挿入する文字
 * @return {String}        編集後の文字列
 */
function insert(text, length, add) {
    let start = 0, result = '', rest = text;    
    while (length < meaw.computeWidth(rest)) {
        result += strCat(text, start, length, false); // 範囲切り出し
        start = result.length;                        // 次の切り出し位置をズラす
        result += add;                                // 指定の文字を追加
        rest = text.slice(start);                     // 残り
    };
    // 残りの文字列を結合
    result += rest;
    return result;
};

/**
 * 文字の表示幅を考慮して範囲を切り出す
 * @param  {String}  text   文字列
 * @param  {Number}  start  開始位置
 * @param  {Number}  length 切り出す長さ
 * @param  {boolean} mode   …を末尾につけるか
 * @return {String}         切り出した文字列
 */
function strCat(text, start, length, mode) {
    let index, len, result = '';
    const words = split(text);
    for (index = start, len = length; len > 0; index++, len--) {
        const value = words[index];
        if (!value) {
            break;
        } else if (meaw.computeWidth(value) == 2) {
            len--;
        };
        result += value;
    };
    // 文末に"…"を追加
    if (mode && text.length != index) result += '…';
    return result;
};

/**
 * 文字列を最適化する
 * @param  {String} text 文字列
 * @return {String}      編集後の文字列
 */
function optimizeText(text) {
    return text.replace(/　/g, ' ').replace(/\n/g, ' ');
};

/**
 * 英数字を装飾文字に変換する
 * @param  {Object} options オプションオブジェクト
 * @param  {String} text    文字列
 * @return {String}         編集後の文字列
 */
function decorateCharacter(options, text) {
    const words = split(text);
    let style = {};
    let result = '';

    // 装飾文字
    if (options.bold)        style = { 'upper': 120211, 'lower': 120205, 'degits': 120764 };
    if (options.italic)      style = { 'upper': 120315, 'lower': 120309, 'degits': 120764 };
    if (options.serifbold)   style = { 'upper': 119743, 'lower': 119737, 'degits': 120734 };
    if (options.serifitalic) style = { 'upper': 119847, 'lower': 119841, 'degits': 120734 };
    if (options.script)      style = { 'upper': 119951, 'lower': 119945, 'degits':      0 };

    // １文字ずつ処理
    for (let word of words) {
        if (word.match(/[^A-Za-z0-9]/)) {
            result += word;
            continue;
        };
        // 装飾を反映
        let codePoint = word.codePointAt(0);
        if (word.match(/[A-Z]/)) {
            codePoint += style.upper;
        } else if (word.match(/[a-z]/)) {
            codePoint += style.lower;
        } else {
            codePoint += style.degits;
        };
        // 出力
        result += String.fromCodePoint(codePoint);
    };
    return result;
};

/**
 * TwitterAPIのエラー内容を表示
 * @param {Object} error エラーオブジェクト
 */
function showAPIErrorMsg(error) {
    const err = {
        32: '処理を完了できませんでした',
        34: '見つかりませんでした',
        64: 'アカウントが凍結されています',
        88: '読み込み回数の制限に達しました',
        89: '無効なアクセストークンです',
        130: '現在Twitterへのアクセスが集中しています',
        131: 'Twitter側で不明なエラーが発生しました',
        139: '既にいいねしたツイートです',
        144: '該当するツイートが見つかりませんでした',
        161: 'フォローに失敗しました',
        179: 'ツイートを閲覧する権限がありません',
        183: '他のユーザーのツイートは削除できません',
        185: '投稿回数の制限に達しました',
        187: 'ツイートが重複しています',
        327: '既にリツイートしたツイートです'
    };
    // オブジェクトが無い場合
    if (!error[0]) {
        info('e', 'エラー内容が取得できませんでした');
        return;
    };
    // エラー内容をリストから取得
    const code = error[0].code;
    let msg = err[code];    
    // リスト内に該当するエラーが無い場合、エラーオブジェクトのメッセージを代入
    if (!msg) msg = error[0].message;

    info('e', `${msg}(${code})`);
};

/**
 * Commanderのエラー内容を表示
 * @param {Object} error エラーオブジェクト
 */
function showCMDErrorMsg(error) {
    const ignore = [
        'commander.unknownCommand',
        'commander.unknownOption' ,
        'commander.missingArgument'
    ];
    // 無視する
    if (error.exitCode == 0) return;
    // リストに該当するエラーの場合無視する
    for (let code of ignore) {
        if (code == error.code) {
            return;
        };
    };
    console.error(error);
    process.exit(1);
};

/**
 * 設定データ削除
 */
function deleteConfig() {
    try {
        fs.unlinkSync(path.join(__dirname, '../config/config.json'));
        info('s', '削除しました');
    } catch (err) {
        console.error(err);
        info('e', '削除できませんでした');
    };
};

module.exports = {
    info,
    loadTextFile,
    drawHr,
    readlineSync,
    insert,
    strCat,
    optimizeText,
    decorateCharacter,
    showAPIErrorMsg,
    showCMDErrorMsg,
    deleteConfig
};
