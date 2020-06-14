'use strict';
const readline = require('readline');
const colors = require('colors');
const emoji = require('node-emoji');

/**
 * コンソールからの入力を受け付ける
 * @return {Array} 文字列配列
 */
function readlineSync(){
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        // 入力受付
        rl.question('nyaan >'.cyan + '>'.brightCyan + '> '.brightWhite, (input) => {
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
function sortTag(array, key){
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
function getStrWidth(text){
    let len = 0;
    for (let value of text){
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
 * @param  {Number} length 挿入する間隔（全角は2文字）
 * @param  {String} add    挿入する文字
 * @return {String}        編集後の文字列
 */
function insert(text, length, add){
    let index, len, start = 0;
    let result = '', rest = text;

    while (length < getStrWidth(rest)){
        // 文字の表示幅を考慮して範囲を切り出し
        for (index = start, len = length; len > 0; index++, len--){
            const value = text[index];
            if (!value){
                break;
            } else if (getStrWidth(value) == 2){
                len--;
            };
            result += value;
        };
        // 指定の文字を追加
        result += add;
        // 切り出し位置をズラす
        start = index;
        // 残り
        rest = text.slice(start);
    };

    // 残りの文字列を結合
    result += rest;
    return result;
};

/**
 * 文字列から全角スペース・改行・絵文字を取り除く
 * @param  {String} text 文字列
 * @return {String}      編集後の文字列
 */
function optimizeText(text){
    text = text.replace(/　/g, ' ');
    text = text.replace(/\n/g, ' ');
    text = emoji.strip(text);
    return text;
};

/**
 * エラー内容を表示
 * @param {Object} error エラーオブジェクト
 */
function showErrorMsg(error){
    const err = {
        32: '処理を完了できませんでした',
        34: '見つかりませんでした',
        64: 'アカウントが凍結されています',
        88: '読み込み回数の制限に達しました',
        130: '現在Twitterへのアクセスが集中しています',
        131: 'Twitter側で不明なエラーが発生しました',
        144: '該当するツイートが見つかりませんでした',
        161: 'フォローに失敗しました',
        179: 'ツイートを閲覧する権限がありません',
        185: '投稿回数の制限に達しました',
        187: 'ツイートが重複しています'
    };

    // オブジェクトが無い場合
    if (!error[0]){
        console.log('Error: エラー内容が取得できませんでした'.brightRed);
        return;
    };

    // エラーを表示
    const code = error[0].code;
    let msg = err[code];
    if (!msg){
        msg = error[0].message;
    };
    console.log(`Error: ${msg}(${code})`.brightRed);
};

module.exports = {
    readlineSync,
    sortTag,
    getStrWidth,
    insert,
    optimizeText,
    showErrorMsg
};