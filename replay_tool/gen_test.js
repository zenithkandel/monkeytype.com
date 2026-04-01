const fs = require('fs');

const wpmTarget = 132;
const testTimeSeconds = 15;
const charCount = Math.round((wpmTarget * 5) * (testTimeSeconds / 60)); // 165 chars

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return (Math.random() * (max - min) + min).toFixed(2);
}

const keySpacing = [];
const keyDuration = [];
for (let i = 0; i < charCount; i++) {
    // Average space for 132wpm is ~90.9
    // Variations between 60 to 140
    let space = randomInt(60, 130);
    // Average duration a key is held
    let duration = randomInt(50, 110);

    // add small floats
    space += Math.random();
    duration += Math.random();

    keySpacing.push(parseFloat(space.toFixed(1)));
    keyDuration.push(parseFloat(duration.toFixed(1)));
}

let wpmData = [];
let burstData = [];
let errData = [];
for (let i = 0; i < testTimeSeconds; i++) {
    wpmData.push(randomInt(wpmTarget - 8, wpmTarget + 8));
    burstData.push(randomInt(wpmTarget, wpmTarget + 15));
    errData.push(0);
}

const payload = {
    result: {
        wpm: wpmTarget,
        rawWpm: wpmTarget,
        charStats: [charCount, 0, 0, 0],
        charTotal: charCount,
        acc: 100,
        mode: "time",
        mode2: "15",
        punctuation: false,
        numbers: false,
        lazyMode: false,
        timestamp: Date.now(),
        language: "english",
        restartCount: 0,
        incompleteTests: [],
        incompleteTestSeconds: 0,
        difficulty: "normal",
        blindMode: false,
        tags: [],
        keySpacing: keySpacing,
        keyDuration: keyDuration,
        keyOverlap: 3500.5,
        lastKeyToEnd: randomInt(10, 50),
        startToFirstKey: randomInt(100, 250),
        consistency: parseFloat(randomFloat(75, 85)),
        wpmConsistency: parseFloat(randomFloat(80, 92)),
        keyConsistency: parseFloat(randomFloat(55, 70)),
        funbox: [],
        bailedOut: false,
        chartData: {
            wpm: wpmData,
            burst: burstData,
            err: errData
        },
        testDuration: 15.00,
        afkDuration: 0,
        stopOnLetter: false,
        uid: "user-uid-here",
        hash: ""
    }
};

fs.writeFileSync('C:/xampp/htdocs/codes/monkeytype.com/replay_tool/test.json', JSON.stringify(payload, null, 2));
console.log('test.json generated!');