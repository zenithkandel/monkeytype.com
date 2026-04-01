/**
 * MonkeyType Anticheat Analyzer - CLI Version
 * 
 * Usage:
 *   node anticheat-cli.js payload.json
 *   node anticheat-cli.js --stdin < payload.json
 * 
 * This tool analyzes typing test payloads and detects bot/synthetic patterns.
 */

const fs = require('fs');

// Import the analyzer (same class from browser version)
class AnticheatAnalyzer {
    constructor() {
        this.thresholds = {
            cvMin: 0.25,
            cvMax: 0.95,
            cvBotThreshold: 0.15,
            spacingMin: 20,
            spacingMax: 2000,
            spacingMeanMin: 50,
            spacingMeanMax: 500,
            durationMin: 20,
            durationMax: 500,
            durationMeanMin: 40,
            durationMeanMax: 250,
            wpmMin: 1,
            wpmMax: 350,
            accMin: 50,
            accMax: 100,
            consistencyMin: 0,
            consistencyMax: 100,
            skewnessMin: -0.5,
            skewnessMax: 3.0,
            kurtosisMin: -1,
            kurtosisMax: 15,
            burstThreshold: 80,
            minBurstRatio: 0.1,
            maxBurstRatio: 0.5,
            longPauseThreshold: 300,
            minLongPauseRatio: 0.02,
        };

        this.weights = {
            cvKeySpacing: 15,
            cvKeyDuration: 10,
            distributionShape: 15,
            burstPattern: 10,
            longPauses: 10,
            chronologicalSum: 15,
            keyCountParity: 10,
            wpmConsistency: 10,
            valuesBounds: 5,
        };
    }

    mean(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    stdDev(arr) {
        if (!arr || arr.length < 2) return 0;
        const avg = this.mean(arr);
        const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
    }

    coefficientOfVariation(arr) {
        const m = this.mean(arr);
        if (m === 0) return 0;
        return this.stdDev(arr) / m;
    }

    skewness(arr) {
        if (!arr || arr.length < 3) return 0;
        const n = arr.length;
        const m = this.mean(arr);
        const s = this.stdDev(arr);
        if (s === 0) return 0;
        const sum = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0);
        return (n / ((n - 1) * (n - 2))) * sum;
    }

    kurtosis(arr) {
        if (!arr || arr.length < 4) return 0;
        const n = arr.length;
        const m = this.mean(arr);
        const s = this.stdDev(arr);
        if (s === 0) return 0;
        const sum = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 4), 0);
        const kurt = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum;
        const adjustment = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
        return kurt - adjustment;
    }

    percentile(arr, p) {
        if (!arr || arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * p);
        return sorted[Math.min(index, sorted.length - 1)];
    }

    kogasa(cv) {
        if (!isFinite(cv) || cv < 0) return 100;
        const taylorSum = cv + Math.pow(cv, 3) / 3 + Math.pow(cv, 5) / 5;
        return Math.max(0, Math.min(100, 100 * (1 - Math.tanh(taylorSum))));
    }

    checkCVKeySpacing(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 10) {
            return { pass: true, score: 50, cv: null, message: 'Insufficient data' };
        }
        const cv = this.coefficientOfVariation(keySpacing);
        if (cv < this.thresholds.cvBotThreshold) {
            return { pass: false, score: 0, cv, message: `CV ${cv.toFixed(3)} is TOO LOW - bot indicator` };
        }
        if (cv < this.thresholds.cvMin) {
            return { pass: false, score: 20, cv, message: `CV ${cv.toFixed(3)} suspiciously low` };
        }
        if (cv > this.thresholds.cvMax) {
            return { pass: false, score: 30, cv, message: `CV ${cv.toFixed(3)} unusually high` };
        }
        let score = 100;
        if (cv < 0.35) score = 60 + (cv - 0.25) * 400;
        else if (cv > 0.75) score = 100 - (cv - 0.75) * 200;
        return { pass: true, score: Math.max(0, Math.min(100, score)), cv, message: `CV ${cv.toFixed(3)} within human range` };
    }

    checkCVKeyDuration(keyDuration) {
        if (!keyDuration || keyDuration === 'toolong' || keyDuration.length < 10) {
            return { pass: true, score: 50, cv: null, message: 'Insufficient data' };
        }
        const cv = this.coefficientOfVariation(keyDuration);
        if (cv < 0.1) return { pass: false, score: 10, cv, message: `Duration CV ${cv.toFixed(3)} TOO consistent` };
        if (cv < 0.2) return { pass: false, score: 40, cv, message: `Duration CV ${cv.toFixed(3)} suspiciously consistent` };
        if (cv > 0.8) return { pass: true, score: 60, cv, message: `Duration CV ${cv.toFixed(3)} high but possible` };
        return { pass: true, score: 100, cv, message: `Duration CV ${cv.toFixed(3)} normal` };
    }

    checkDistributionShape(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 20) {
            return { pass: true, score: 50, message: 'Insufficient data' };
        }
        const skew = this.skewness(keySpacing);
        const kurt = this.kurtosis(keySpacing);
        const issues = [];
        let score = 100;
        if (skew < 0) { issues.push(`Negative skewness (${skew.toFixed(2)})`); score -= 40; }
        else if (skew < 0.3) { issues.push(`Low skewness (${skew.toFixed(2)})`); score -= 20; }
        else if (skew > 3) { issues.push(`Very high skewness (${skew.toFixed(2)})`); score -= 15; }
        if (kurt < -1) { issues.push(`Kurtosis too low (${kurt.toFixed(2)})`); score -= 20; }
        else if (kurt > 15) { issues.push(`Kurtosis very high (${kurt.toFixed(2)})`); score -= 10; }
        return {
            pass: score >= 50, score: Math.max(0, score), skewness: skew, kurtosis: kurt,
            message: issues.length > 0 ? issues.join('; ') : 'Distribution shape is human-like'
        };
    }

    checkBurstPattern(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 20) {
            return { pass: true, score: 50, message: 'Insufficient data' };
        }
        const bursts = keySpacing.filter(s => s < this.thresholds.burstThreshold);
        const burstRatio = bursts.length / keySpacing.length;
        if (burstRatio < this.thresholds.minBurstRatio) {
            return { pass: false, score: 30, burstRatio, message: `Only ${(burstRatio * 100).toFixed(1)}% bursts` };
        }
        if (burstRatio > this.thresholds.maxBurstRatio) {
            return { pass: false, score: 40, burstRatio, message: `${(burstRatio * 100).toFixed(1)}% bursts too high` };
        }
        let burstClusters = 0, inBurst = false;
        for (const s of keySpacing) {
            if (s < this.thresholds.burstThreshold) { if (!inBurst) { burstClusters++; inBurst = true; } }
            else { inBurst = false; }
        }
        return {
            pass: true, score: 100, burstRatio, burstClusters,
            message: `${(burstRatio * 100).toFixed(1)}% bursts in ${burstClusters} clusters`
        };
    }

    checkLongPauses(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 20) {
            return { pass: true, score: 50, message: 'Insufficient data' };
        }
        const longPauses = keySpacing.filter(s => s > this.thresholds.longPauseThreshold);
        const ratio = longPauses.length / keySpacing.length;
        if (ratio < this.thresholds.minLongPauseRatio) {
            return { pass: false, score: 40, longPauseRatio: ratio, message: `Only ${(ratio * 100).toFixed(1)}% long pauses` };
        }
        if (ratio > 0.3) {
            return { pass: true, score: 70, longPauseRatio: ratio, message: `${(ratio * 100).toFixed(1)}% long pauses - high but OK` };
        }
        return { pass: true, score: 100, longPauseRatio: ratio, message: `${(ratio * 100).toFixed(1)}% long pauses - natural` };
    }

    checkChronologicalSum(result) {
        if (!result.keySpacing || result.keySpacing === 'toolong') {
            return { pass: true, score: 50, message: 'Key spacing unavailable' };
        }
        const spacingSum = result.keySpacing.reduce((a, b) => a + b, 0);
        const total = spacingSum + (result.startToFirstKey || 0) + (result.lastKeyToEnd || 0);
        const expected = result.testDuration * 1000;
        const diff = Math.abs(total - expected);
        if (diff > 100) {
            return {
                pass: false, score: Math.max(0, 100 - diff / 10), calculated: total, expected, diff,
                message: `Timing mismatch: ${total.toFixed(0)}ms vs ${expected.toFixed(0)}ms`
            };
        }
        return {
            pass: true, score: 100, calculated: total, expected, diff,
            message: `Timing verified (${diff.toFixed(0)}ms diff)`
        };
    }

    checkKeyCountParity(result) {
        const issues = [];
        let score = 100;
        if (result.keySpacing && result.keySpacing !== 'toolong') {
            if (result.keySpacing.length !== result.charTotal - 1) {
                issues.push(`keySpacing.length ${result.keySpacing.length} ≠ charTotal-1 (${result.charTotal - 1})`);
                score -= 50;
            }
        }
        if (result.keyDuration && result.keyDuration !== 'toolong') {
            if (result.keyDuration.length !== result.charTotal) {
                issues.push(`keyDuration.length ${result.keyDuration.length} ≠ charTotal (${result.charTotal})`);
                score -= 50;
            }
        }
        return {
            pass: issues.length === 0, score: Math.max(0, score),
            message: issues.length > 0 ? issues.join('; ') : 'Key counts match'
        };
    }

    checkWpmConsistency(result) {
        if (!result.keySpacing || result.keySpacing === 'toolong' || result.keySpacing.length < 10) {
            return { pass: true, score: 50, message: 'Insufficient data' };
        }
        const avgSpacing = this.mean(result.keySpacing);
        const expectedAvg = 12000 / result.wpm;
        const diffPercent = (Math.abs(avgSpacing - expectedAvg) / expectedAvg) * 100;
        if (diffPercent > 50) return {
            pass: false, score: 20, avgSpacing, expected: expectedAvg,
            message: `Avg spacing ${avgSpacing.toFixed(1)}ms doesn't match WPM`
        };
        if (diffPercent > 30) return {
            pass: false, score: 50, avgSpacing, expected: expectedAvg,
            message: `${diffPercent.toFixed(0)}% deviation from expected`
        };
        return {
            pass: true, score: 100 - diffPercent, avgSpacing, expected: expectedAvg,
            message: `Avg spacing matches WPM`
        };
    }

    checkValueBounds(result) {
        const issues = [];
        let score = 100;
        if (result.wpm < this.thresholds.wpmMin || result.wpm > this.thresholds.wpmMax) {
            issues.push(`WPM ${result.wpm} out of bounds`); score -= 30;
        }
        if (result.acc < this.thresholds.accMin || result.acc > this.thresholds.accMax) {
            issues.push(`Accuracy ${result.acc} out of bounds`); score -= 30;
        }
        if (result.keySpacing && result.keySpacing !== 'toolong') {
            const min = Math.min(...result.keySpacing);
            const max = Math.max(...result.keySpacing);
            if (min < this.thresholds.spacingMin) { issues.push(`Min spacing ${min.toFixed(1)}ms too low`); score -= 15; }
            if (max > this.thresholds.spacingMax) { issues.push(`Max spacing ${max.toFixed(1)}ms too high`); score -= 10; }
        }
        return {
            pass: issues.length === 0, score: Math.max(0, score),
            message: issues.length > 0 ? issues.join('; ') : 'Values within bounds'
        };
    }

    checkChartData(result) {
        if (!result.chartData || result.chartData === 'toolong') {
            return { pass: true, score: 50, message: 'Chart data unavailable' };
        }
        const issues = [];
        let score = 100;
        const expected = Math.ceil(result.testDuration);
        if (result.chartData.wpm && result.chartData.wpm.length !== expected) {
            issues.push(`Chart length ${result.chartData.wpm.length} ≠ duration ${expected}`);
            score -= 25;
        }
        if (result.chartData.wpm) {
            const stdDev = this.stdDev(result.chartData.wpm);
            if (stdDev < 3) { issues.push(`WPM chart too flat (stddev ${stdDev.toFixed(1)})`); score -= 25; }
        }
        return {
            pass: issues.length === 0, score: Math.max(0, score),
            message: issues.length > 0 ? issues.join('; ') : 'Chart data consistent'
        };
    }

    checkAutocorrelation(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 30) {
            return { pass: true, score: 50, message: 'Insufficient data', autocorr: null };
        }
        const n = keySpacing.length;
        const mean = this.mean(keySpacing);
        let num = 0, den = 0;
        for (let i = 0; i < n - 1; i++) num += (keySpacing[i] - mean) * (keySpacing[i + 1] - mean);
        for (let i = 0; i < n; i++) den += Math.pow(keySpacing[i] - mean, 2);
        const autocorr = den !== 0 ? num / den : 0;
        if (Math.abs(autocorr) < 0.05) return { pass: false, score: 40, autocorr, message: `Autocorr ${autocorr.toFixed(3)} too low - appears random` };
        if (autocorr > 0.7) return { pass: false, score: 50, autocorr, message: `Autocorr ${autocorr.toFixed(3)} too high - too predictable` };
        return { pass: true, score: 100, autocorr, message: `Autocorr ${autocorr.toFixed(3)} indicates natural timing` };
    }

    analyze(payload) {
        const result = payload.result || payload;
        const checks = {
            cvKeySpacing: this.checkCVKeySpacing(result.keySpacing),
            cvKeyDuration: this.checkCVKeyDuration(result.keyDuration),
            distributionShape: this.checkDistributionShape(result.keySpacing),
            burstPattern: this.checkBurstPattern(result.keySpacing),
            longPauses: this.checkLongPauses(result.keySpacing),
            chronologicalSum: this.checkChronologicalSum(result),
            keyCountParity: this.checkKeyCountParity(result),
            wpmConsistency: this.checkWpmConsistency(result),
            valueBounds: this.checkValueBounds(result),
            chartData: this.checkChartData(result),
            autocorrelation: this.checkAutocorrelation(result.keySpacing),
        };

        let totalWeight = 0, weightedScore = 0;
        for (const [key, check] of Object.entries(checks)) {
            const weight = this.weights[key] || 5;
            totalWeight += weight;
            weightedScore += check.score * weight;
        }
        const finalScore = weightedScore / totalWeight;

        let verdict, verdictClass;
        if (finalScore >= 75) { verdict = 'LIKELY HUMAN'; verdictClass = 'pass'; }
        else if (finalScore >= 50) { verdict = 'SUSPICIOUS'; verdictClass = 'suspicious'; }
        else { verdict = 'LIKELY BOT'; verdictClass = 'fail'; }

        const flags = [];
        for (const [key, check] of Object.entries(checks)) {
            if (!check.pass) {
                flags.push({ check: key, message: check.message, severity: check.score < 30 ? 'critical' : 'warning' });
            }
        }

        return { score: Math.round(finalScore), verdict, verdictClass, checks, flags, result };
    }
}

// CLI Interface
function printReport(analysis) {
    const colors = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        cyan: '\x1b[36m',
        bold: '\x1b[1m',
    };

    console.log('\n' + '='.repeat(60));
    console.log(colors.bold + '🛡️  MONKEYTYPE ANTICHEAT ANALYSIS REPORT' + colors.reset);
    console.log('='.repeat(60));

    // Verdict
    let verdictColor = colors.yellow;
    if (analysis.verdictClass === 'pass') verdictColor = colors.green;
    else if (analysis.verdictClass === 'fail') verdictColor = colors.red;

    console.log('\n' + colors.bold + 'VERDICT: ' + verdictColor + analysis.verdict + colors.reset);
    console.log(colors.bold + 'SCORE: ' + verdictColor + analysis.score + '/100' + colors.reset);

    // Basic Info
    console.log('\n' + colors.cyan + '📊 PAYLOAD INFO' + colors.reset);
    console.log(`  WPM: ${analysis.result.wpm}`);
    console.log(`  Accuracy: ${analysis.result.acc}%`);
    console.log(`  Consistency: ${analysis.result.consistency}%`);
    console.log(`  Duration: ${analysis.result.testDuration}s`);
    console.log(`  Characters: ${analysis.result.charTotal}`);

    // Check Results
    console.log('\n' + colors.cyan + '✅ VALIDATION CHECKS' + colors.reset);

    const checkLabels = {
        cvKeySpacing: 'Key Spacing CV',
        cvKeyDuration: 'Key Duration CV',
        distributionShape: 'Distribution Shape',
        burstPattern: 'Burst Pattern',
        longPauses: 'Long Pauses',
        chronologicalSum: 'Timing Summation',
        keyCountParity: 'Key Count Parity',
        wpmConsistency: 'WPM Consistency',
        valueBounds: 'Value Bounds',
        chartData: 'Chart Data',
        autocorrelation: 'Autocorrelation',
    };

    for (const [key, check] of Object.entries(analysis.checks)) {
        const label = checkLabels[key] || key;
        const status = check.pass ? colors.green + '✓ PASS' : (check.score >= 40 ? colors.yellow + '⚠ WARN' : colors.red + '✗ FAIL');
        console.log(`  ${label.padEnd(20)} ${status} (${check.score.toString().padStart(3)})${colors.reset}`);
    }

    // Flags
    if (analysis.flags.length > 0) {
        console.log('\n' + colors.red + '🚩 FLAGS DETECTED' + colors.reset);
        for (const flag of analysis.flags) {
            const icon = flag.severity === 'critical' ? '🚨' : '⚠️';
            console.log(`  ${icon} ${flag.check}: ${flag.message}`);
        }
    } else {
        console.log('\n' + colors.green + '✅ No suspicious patterns detected' + colors.reset);
    }

    // Statistics
    if (analysis.result.keySpacing && analysis.result.keySpacing !== 'toolong') {
        const analyzer = new AnticheatAnalyzer();
        const ks = analysis.result.keySpacing;
        console.log('\n' + colors.cyan + '📈 STATISTICS' + colors.reset);
        console.log(`  Key Spacing CV: ${analyzer.coefficientOfVariation(ks).toFixed(4)} (human: 0.25-0.95, bot: <0.15)`);
        console.log(`  Mean Spacing: ${analyzer.mean(ks).toFixed(1)}ms`);
        console.log(`  StdDev: ${analyzer.stdDev(ks).toFixed(1)}ms`);
        console.log(`  Skewness: ${analyzer.skewness(ks).toFixed(3)} (human: 0.3-3.0)`);
        console.log(`  Range: ${Math.min(...ks).toFixed(0)} - ${Math.max(...ks).toFixed(0)}ms`);
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
MonkeyType Anticheat Analyzer - CLI

Usage:
  node anticheat-cli.js <payload.json>     Analyze a JSON file
  node anticheat-cli.js --stdin            Read from stdin
  node anticheat-cli.js --help             Show this help

Example:
  node anticheat-cli.js payload.json
  cat payload.json | node anticheat-cli.js --stdin
`);
        process.exit(0);
    }

    let payload;

    if (args.includes('--stdin')) {
        // Read from stdin
        let input = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => {
            let chunk;
            while ((chunk = process.stdin.read()) !== null) {
                input += chunk;
            }
        });
        process.stdin.on('end', () => {
            try {
                payload = JSON.parse(input);
                const analyzer = new AnticheatAnalyzer();
                const analysis = analyzer.analyze(payload);
                printReport(analysis);
            } catch (e) {
                console.error('Error parsing JSON:', e.message);
                process.exit(1);
            }
        });
    } else if (args.length > 0) {
        // Read from file
        const file = args[0];
        try {
            const content = fs.readFileSync(file, 'utf8');
            payload = JSON.parse(content);
            const analyzer = new AnticheatAnalyzer();
            const analysis = analyzer.analyze(payload);
            printReport(analysis);
        } catch (e) {
            console.error('Error:', e.message);
            process.exit(1);
        }
    } else {
        console.log('No input specified. Use --help for usage.');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { AnticheatAnalyzer };
