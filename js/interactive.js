'use strict';
const { getTimeline } = require('./tweet.js');
const util = require('./util.js');


async function main(){
    // とりあえずタイムライン表示
    await getTimeline(20);
    // 入力待ち
    return await util.readlineSync();
};

module.exports = {
    main
};
