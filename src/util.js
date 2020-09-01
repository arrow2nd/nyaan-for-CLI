'use strict';
const readline = require('readline');
const colors = require('colors');
const split = require('graphemesplit');

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
        rl.question('>'.white + '> '.cyan, (input) => {
            rl.close();
            resolve(input.split(' '));
        });
    });
};

/**
 * タグを降順でソート
 * @param  {Array}  array 文字列配列
 * @param  {String} key   比較する要素のキー
 * @return {Array}        ソートした文字列配列
 */
function sortTag(array, key) {
    return array.sort((a,b) => {
        if (a[key].length > b[key].length) return -1;
        if (a[key].length < b[key].length) return 1;
        return 0;
    });
};

/**
 * 文字列の表示幅を取得
 * @param  {String} text テキスト
 * @return {Number}      全角文字を2とした文字列全体の表示幅
 */
function getStrWidth(text) {
    let len = 0;
    const words = split(text);
    for (let value of words) {
        if (!value.match(/[^\x01-\x7E]/) || !value.match(/[^\uFF65-\uFF9F]/)) {
            len ++;
        } else {
            len += 2;
        };
    };
    return len;
};

/**
 * 文字列に指定した間隔で文字を挿入（ちょっと怪しい）
 * @param  {String} text   文字列
 * @param  {Number} length 挿入する間隔（表示幅）
 * @param  {String} add    挿入する文字
 * @return {String}        編集後の文字列
 */
function insert(text, length, add) {
    let start = 0, result = '', rest = text;    
    while (length < getStrWidth(rest)) {
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
        } else if (getStrWidth(value) == 2) {
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
 * @param  {String} styleType 文字種類
 * @param  {String} text      文字列
 * @return {String}           編集後の文字列
 */
function decorateCharacter(styleType, text) {
    const styles = {
        'sans'       : { 'upper': 120211, 'lower': 120205, 'degits': 120764 },
        'sansItalic' : { 'upper': 120315, 'lower': 120309, 'degits': 120764 },
        'serif'      : { 'upper': 119743, 'lower': 119737, 'degits': 120734 },
        'serifItalic': { 'upper': 119847, 'lower': 119841, 'degits': 120734 },
        'script'     : { 'upper': 119951, 'lower': 119945, 'degits':      0 }
    };
    const words = split(text);
    let result = '';
    // １文字ずつ処理
    for (let word of words) {
        if (word.match(/[^A-Za-z0-9]/)) {
            result += word;
            continue;
        };
        // 装飾を反映
        let codePoint = word.codePointAt(0);
        if (word.match(/[A-Z]/)) {
            codePoint += styles[styleType].upper;
        } else if (word.match(/[a-z]/)) {
            codePoint += styles[styleType].lower;
        } else {
            codePoint += styles[styleType].degits;
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
        console.log(' Error '.bgRed + ' エラー内容が取得できませんでした'.brightRed);
        return;
    };
    // エラー内容をリストから取得
    const code = error[0].code;
    let msg = err[code];    
    // リスト内に該当するエラーが無い場合、エラーオブジェクトのメッセージを代入
    if (!msg) msg = error[0].message;

    console.log(' Error '.bgRed + ` ${msg}(${code})`.brightRed);
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
    console.log(error);
    process.exit(1);
};

module.exports = {
    readlineSync,
    sortTag,
    getStrWidth,
    insert,
    strCat,
    optimizeText,
    decorateCharacter,
    showAPIErrorMsg,
    showCMDErrorMsg
};
