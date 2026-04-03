#!/usr/bin/env node
/**
 * batch.js – Node.js CLI batch generator.
 * Uses the same HumanTypingGenerator logic (no modification to original generator.js).
 */

const fs = require('fs');
const readline = require('readline');

// ---------- Copy of HumanTypingGenerator (same as generator.js but self-contained) ----------
class HumanTypingGenerator {
    constructor() {
        this.durationParams = {
            fastTypist: { min: 40, max: 100 },
            normalTypist: { min: 80, max: 150 },
            slowTypist: { min: 100, max: 200 },
        };
    }

    normalRandom() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    logNormal(mu, sigma) {
        const z = this.normalRandom();
        return Math.exp(mu + sigma * z);
    }

    generateKeySpacing(targetWpm, charCount, testDuration) {
        const numGaps = charCount - 1;
        if (numGaps <= 0) return [];

        const targetSum = testDuration * 1000 - (Math.random() * 100 + 50);
        let longPauseCount = Math.ceil(numGaps * 0.025);
        let burstCount = Math.floor(numGaps * 0.48);
        let normalCount = numGaps - longPauseCount - burstCount;

        let absoluteMinSum = (longPauseCount * 300) + (normalCount * 80) + (burstCount * 20);
        if (targetSum < absoluteMinSum) {
            longPauseCount = 0;
            burstCount = Math.floor(numGaps * 0.48);
            normalCount = numGaps - burstCount;
            const minSumLevel2 = (normalCount * 80) + (burstCount * 20);
            if (targetSum < minSumLevel2) {
                burstCount = numGaps;
                normalCount = 0;
            }
        }

        let gaps = [];
        for (let i = 0; i < longPauseCount; i++) gaps.push(300 + Math.random() * 100);
        for (let i = 0; i < normalCount; i++) gaps.push(80 + Math.random() * Math.random() * 100);
        for (let i = 0; i < burstCount; i++) gaps.push(20 + Math.random() * 59);

        // shuffle
        for (let i = gaps.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gaps[i], gaps[j]] = [gaps[j], gaps[i]];
        }

        let currentSum = gaps.reduce((a, b) => a + b, 0);
        let diff = targetSum - currentSum;
        let attempts = 0;
        while (Math.abs(diff) > 0.1 && attempts < 5000) {
            const step = diff / gaps.length;
            for (let i = 0; i < gaps.length; i++) {
                const oldVal = gaps[i];
                const add = diff > 0;
                let newVal = oldVal + (Math.abs(step) * (add ? 1 : -1) * (0.8 + Math.random() * 0.4));
                if (!add) {
                    if (oldVal >= 300) newVal = Math.max(300.1, newVal);
                    else if (oldVal >= 80) newVal = Math.max(80.1, newVal);
                    else newVal = Math.max(20.1, newVal);
                } else {
                    if (oldVal < 80) newVal = Math.min(79.9, newVal);
                    else if (oldVal < 300) newVal = Math.min(299.9, newVal);
                }
                diff -= (newVal - oldVal);
                gaps[i] = newVal;
                if (Math.abs(diff) <= 0.1) break;
            }
            attempts++;
        }

        let roundedGaps = gaps.map(v => Math.round(v * 10) / 10);
        let roundedSum = roundedGaps.reduce((a, b) => a + b, 0);
        let floatCorrection = Math.round((targetSum - roundedSum) * 10);
        let idx = 0;
        while (Math.abs(floatCorrection) > 0 && idx < roundedGaps.length) {
            const sign = floatCorrection > 0 ? 1 : -1;
            const newVal = roundedGaps[idx] + (sign * 0.1);
            if (newVal >= 20.0) {
                roundedGaps[idx] = Math.round(newVal * 10) / 10;
                floatCorrection -= sign;
            }
            idx++;
        }
        return roundedGaps;
    }

    generateKeyDurations(charCount, targetWpm) {
        let profile;
        if (targetWpm > 120) profile = this.durationParams.fastTypist;
        else if (targetWpm > 70) profile = this.durationParams.normalTypist;
        else profile = this.durationParams.slowTypist;

        const baseDuration = (profile.min + profile.max) / 2;
        const durations = [];
        for (let i = 0; i < charCount; i++) {
            let duration = this.logNormal(Math.log(baseDuration), 0.3);
            duration = Math.max(profile.min * 0.7, Math.min(profile.max * 1.3, duration));
            const fpArtifact = (Math.random() - 0.5) * 0.0001;
            duration += fpArtifact;
            if (Math.random() > 0.3) {
                const artifactType = Math.floor(Math.random() * 4);
                switch (artifactType) {
                    case 0: duration = Math.round(duration * 100) / 100 + 0.00000000298023; break;
                    case 1: duration = Math.round(duration * 100) / 100 - 0.0000000089407; break;
                    case 2: duration = Math.round(duration * 100) / 100 + 0.00000000596046; break;
                    case 3: duration = Math.round(duration * 100) / 100 - 0.00000000298023; break;
                }
            } else {
                duration = Math.round(duration * 10) / 10;
            }
            durations.push(duration);
        }
        return durations;
    }

    calculateKeyOverlap(targetWpm, durations, spacings) {
        if (targetWpm < 60) return 0;
        let overlap = 0;
        const overlapProbability = Math.min(0.4, (targetWpm - 60) / 150);
        for (let i = 0; i < spacings.length; i++) {
            if (Math.random() < overlapProbability) {
                const potentialOverlap = Math.max(0, durations[i] - spacings[i]);
                if (potentialOverlap > 0) {
                    overlap += potentialOverlap * (0.3 + Math.random() * 0.5);
                }
            }
        }
        return Math.round(overlap * 10) / 10;
    }

    calculateCharStats(charTotal, accuracy) {
        const correctChars = Math.round(charTotal * (accuracy / 100));
        const rem = charTotal - correctChars;
        const extraChars = Math.floor(rem * Math.random() * 0.3);
        const incorrectChars = rem - extraChars;
        const missedChars = 0;
        return [correctChars, incorrectChars, extraChars, missedChars];
    }

    generateChartData(keySpacing, startToFirstKey, testDuration, charStats) {
        const absoluteTimes = [startToFirstKey];
        let current = startToFirstKey;
        for (const gap of keySpacing) {
            current += gap;
            absoluteTimes.push(current);
        }

        const totalTimeSec = testDuration;
        const numSeconds = Math.ceil(totalTimeSec);
        let keysProcessed = 0;
        const wpmData = [];
        const burstData = [];

        for (let s = 1; s <= numSeconds; s++) {
            const startSec = (s - 1) * 1000;
            const endSec = (s === numSeconds && totalTimeSec % 1 !== 0) ? totalTimeSec * 1000 : s * 1000;
            let keysInBucket = 0;
            while (keysProcessed < absoluteTimes.length && absoluteTimes[keysProcessed] <= endSec) {
                keysInBucket++;
                keysProcessed++;
            }
            const bucketDuration = (s === numSeconds && totalTimeSec % 1 !== 0) ? totalTimeSec - (s - 1) : 1;
            burstData.push(Math.round((keysInBucket / 5) * (60 / bucketDuration)));

            const wpmElapsed = (s === numSeconds && totalTimeSec % 1 !== 0) ? totalTimeSec : s;
            const correctRatio = charStats[0] / (charStats[0] + charStats[1] + charStats[2] + charStats[3]);
            const currentWpm = Math.round(((keysProcessed * correctRatio) / 5) * (60 / wpmElapsed) * 100) / 100;
            wpmData.push(currentWpm);
        }
        wpmData[wpmData.length - 1] = Math.round((charStats[0] / 5) * (60 / testDuration) * 100) / 100;
        return { wpm: wpmData, burst: burstData, err: new Array(wpmData.length).fill(0) };
    }

    mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
    stdDev(arr) {
        const avg = this.mean(arr);
        const sq = arr.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(sq.reduce((a, b) => a + b, 0) / arr.length);
    }
    kogasa(cv) {
        const taylorSum = cv + Math.pow(cv, 3) / 3 + Math.pow(cv, 5) / 5;
        return 100 * (1 - Math.tanh(taylorSum));
    }

    generate(config) {
        const {
            targetWpm = 90,
            testDuration = 30,
            mode = 'time',
            targetAcc = 96,
            language = 'english',
            punctuation = false,
            numbers = false,
            uid = ''
        } = config;

        const expectedCharTotal = Math.round(targetWpm * 5 * testDuration / 60);
        const charStats = this.calculateCharStats(expectedCharTotal, targetAcc);
        const actualCharTotal = charStats.reduce((a, b) => a + b, 0);

        const actualWpm = Math.round((charStats[0] / 5) * (60 / testDuration) * 100) / 100;
        const rawWpm = Math.round(((charStats[0] + charStats[1] + charStats[2]) / 5) * (60 / testDuration) * 100) / 100;

        const keySpacing = this.generateKeySpacing(targetWpm, actualCharTotal, testDuration);
        const keyDuration = this.generateKeyDurations(actualCharTotal, targetWpm);
        const keyOverlap = this.calculateKeyOverlap(targetWpm, keyDuration, keySpacing);

        const totalSpacingTime = keySpacing.reduce((a, b) => a + b, 0);
        const remainingTime = (testDuration * 1000) - totalSpacingTime;
        const startToFirstKey = Math.max(0, Math.round(remainingTime * 0.3 * 100) / 100);
        const lastKeyToEnd = Math.max(0, Math.round((remainingTime - startToFirstKey) * 100) / 100);

        const chartData = this.generateChartData(keySpacing, startToFirstKey, testDuration, charStats);

        const spacingMean = this.mean(keySpacing);
        const spacingStdDev = this.stdDev(keySpacing);
        const spacingCV = spacingStdDev / spacingMean;

        const durationMean = this.mean(keyDuration);
        const durationStdDev = this.stdDev(keyDuration);
        const durationCV = durationStdDev / durationMean;

        const consistency = Math.round(this.kogasa(spacingCV) * 100) / 100;
        const keyConsistency = Math.round(this.kogasa(durationCV) * 100) / 100;
        const wpmConsistency = Math.round(this.kogasa(this.stdDev(chartData.wpm) / this.mean(chartData.wpm)) * 100) / 100;

        const result = {
            wpm: actualWpm,
            rawWpm: rawWpm,
            charStats: charStats,
            charTotal: actualCharTotal,
            acc: Math.round(targetAcc * 100) / 100,
            mode: mode,
            mode2: testDuration.toString(),
            punctuation: punctuation,
            numbers: numbers,
            lazyMode: false,
            timestamp: Date.now(),
            language: language,
            restartCount: Math.floor(Math.random() * 3),
            incompleteTests: [],
            incompleteTestSeconds: 0,
            difficulty: 'normal',
            blindMode: false,
            tags: [],
            keySpacing: keySpacing,
            keyDuration: keyDuration,
            keyOverlap: keyOverlap,
            lastKeyToEnd: lastKeyToEnd,
            startToFirstKey: startToFirstKey,
            consistency: consistency,
            wpmConsistency: wpmConsistency,
            keyConsistency: keyConsistency,
            funbox: [],
            bailedOut: false,
            chartData: chartData,
            testDuration: testDuration,
            afkDuration: 0,
            stopOnLetter: false
        };
        if (uid) result.uid = uid;
        result.hash = 'cli_generated_' + require('crypto').createHash('md5').update(JSON.stringify(result)).digest('hex').slice(0, 16);

        return {
            result, stats: {
                spacingCV: Math.round(spacingCV * 1000) / 1000,
                durationCV: Math.round(durationCV * 1000) / 1000,
                spacingMean: Math.round(spacingMean * 10) / 10,
                durationMean: Math.round(durationMean * 10) / 10,
                spacingStdDev: Math.round(spacingStdDev * 10) / 10,
                durationStdDev: Math.round(durationStdDev * 10) / 10
            }
        };
    }
}

// ---------- CLI logic ----------
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function parseWpmList(input) {
    const wpms = new Set();
    const parts = input.split(',');
    for (let part of parts) {
        part = part.trim();
        if (part.includes('-')) {
            let step = 1;
            let rangePart = part;
            if (part.includes(':')) {
                const [r, s] = part.split(':');
                rangePart = r;
                step = parseInt(s, 10);
            }
            const [start, end] = rangePart.split('-').map(Number);
            for (let w = start; w <= end; w += step) wpms.add(w);
        } else {
            wpms.add(parseInt(part, 10));
        }
    }
    return Array.from(wpms).sort((a, b) => a - b);
}

rl.question('Enter WPM list (e.g., 60,80,100 or 60-120:5): ', (wpmInput) => {
    const wpms = parseWpmList(wpmInput);
    if (wpms.length === 0) {
        console.log('No valid WPM values.');
        rl.close();
        return;
    }

    rl.question('Test duration (seconds) [30]: ', (dur) => {
        const testDuration = parseInt(dur, 10) || 30;
        rl.question('Target accuracy (%) [96]: ', (acc) => {
            const targetAcc = parseFloat(acc) || 96;
            rl.question('User ID (optional): ', (uid) => {
                const generator = new HumanTypingGenerator();
                const logFile = 'generated.log';
                const stream = fs.createWriteStream(logFile, { flags: 'a' });
                let count = 0;

                for (const wpm of wpms) {
                    const payload = generator.generate({
                        targetWpm: wpm,
                        testDuration: testDuration,
                        targetAcc: targetAcc,
                        uid: uid
                    });
                    stream.write(JSON.stringify(payload.result) + '\n');
                    count++;
                }
                stream.end();
                console.log(`✅ Generated ${count} payload(s) and appended to ${logFile}`);
                rl.close();
            });
        });
    });
});