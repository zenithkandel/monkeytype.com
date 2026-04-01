const fs = require('fs');

function stdDev(array) {
    try {
        const n = array.length;
        const meanValue = mean(array);
        return Math.sqrt(
            array.map((x) => Math.pow(x - meanValue, 2)).reduce((a, b) => a + b) / n
        );
    } catch (e) {
        return 0;
    }
}

function mean(array) {
    try {
        return array.reduce((previous, current) => current + previous, 0) / array.length;
    } catch (e) {
        return 0;
    }
}

function kogasa(cov) {
    return 100 * (1 - Math.tanh(cov + Math.pow(cov, 3) / 3 + Math.pow(cov, 5) / 5));
}

function roundTo2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

const wpmTarget = 129.54;
const testDuration = 15;
const charCount = Math.round((wpmTarget * 5) * (testDuration / 60)); // 162 total chars
// wait, wpm is formula: wpm = (charTotals / 5) / (testDuration / 60)
// let's use exact WPM:
const wpm = roundTo2((charCount / 5) / (testDuration / 60));
const rawWpm = wpm;

const meanSpacing = (testDuration * 1000) / charCount;

let keySpacing = [];
let keyDuration = [];
let totalTime = 0;

for (let i = 0; i < charCount; i++) {
    // human variation is skewed normal. Most people type in bursts.
    // add small gaussian-ish noise
    let r1 = Math.random();
    let r2 = Math.random();
    let r3 = Math.random();
    let randDist = (r1 + r2 + r3 - 1.5) * 2; // Roughly normal distribution between -3 and 3

    let s = meanSpacing + (randDist * 8); // Std dev ~ 8ms
    let d = meanSpacing * 0.75 + (randDist * 6); // Held roughly 75% of spacing

    keySpacing.push(Number(s.toFixed(1)));
    keyDuration.push(Number(d.toFixed(1)));
    totalTime += s;
}

// Consistency
let keyConsistencyArray = keySpacing.slice(0, keySpacing.length - 1);
let keyConsCov = stdDev(keyConsistencyArray) / mean(keyConsistencyArray);
let keyConsistency = roundTo2(kogasa(keyConsCov));

// chart data
let wpmData = [];
let burstData = [];
for (let i = 0; i < testDuration; i++) {
    // Generate realistic fluctuating WPM array
    let baseWpm = Math.round(wpmTarget + (Math.random() * 12 - 6));
    wpmData.push(baseWpm);
    burstData.push(baseWpm + Math.round(Math.random() * 8));
}

let wpmConsCov = stdDev(wpmData) / mean(wpmData);
let wpmConsistency = roundTo2(kogasa(wpmConsCov));
let consistency = wpmConsistency; // Very similar since 100% acc

const payload = {
    result: {
        wpm: wpm,
        rawWpm: rawWpm,
        charStats: [charCount, 0, 0, 0],
        charTotal: charCount,
        acc: 100,
        mode: "time",
        mode2: String(testDuration),
        punctuation: false,
        numbers: false,
        lazyMode: false,
        timestamp: Date.now(),
        language: "english",
        restartCount: 2,
        incompleteTests: [],
        incompleteTestSeconds: 7.81,
        difficulty: "normal",
        blindMode: false,
        tags: [],
        keySpacing: keySpacing,
        keyDuration: keyDuration,
        keyOverlap: Number((charCount * meanSpacing * 0.15).toFixed(1)), // ~15% overlap
        lastKeyToEnd: Math.round(Math.random() * 40),
        startToFirstKey: Math.round(Math.random() * 300),
        consistency: consistency,
        wpmConsistency: wpmConsistency,
        keyConsistency: keyConsistency,
        funbox: [],
        bailedOut: false,
        chartData: {
            wpm: wpmData,
            burst: burstData,
            err: Array(testDuration).fill(0)
        },
        testDuration: testDuration,
        afkDuration: 0,
        stopOnLetter: false,
        uid: "dQLw9pqNo3e4mWSWxW6gGvGuFX83",
        hash: ""
    }
};

fs.writeFileSync('C:/xampp/htdocs/codes/monkeytype.com/replay_tool/test.json', JSON.stringify(payload, null, 2));
console.log('Math-verified test.json generated!');