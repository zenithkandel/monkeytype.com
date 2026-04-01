/**
 * MonkeyType Human-Like Payload Generator - Node.js CLI Version
 * 
 * Usage:
 *   node payload-cli.js --wpm 90 --duration 30 --uid YOUR_UID
 * 
 * This generates payloads with realistic human typing patterns:
 * - Log-normal distribution (NOT uniform/gaussian)
 * - CV of 0.3-0.8 (bots have 0.01-0.1)
 * - Burst patterns and word boundaries
 * - Fatigue curves
 * - Proper hash generation
 */

const crypto = require('crypto');

// Try to import object-hash, fall back to custom implementation
let objectHash;
try {
    objectHash = require('object-hash');
} catch (e) {
    console.log('Note: object-hash not installed. Using fallback hash implementation.');
    console.log('For production use, run: npm install object-hash@3.0.0');
    objectHash = (obj) => {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        return crypto.createHash('sha1').update(str).digest('hex');
    };
}

class HumanTypingGenerator {
    constructor() {
        // Human typing parameters calibrated from real data analysis
        this.spacingParams = {
            burstMin: 40,
            burstMax: 80,
            normalMin: 80,
            normalMax: 150,
            thinkMin: 150,
            thinkMax: 400,
            hesitationMin: 400,
            hesitationMax: 800,
        };

        this.durationParams = {
            fastTypist: { min: 40, max: 100 },
            normalTypist: { min: 80, max: 150 },
            slowTypist: { min: 100, max: 200 },
        };

        // CV targets - humans are 0.3-0.8, bots are 0.01-0.1
        this.targetCV = { min: 0.35, max: 0.75 };
    }

    // Box-Muller transform for normal distribution
    normalRandom() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    // Log-normal distribution (matches human timing patterns)
    logNormal(mu, sigma) {
        const z = this.normalRandom();
        return Math.exp(mu + sigma * z);
    }

    // Gamma distribution
    gamma(shape, scale) {
        if (shape < 1) {
            return this.gamma(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
        }
        const d = shape - 1 / 3;
        const c = 1 / Math.sqrt(9 * d);
        while (true) {
            let x, v;
            do {
                x = this.normalRandom();
                v = 1 + c * x;
            } while (v <= 0);
            v = v * v * v;
            const u = Math.random();
            if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
        }
    }

    // Convert WPM to mean key spacing in ms
    wpmToMeanSpacing(wpm) {
        return 12000 / wpm;
    }

    // Generate human-like key spacing
    generateKeySpacing(targetWpm, charCount, testDuration) {
        const spacings = [];
        const targetMeanSpacing = this.wpmToMeanSpacing(targetWpm);

        // Word boundaries (spaces occur ~every 5 chars)
        const numSpaces = Math.floor(charCount / 5);
        const spacePositions = new Set();
        for (let i = 0; i < numSpaces; i++) {
            spacePositions.add(Math.floor((i + 1) * 5) - 1);
        }

        let inBurst = false;
        let burstLength = 0;
        let burstCounter = 0;
        const fatigueStartRatio = 0.6;

        for (let i = 0; i < charCount - 1; i++) {
            const progress = i / (charCount - 1);

            // Fatigue factor (slight increase towards end)
            let fatigueFactor = 1.0;
            if (progress > fatigueStartRatio) {
                fatigueFactor = 1.0 + 0.15 * ((progress - fatigueStartRatio) / (1 - fatigueStartRatio));
            }

            let spacing;

            // Word boundary - longer pause
            if (spacePositions.has(i)) {
                if (Math.random() < 0.15) {
                    spacing = this.logNormal(Math.log(300), 0.4) * fatigueFactor;
                    spacing = Math.max(200, Math.min(600, spacing));
                } else {
                    spacing = this.logNormal(Math.log(180), 0.35) * fatigueFactor;
                    spacing = Math.max(100, Math.min(350, spacing));
                }
                inBurst = false;
            }
            // Burst typing
            else if (inBurst && burstCounter < burstLength) {
                spacing = this.gamma(8, targetMeanSpacing / 12) * fatigueFactor;
                spacing = Math.max(35, Math.min(90, spacing));
                burstCounter++;
                if (burstCounter >= burstLength) inBurst = false;
            }
            // Normal typing
            else {
                if (Math.random() < 0.25) {
                    inBurst = true;
                    burstLength = Math.floor(Math.random() * 4) + 2;
                    burstCounter = 0;
                    spacing = this.gamma(8, targetMeanSpacing / 12) * fatigueFactor;
                    spacing = Math.max(35, Math.min(90, spacing));
                    burstCounter++;
                } else {
                    const logMu = Math.log(targetMeanSpacing);
                    const logSigma = 0.4 + Math.random() * 0.2;
                    spacing = this.logNormal(logMu, logSigma) * fatigueFactor;

                    // Occasional thinking pause
                    if (Math.random() < 0.03) {
                        spacing = this.logNormal(Math.log(250), 0.3);
                        spacing = Math.max(150, Math.min(450, spacing));
                    }
                }
            }

            spacing = Math.max(30, Math.min(700, spacing));
            spacing = Math.round(spacing * 10) / 10;
            spacings.push(spacing);
        }

        return this.scaleToTestDuration(spacings, testDuration);
    }

    scaleToTestDuration(spacings, testDuration) {
        const currentSum = spacings.reduce((a, b) => a + b, 0);
        const targetSum = testDuration * 1000;
        const margin = Math.random() * 100 + 50;
        const adjustedTarget = targetSum - margin;
        const scale = adjustedTarget / currentSum;
        return spacings.map(s => Math.round(s * scale * 10) / 10);
    }

    generateKeyDurations(charCount, targetWpm) {
        const durations = [];
        let profile;
        if (targetWpm > 120) profile = this.durationParams.fastTypist;
        else if (targetWpm > 70) profile = this.durationParams.normalTypist;
        else profile = this.durationParams.slowTypist;

        const baseDuration = (profile.min + profile.max) / 2;

        for (let i = 0; i < charCount; i++) {
            let duration = this.logNormal(Math.log(baseDuration), 0.3);
            duration = Math.max(profile.min * 0.7, Math.min(profile.max * 1.3, duration));

            // Add browser-like floating point precision artifacts
            // Real data has values like 158.20000000298023 or 47.3999999910593
            const fpArtifact = (Math.random() - 0.5) * 0.0001;
            duration = duration + fpArtifact;

            // Apply typical browser timestamp patterns
            if (Math.random() > 0.3) {
                // About 70% have the typical artifact pattern
                const artifactType = Math.floor(Math.random() * 4);
                switch (artifactType) {
                    case 0: duration = Math.round(duration * 100) / 100 + 0.00000000298023; break;
                    case 1: duration = Math.round(duration * 100) / 100 - 0.0000000089407; break;
                    case 2: duration = Math.round(duration * 100) / 100 + 0.00000000596046; break;
                    case 3: duration = Math.round(duration * 100) / 100 - 0.00000000298023; break;
                }
            } else {
                // 30% have clean values like 109.5 or 81
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

    generateChartWpm(targetWpm, duration) {
        const wpmData = [];
        const numSeconds = Math.ceil(duration);
        let currentWpm = targetWpm + (Math.random() - 0.5) * 20;

        for (let i = 0; i < numSeconds; i++) {
            const progress = i / numSeconds;
            const drift = (targetWpm - currentWpm) * 0.3;
            const noise = (Math.random() - 0.5) * 25;
            const fatigue = progress > 0.7 ? -(progress - 0.7) * 10 : 0;
            currentWpm += drift + noise + fatigue;

            if (Math.random() < 0.05) currentWpm += Math.random() * 15;
            if (Math.random() < 0.05) currentWpm -= Math.random() * 15;

            currentWpm = Math.max(targetWpm * 0.6, Math.min(targetWpm * 1.4, currentWpm));
            wpmData.push(Math.round(currentWpm));
        }
        return wpmData;
    }

    generateChartBurst(targetWpm, duration) {
        const burstData = [];
        const numSeconds = Math.ceil(duration);
        const burstValues = [36, 48, 60, 72, 84, 96, 108, 120, 132, 144];
        const baseIndex = burstValues.findIndex(v => v >= targetWpm);
        const centerIndex = Math.max(0, Math.min(burstValues.length - 2, baseIndex - 1));

        for (let i = 0; i < numSeconds; i++) {
            const offset = Math.floor(this.normalRandom() * 2);
            const index = Math.max(0, Math.min(burstValues.length - 1, centerIndex + offset));
            burstData.push(burstValues[index]);
        }
        return burstData;
    }

    generateChartErrors(duration, targetAcc) {
        const errors = [];
        const numSeconds = Math.ceil(duration);
        const errorRate = (100 - targetAcc) / 100;
        const expectedTotalErrors = Math.round(numSeconds * 5 * errorRate);

        for (let i = 0; i < numSeconds; i++) errors.push(0);

        let remainingErrors = expectedTotalErrors;
        while (remainingErrors > 0) {
            const pos = Math.floor(Math.random() * numSeconds);
            const clusterSize = Math.min(remainingErrors, Math.floor(Math.random() * 3) + 1);
            errors[pos] += clusterSize;
            remainingErrors -= clusterSize;
        }
        return errors;
    }

    kogasa(cv) {
        const taylorSum = cv + Math.pow(cv, 3) / 3 + Math.pow(cv, 5) / 5;
        return 100 * (1 - Math.tanh(taylorSum));
    }

    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    stdDev(arr) {
        const avg = this.mean(arr);
        const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
    }

    calculateCharStats(charTotal, accuracy) {
        const correctChars = Math.round(charTotal * accuracy / 100);
        const incorrectChars = Math.round(charTotal * (100 - accuracy) / 100);
        const extraChars = Math.floor(incorrectChars * Math.random() * 0.3);
        return [correctChars, incorrectChars, extraChars, 0];
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

        const charTotal = Math.round(targetWpm * 5 * testDuration / 60);

        const keySpacing = this.generateKeySpacing(targetWpm, charTotal, testDuration);
        const keyDuration = this.generateKeyDurations(charTotal, targetWpm);
        const keyOverlap = this.calculateKeyOverlap(targetWpm, keyDuration, keySpacing);

        const totalSpacingTime = keySpacing.reduce((a, b) => a + b, 0);
        const remainingTime = (testDuration * 1000) - totalSpacingTime;
        // These are decimals rounded to 2 decimal places (like real data: 275.38, 124.8)
        const startToFirstKey = Math.max(0, Math.round(remainingTime * 0.3 * 100) / 100);
        const lastKeyToEnd = Math.max(0, Math.round(remainingTime * 0.7 * 100) / 100);

        const chartWpm = this.generateChartWpm(targetWpm, testDuration);
        const chartBurst = this.generateChartBurst(targetWpm, testDuration);
        const chartErr = this.generateChartErrors(testDuration, targetAcc);

        const spacingMean = this.mean(keySpacing);
        const spacingStdDev = this.stdDev(keySpacing);
        const spacingCV = spacingStdDev / spacingMean;

        const durationMean = this.mean(keyDuration);
        const durationStdDev = this.stdDev(keyDuration);
        const durationCV = durationStdDev / durationMean;

        const consistency = Math.round(this.kogasa(spacingCV) * 100) / 100;
        const keyConsistency = Math.round(this.kogasa(durationCV) * 100) / 100;
        const wpmConsistency = Math.round(this.kogasa(this.stdDev(chartWpm) / this.mean(chartWpm)) * 100) / 100;

        const charStats = this.calculateCharStats(charTotal, targetAcc);

        const rawWpm = Math.round((charTotal / 5) * (60 / testDuration) * 100) / 100;
        const actualWpm = Math.round((charStats[0] / 5) * (60 / testDuration) * 100) / 100;
        // Monkeytype accuracy is roughly (correct / charTotal) * 100
        const acc = Math.round(((charStats[0] + (charStats[1] * 0.5)) / charTotal) * 100 * 100) / 100; // Actually it's often close to correct/charTotal

        const result = {
            wpm: actualWpm,
            rawWpm: rawWpm,
            charStats: charStats,
            charTotal: charTotal,
            acc: Math.round(targetAcc * 100) / 100, // Revert exact match, or use calculated
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
            chartData: {
                wpm: chartWpm,
                burst: chartBurst,
                err: chartErr
            },
            testDuration: testDuration,
            afkDuration: 0,
            stopOnLetter: false
        };

        if (uid) result.uid = uid;

        // Generate hash
        const toHash = { ...result };
        delete toHash.hash;
        result.hash = objectHash(toHash);

        return {
            result: result,
            stats: {
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

// CLI Interface
function printUsage() {
    console.log(`
MonkeyType Human-Like Payload Generator

Usage: node payload-cli.js [options]

Options:
  --wpm <number>       Target WPM (default: 90)
  --duration <number>  Test duration in seconds (default: 30)
  --acc <number>       Target accuracy percentage (default: 96)
  --uid <string>       Your MonkeyType user ID
  --mode <string>      Test mode: time|words (default: time)
  --language <string>  Language (default: english)
  --punctuation        Enable punctuation
  --numbers            Enable numbers
  --output <file>      Output to file instead of stdout
  --help               Show this help

Examples:
  node payload-cli.js --wpm 100 --duration 30
  node payload-cli.js --wpm 85 --duration 60 --uid "abc123" --output payload.json
`);
}

function parseArgs(args) {
    const config = {
        targetWpm: 90,
        testDuration: 30,
        targetAcc: 96,
        mode: 'time',
        language: 'english',
        punctuation: false,
        numbers: false,
        uid: '',
        output: null
    };

    for (let i = 2; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--wpm':
                config.targetWpm = parseFloat(args[++i]);
                break;
            case '--duration':
                config.testDuration = parseInt(args[++i]);
                break;
            case '--acc':
                config.targetAcc = parseFloat(args[++i]);
                break;
            case '--uid':
                config.uid = args[++i];
                break;
            case '--mode':
                config.mode = args[++i];
                break;
            case '--language':
                config.language = args[++i];
                break;
            case '--punctuation':
                config.punctuation = true;
                break;
            case '--numbers':
                config.numbers = true;
                break;
            case '--output':
                config.output = args[++i];
                break;
            case '--help':
            case '-h':
                printUsage();
                process.exit(0);
        }
    }
    return config;
}

function main() {
    const config = parseArgs(process.argv);
    const generator = new HumanTypingGenerator();
    const { result, stats } = generator.generate(config);

    const payload = { result };

    console.log('\n========== GENERATION STATS ==========');
    console.log(`WPM: ${result.wpm} (target: ${config.targetWpm})`);
    console.log(`Accuracy: ${result.acc}%`);
    console.log(`Consistency: ${result.consistency}%`);
    console.log(`Key Consistency: ${result.keyConsistency}%`);
    console.log(`WPM Consistency: ${result.wpmConsistency}%`);
    console.log(`\nKey Spacing CV: ${stats.spacingCV} (human: 0.3-0.8, bot: 0.01-0.1)`);
    console.log(`Key Duration CV: ${stats.durationCV}`);
    console.log(`Key Overlap: ${result.keyOverlap}ms`);
    console.log(`Char Total: ${result.charTotal}`);
    console.log(`Hash: ${result.hash}`);
    console.log('=======================================\n');

    if (config.output) {
        const fs = require('fs');
        fs.writeFileSync(config.output, JSON.stringify(payload, null, 2));
        console.log(`Payload saved to: ${config.output}`);
    } else {
        console.log('Generated Payload:');
        console.log(JSON.stringify(payload, null, 2));
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { HumanTypingGenerator };
