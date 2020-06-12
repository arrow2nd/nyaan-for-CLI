const emoji = require('node-emoji');

const width = process.stdout.columns;
let text = 'Illustrator ／『ILLUSTRATION 2019』『美しい情景イラストレーション』作品掲載。 装画、音楽動画、広告用イラストの制作。 pixiv：https://t.co/YEGtuDhzbz 通販：https://t.co/bvM8RAtsTM ✉m.mic.0707@gmail.com ※無断転載✖';
text = optimizeText(text);

console.log('    desc: ' + text + '\n');
console.log('    desc: ' + insert(text, (width - 12), '\n          '));

function optimizeText(text){
    text = text.replace(/　/g, ' ');
    text = text.replace(/\n/g, ' ');
    text = emoji.strip(text);
    return text;
};

/**
 * 文字列の表示幅を取得
 * @param  {String} text 文字列
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
 * 文字列に指定した間隔で文字を挿入
 * @param  {String} text   文字列
 * @param  {Number} length 挿入する間隔（全角文字は2とする）
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
