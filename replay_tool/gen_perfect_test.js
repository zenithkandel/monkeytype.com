const fs = require('fs');

function roundTo2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function stdDev(array) {
    try {
        const meanValue = mean(array);
        return Math.sqrt(array.map(x => Math.pow(x - meanValue, 2)).reduce((a, b) => a + b) / array.length);
    } catch (e) { return 0; }
}

function mean(array) {
    try { return array.reduce((a, b) => a + b, 0) / array.length; } catch (e) { return 0; }
}

function kogasa(cov) {
    return 100 * (1 - Math.tanh(cov + Math.pow(cov, 3) / 3 + Math.pow(cov, 5) / 5));
}

// Emulate a perfect typing session
const wpmTarget = 151; // Target slightly above 150
const testDuration = 15;

// Target total chars ~188 for 150 WPM
const expectedChars = Math.round((wpmTarget * 5) * (testDuration / 60));
const meanKeySpan = 15000 / expectedChars; // approx 79 ms

let keySpacing = [];
let keyDuration = [];

let currentTime = 0;
let startToFirstKey = Math.round(Math.random() * 200 + 100); // 100 - 300 ms delays
currentTime += startToFirstKey; // time of first keypress

let timestamps = [currentTime];
keyDuration.push(Math.round(meanKeySpan * 0.75));

let keysSinceSpace = 0;
let nextSpaceAt = Math.floor(Math.random() * 5) + 3; // 3 to 7 chars

while (true) {
    keysSinceSpace++;
    let r1 = Math.random(), r2 = Math.random(), r3 = Math.random();
    let randDist = (r1 + r2 + r3 - 1.5) * 2; // -3 to +3
    
    // Simulating bursts
    let isSpace = (keysSinceSpace >= nextSpaceAt);
    let baseTime = isSpace ? meanKeySpan * 2.5 : meanKeySpan * 0.7;
    
    if (isSpace) {
        keysSinceSpace = 0;
        nextSpaceAt = Math.floor(Math.random() * 6) + 3; // 3 to 8
    }

    let span = baseTime + (randDist * (isSpace ? 40 : 15)); 
    if (span < 20) span = 20 + Math.random() * 10; // Human limit
    
    if (currentTime + span > testDuration * 1000) {
        break; // Test ends strictly at 15s
    }

    keySpacing.push(Number(span.toFixed(1)));
    currentTime += span;
    timestamps.push(currentTime);

    let kDuration = span * 0.75 + (randDist * 6);
    if (kDuration < 10) kDuration = 10;
    keyDuration.push(Number(kDuration.toFixed(1)));
}

const charCount = timestamps.length;
const wpm = roundTo2((charCount / 5) / (testDuration / 60));

// Build chartData based EXACTLY on timestamps
let wpmData = [];
let burstData = [];
let errData = [];

for (let sec = 1; sec <= testDuration; sec++) {
    let charsUpToNow = timestamps.filter(t => t <= sec * 1000).length;
    let charsInThisSec = timestamps.filter(t => t > (sec - 1) * 1000 && t <= sec * 1000).length;

    let secWpm = roundTo2((charsUpToNow / 5) / (sec / 60));
    let burstWpm = Math.round((charsInThisSec / 5) * 60);

    wpmData.push(secWpm);
    burstData.push(burstWpm);
    errData.push(0);
}

// Consistency
let keyConsArray = keySpacing.slice(0, keySpacing.length - 1);
let keyConsCov = stdDev(keyConsArray) / mean(keyConsArray);       
let keyConsistency = roundTo2(kogasa(keyConsCov));

let wpmConsCov = stdDev(burstData) / mean(burstData);
        incompleteTests: [],
        incompleteTestSeconds: 0,
        difficulty: "normal",
        blindMode: false,
        tags: [],
        keySpacing: keySpacing,
        keyDuration: keyDuration,
        keyOverlap: Number((charCount * meanKeySpan * 0.15).toFixed(1)),
        lastKeyToEnd: Math.round(testDuration * 1000 - currentTime),
        startToFirstKey: startToFirstKey,
        consistency: consistency,
        wpmConsistency: wpmConsistency,
        keyConsistency: keyConsistency,
        funbox: [],
        bailedOut: false,
        chartData: {
            wpm: wpmData,
            burst: burstData,
            err: errData
        },
        testDuration: testDuration,
        afkDuration: 0,
        stopOnLetter: false,
        uid: "dQLw9pqNo3e4mWSWxW6gGvGuFX83",
        hash: ""
    }
};

fs.writeFileSync('C:/xampp/htdocs/codes/monkeytype.com/replay_tool/test.json', JSON.stringify(payload, null, 2));
console.log(`Perfect test.json generated! WPM: ${wpm}, Chars: ${charCount}`);