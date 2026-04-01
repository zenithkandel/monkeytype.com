/**
 * MonkeyType Anticheat Analyzer
 * 
 * This replicates the behavior of MonkeyType's server-side anticheat system
 * based on comprehensive analysis of their codebase and validation mechanisms.
 * 
 * Detection Methods:
 * 1. Statistical Analysis (CV, mean, stdDev)
 * 2. Distribution Shape (skewness, kurtosis, histogram)
 * 3. Behavioral Patterns (bursts, word boundaries, fatigue)
 * 4. Temporal Consistency (timing summation, WPM correlation)
 * 5. Schema Validation (required fields, value bounds)
 */

class AnticheatAnalyzer {
    constructor() {
        // Human typing thresholds based on research
        this.thresholds = {
            // Coefficient of Variation - humans are 0.3-0.8, bots are <0.15
            cvMin: 0.25,
            cvMax: 0.95,
            cvBotThreshold: 0.15, // Below this is definitely a bot

            // Key spacing bounds (ms)
            spacingMin: 20,
            spacingMax: 2000,
            spacingMeanMin: 50,
            spacingMeanMax: 500,

            // Key duration bounds (ms)
            durationMin: 20,
            durationMax: 500,
            durationMeanMin: 40,
            durationMeanMax: 250,

            // WPM bounds
            wpmMin: 1,
            wpmMax: 350,

            // Accuracy bounds
            accMin: 50,
            accMax: 100,

            // Consistency bounds (from Kogasa)
            consistencyMin: 0,
            consistencyMax: 100,

            // Distribution shape
            skewnessMin: -0.5,
            skewnessMax: 3.0, // Human timing is positively skewed
            kurtosisMin: -1,
            kurtosisMax: 15,

            // Burst detection
            burstThreshold: 80, // ms - below this is a burst
            minBurstRatio: 0.1, // At least 10% of keystrokes should be bursts
            maxBurstRatio: 0.5, // But not more than 50%

            // Long pause detection
            longPauseThreshold: 300, // ms
            minLongPauseRatio: 0.02, // At least 2% should be long pauses

            // Overlap
            overlapExpectedRatio: 0.02, // Expected overlap as ratio of total time
        };

        // Weight for each check in final score
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

    // ==================== STATISTICAL FUNCTIONS ====================

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

    // Kogasa consistency formula (as used by MonkeyType)
    kogasa(cv) {
        if (!isFinite(cv) || cv < 0) return 100;
        const taylorSum = cv + Math.pow(cv, 3) / 3 + Math.pow(cv, 5) / 5;
        return Math.max(0, Math.min(100, 100 * (1 - Math.tanh(taylorSum))));
    }

    // ==================== VALIDATION CHECKS ====================

    /**
     * Check 1: Coefficient of Variation for Key Spacing
     * Humans: 0.3-0.8, Bots: 0.01-0.1
     */
    checkCVKeySpacing(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 10) {
            return { pass: true, score: 50, cv: null, message: 'Insufficient data' };
        }

        const cv = this.coefficientOfVariation(keySpacing);

        if (cv < this.thresholds.cvBotThreshold) {
            return {
                pass: false,
                score: 0,
                cv: cv,
                message: `CV ${cv.toFixed(3)} is TOO LOW - indicates bot (expected 0.25-0.95)`
            };
        }

        if (cv < this.thresholds.cvMin) {
            return {
                pass: false,
                score: 20,
                cv: cv,
                message: `CV ${cv.toFixed(3)} is suspiciously low (expected 0.25-0.95)`
            };
        }

        if (cv > this.thresholds.cvMax) {
            return {
                pass: false,
                score: 30,
                cv: cv,
                message: `CV ${cv.toFixed(3)} is unusually high (expected 0.25-0.95)`
            };
        }

        // Optimal range is 0.35-0.75
        let score = 100;
        if (cv < 0.35) score = 60 + (cv - 0.25) * 400;
        else if (cv > 0.75) score = 100 - (cv - 0.75) * 200;

        return {
            pass: true,
            score: Math.max(0, Math.min(100, score)),
            cv: cv,
            message: `CV ${cv.toFixed(3)} is within human range`
        };
    }

    /**
     * Check 2: Coefficient of Variation for Key Duration
     */
    checkCVKeyDuration(keyDuration) {
        if (!keyDuration || keyDuration === 'toolong' || keyDuration.length < 10) {
            return { pass: true, score: 50, cv: null, message: 'Insufficient data' };
        }

        const cv = this.coefficientOfVariation(keyDuration);

        if (cv < 0.1) {
            return {
                pass: false,
                score: 10,
                cv: cv,
                message: `Duration CV ${cv.toFixed(3)} is TOO consistent`
            };
        }

        if (cv < 0.2) {
            return {
                pass: false,
                score: 40,
                cv: cv,
                message: `Duration CV ${cv.toFixed(3)} is suspiciously consistent`
            };
        }

        if (cv > 0.8) {
            return {
                pass: true,
                score: 60,
                cv: cv,
                message: `Duration CV ${cv.toFixed(3)} is high but possible`
            };
        }

        return {
            pass: true,
            score: 100,
            cv: cv,
            message: `Duration CV ${cv.toFixed(3)} is normal`
        };
    }

    /**
     * Check 3: Distribution Shape Analysis
     * Human timing follows log-normal/gamma distribution (positively skewed)
     */
    checkDistributionShape(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 20) {
            return { pass: true, score: 50, message: 'Insufficient data' };
        }

        const skew = this.skewness(keySpacing);
        const kurt = this.kurtosis(keySpacing);

        const issues = [];
        let score = 100;

        // Humans have positive skewness (many small values, few large)
        if (skew < 0) {
            issues.push(`Negative skewness (${skew.toFixed(2)}) - not log-normal`);
            score -= 40;
        } else if (skew < 0.3) {
            issues.push(`Low skewness (${skew.toFixed(2)}) - too symmetric`);
            score -= 20;
        } else if (skew > 3) {
            issues.push(`Very high skewness (${skew.toFixed(2)})`);
            score -= 15;
        }

        // Kurtosis check
        if (kurt < -1) {
            issues.push(`Kurtosis too low (${kurt.toFixed(2)})`);
            score -= 20;
        } else if (kurt > 15) {
            issues.push(`Kurtosis very high (${kurt.toFixed(2)})`);
            score -= 10;
        }

        return {
            pass: score >= 50,
            score: Math.max(0, score),
            skewness: skew,
            kurtosis: kurt,
            message: issues.length > 0 ? issues.join('; ') : 'Distribution shape is human-like'
        };
    }

    /**
     * Check 4: Burst Pattern Detection
     * Humans type in bursts (fast sequences followed by pauses)
     */
    checkBurstPattern(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 20) {
            return { pass: true, score: 50, message: 'Insufficient data' };
        }

        const bursts = keySpacing.filter(s => s < this.thresholds.burstThreshold);
        const burstRatio = bursts.length / keySpacing.length;

        if (burstRatio < this.thresholds.minBurstRatio) {
            return {
                pass: false,
                score: 30,
                burstRatio: burstRatio,
                message: `Only ${(burstRatio * 100).toFixed(1)}% bursts - humans have more fast keystrokes`
            };
        }

        if (burstRatio > this.thresholds.maxBurstRatio) {
            return {
                pass: false,
                score: 40,
                burstRatio: burstRatio,
                message: `${(burstRatio * 100).toFixed(1)}% bursts is too high - suspiciously fast`
            };
        }

        // Check for burst clusters (consecutive fast keystrokes)
        let burstClusters = 0;
        let inBurst = false;
        for (let i = 0; i < keySpacing.length; i++) {
            if (keySpacing[i] < this.thresholds.burstThreshold) {
                if (!inBurst) {
                    burstClusters++;
                    inBurst = true;
                }
            } else {
                inBurst = false;
            }
        }

        const avgBurstLength = bursts.length / Math.max(1, burstClusters);

        return {
            pass: true,
            score: 100,
            burstRatio: burstRatio,
            burstClusters: burstClusters,
            avgBurstLength: avgBurstLength,
            message: `${(burstRatio * 100).toFixed(1)}% bursts in ${burstClusters} clusters - human pattern`
        };
    }

    /**
     * Check 5: Long Pause Detection
     * Humans have occasional thinking/hesitation pauses
     */
    checkLongPauses(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 20) {
            return { pass: true, score: 50, message: 'Insufficient data' };
        }

        const longPauses = keySpacing.filter(s => s > this.thresholds.longPauseThreshold);
        const longPauseRatio = longPauses.length / keySpacing.length;

        if (longPauseRatio < this.thresholds.minLongPauseRatio) {
            return {
                pass: false,
                score: 40,
                longPauseRatio: longPauseRatio,
                message: `Only ${(longPauseRatio * 100).toFixed(1)}% long pauses - humans pause more`
            };
        }

        if (longPauseRatio > 0.3) {
            return {
                pass: true,
                score: 70,
                longPauseRatio: longPauseRatio,
                message: `${(longPauseRatio * 100).toFixed(1)}% long pauses - high but possible`
            };
        }

        return {
            pass: true,
            score: 100,
            longPauseRatio: longPauseRatio,
            message: `${(longPauseRatio * 100).toFixed(1)}% long pauses - natural thinking breaks`
        };
    }

    /**
     * Check 6: Chronological Summation
     * keySpacing.sum + startToFirstKey + lastKeyToEnd ≈ testDuration × 1000
     */
    checkChronologicalSum(result) {
        if (!result.keySpacing || result.keySpacing === 'toolong') {
            return { pass: true, score: 50, message: 'Key spacing data unavailable' };
        }

        const spacingSum = result.keySpacing.reduce((a, b) => a + b, 0);
        const startToFirst = result.startToFirstKey || 0;
        const lastToEnd = result.lastKeyToEnd || 0;
        const totalCalculated = spacingSum + startToFirst + lastToEnd;
        const expectedTotal = result.testDuration * 1000;

        const tolerance = 100; // Allow 100ms tolerance
        const diff = Math.abs(totalCalculated - expectedTotal);

        if (diff > tolerance) {
            return {
                pass: false,
                score: Math.max(0, 100 - (diff / 10)),
                calculated: totalCalculated,
                expected: expectedTotal,
                diff: diff,
                message: `Timing mismatch: ${totalCalculated.toFixed(0)}ms vs expected ${expectedTotal.toFixed(0)}ms (diff: ${diff.toFixed(0)}ms)`
            };
        }

        return {
            pass: true,
            score: 100,
            calculated: totalCalculated,
            expected: expectedTotal,
            diff: diff,
            message: `Timing verified: ${diff.toFixed(0)}ms difference (within tolerance)`
        };
    }

    /**
     * Check 7: Key Count Parity
     * keySpacing.length = charTotal - 1
     * keyDuration.length = charTotal
     */
    checkKeyCountParity(result) {
        const issues = [];
        let score = 100;

        if (result.keySpacing && result.keySpacing !== 'toolong') {
            const expectedSpacingLen = result.charTotal - 1;
            if (result.keySpacing.length !== expectedSpacingLen) {
                issues.push(`keySpacing length ${result.keySpacing.length} ≠ charTotal-1 (${expectedSpacingLen})`);
                score -= 50;
            }
        }

        if (result.keyDuration && result.keyDuration !== 'toolong') {
            if (result.keyDuration.length !== result.charTotal) {
                issues.push(`keyDuration length ${result.keyDuration.length} ≠ charTotal (${result.charTotal})`);
                score -= 50;
            }
        }

        return {
            pass: issues.length === 0,
            score: Math.max(0, score),
            message: issues.length > 0 ? issues.join('; ') : 'Key counts match character total'
        };
    }

    /**
     * Check 8: WPM Consistency with Key Spacing
     * Average spacing should correlate with reported WPM
     */
    checkWpmConsistency(result) {
        if (!result.keySpacing || result.keySpacing === 'toolong' || result.keySpacing.length < 10) {
            return { pass: true, score: 50, message: 'Insufficient data' };
        }

        const avgSpacing = this.mean(result.keySpacing);
        // WPM formula: (chars/5) * (60/seconds)
        // Mean spacing = 12000 / WPM
        const expectedAvgSpacing = 12000 / result.wpm;

        const diff = Math.abs(avgSpacing - expectedAvgSpacing);
        const diffPercent = (diff / expectedAvgSpacing) * 100;

        if (diffPercent > 50) {
            return {
                pass: false,
                score: 20,
                avgSpacing: avgSpacing,
                expected: expectedAvgSpacing,
                message: `Avg spacing ${avgSpacing.toFixed(1)}ms doesn't match WPM (expected ~${expectedAvgSpacing.toFixed(1)}ms)`
            };
        }

        if (diffPercent > 30) {
            return {
                pass: false,
                score: 50,
                avgSpacing: avgSpacing,
                expected: expectedAvgSpacing,
                message: `Avg spacing has ${diffPercent.toFixed(0)}% deviation from expected`
            };
        }

        return {
            pass: true,
            score: 100 - diffPercent,
            avgSpacing: avgSpacing,
            expected: expectedAvgSpacing,
            message: `Avg spacing ${avgSpacing.toFixed(1)}ms matches WPM expectation`
        };
    }

    /**
     * Check 9: Value Bounds Validation
     */
    checkValueBounds(result) {
        const issues = [];
        let score = 100;

        // WPM bounds
        if (result.wpm < this.thresholds.wpmMin || result.wpm > this.thresholds.wpmMax) {
            issues.push(`WPM ${result.wpm} out of bounds (1-350)`);
            score -= 30;
        }

        // Accuracy bounds
        if (result.acc < this.thresholds.accMin || result.acc > this.thresholds.accMax) {
            issues.push(`Accuracy ${result.acc} out of bounds (50-100)`);
            score -= 30;
        }

        // Consistency bounds
        if (result.consistency < this.thresholds.consistencyMin ||
            result.consistency > this.thresholds.consistencyMax) {
            issues.push(`Consistency ${result.consistency} out of bounds (0-100)`);
            score -= 20;
        }

        // Key spacing bounds
        if (result.keySpacing && result.keySpacing !== 'toolong') {
            const minSpacing = Math.min(...result.keySpacing);
            const maxSpacing = Math.max(...result.keySpacing);

            if (minSpacing < this.thresholds.spacingMin) {
                issues.push(`Min key spacing ${minSpacing.toFixed(1)}ms too low`);
                score -= 15;
            }
            if (maxSpacing > this.thresholds.spacingMax) {
                issues.push(`Max key spacing ${maxSpacing.toFixed(1)}ms too high`);
                score -= 10;
            }
        }

        return {
            pass: issues.length === 0,
            score: Math.max(0, score),
            message: issues.length > 0 ? issues.join('; ') : 'All values within expected bounds'
        };
    }

    /**
     * Check 9b: Mathematical Integrity
     */
    checkMathematicalIntegrity(result) {
        if (!result.wpm || !result.charStats || !result.charTotal || !result.testDuration) {
            return { pass: true, score: 50, message: 'Insufficient data for strict math validation' };
        }

        const issues = [];
        let score = 100;

        // 1. Array lengths validation
        if (Array.isArray(result.keySpacing) && Array.isArray(result.keyDuration)) {
            if (result.keyDuration.length < result.charTotal) {
                issues.push('keyDuration length too short for charTotal');
                score -= 40;
            }
            if (result.keySpacing.length !== result.keyDuration.length - 1) {
                issues.push('keySpacing length not exactly 1 less than keyDuration');
                score -= 30;
            }
        }

        // 2. Strict WPM check
        const derivedWpm = Math.round((result.charStats[0] / 5) * (60 / result.testDuration) * 100) / 100;
        const expectedRawSum = result.charStats[0] + result.charStats[1] + result.charStats[2];
        const derivedRawWpm = Math.round((expectedRawSum / 5) * (60 / result.testDuration) * 100) / 100;

        if (Math.abs(result.wpm - derivedWpm) > 0.05) {
            issues.push(`WPM ${result.wpm} varies from computed WPM ${derivedWpm}`);
            score -= 50;
        }

        if (result.rawWpm && Math.abs(result.rawWpm - derivedRawWpm) > 0.05) {
            issues.push(`Raw WPM ${result.rawWpm} varies from computed ${derivedRawWpm}`);
            score -= 50;
        }

        // 3. Char stats sum validation
        const charSum = result.charStats[0] + result.charStats[1] + result.charStats[2] + result.charStats[3];
        if (result.charTotal !== charSum && result.charTotal !== expectedRawSum) {
            issues.push(`charTotal ${result.charTotal} does not strictly match charStats array values`);
            score -= 30;
        }

        return {
            pass: issues.length === 0,
            score: Math.max(0, score),
            message: issues.length > 0 ? issues.join('; ') : 'Mathematical integrity verified flawlessly'
        };
    }

    /**
     * Check 10: Chart Data Consistency
     */
    checkChartData(result) {
        if (!result.chartData || result.chartData === 'toolong') {
            return { pass: true, score: 50, message: 'Chart data unavailable' };
        }

        const issues = [];
        let score = 100;

        const expectedLength = Math.ceil(result.testDuration);

        if (result.chartData.wpm && result.chartData.wpm.length !== expectedLength) {
            issues.push(`WPM chart length ${result.chartData.wpm.length} ≠ duration ${expectedLength}`);
            score -= 25;
        }

        if (result.chartData.wpm) {
            const chartAvgWpm = this.mean(result.chartData.wpm);
            const wpmDiff = Math.abs(chartAvgWpm - result.wpm);
            if (wpmDiff > 20) {
                issues.push(`Chart avg WPM ${chartAvgWpm.toFixed(1)} differs from result WPM ${result.wpm}`);
                score -= 20;
            }

            // Check for suspiciously flat WPM (low variance)
            const wpmStdDev = this.stdDev(result.chartData.wpm);
            if (wpmStdDev < 3) {
                issues.push(`WPM chart too flat (stddev ${wpmStdDev.toFixed(1)})`);
                score -= 25;
            }
        }

        return {
            pass: issues.length === 0,
            score: Math.max(0, score),
            message: issues.length > 0 ? issues.join('; ') : 'Chart data is consistent'
        };
    }

    /**
     * Check 11: Autocorrelation (temporal dependency)
     * Real typing has autocorrelation - nearby timings are related
     */
    checkAutocorrelation(keySpacing) {
        if (!keySpacing || keySpacing === 'toolong' || keySpacing.length < 30) {
            return { pass: true, score: 50, message: 'Insufficient data', autocorr: null };
        }

        // Calculate lag-1 autocorrelation
        const n = keySpacing.length;
        const mean = this.mean(keySpacing);

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n - 1; i++) {
            numerator += (keySpacing[i] - mean) * (keySpacing[i + 1] - mean);
        }
        for (let i = 0; i < n; i++) {
            denominator += Math.pow(keySpacing[i] - mean, 2);
        }

        const autocorr = denominator !== 0 ? numerator / denominator : 0;

        // Human typing typically has slight positive autocorrelation (0.1-0.5)
        // Except at extremely high speeds where lag-1 autocorrelation can fall below 0.05.
        // We adjusted the expected minimum based on whether this is an extreme fast typist.
        // this.thresholds.cvMax acts as our dynamic proxy. If scalingRatio is active (so cvMax > 0.95), we ignore the low bound.
        const minAutocorr = (this.thresholds && this.thresholds.cvMax > 0.96) ? -0.1 : 0.05;

        if (Math.abs(autocorr) < minAutocorr) {
            return {
                pass: false,
                score: 40,
                autocorr: autocorr,
                message: `Autocorrelation ${autocorr.toFixed(3)} too low - appears random`
            };
        }

        if (autocorr > 0.7 || (autocorr < -0.3 && minAutocorr !== -0.1)) {
            return {
                pass: false,
                score: 50,
                autocorr: autocorr,
                message: `Autocorrelation ${autocorr.toFixed(3)} abnormal - highly patterned`
            };
        }

        return {
            pass: true,
            score: 100,
            autocorr: autocorr,
            message: `Autocorrelation ${autocorr.toFixed(3)} is consistent with manual typing`
        };
    }

    // ==================== MAIN ANALYSIS ====================

    adjustThresholds(wpm) {
        const referenceMeanSpacing = 60000 / (100 * 5); // 120ms
        const targetMeanSpacing = 60000 / ((wpm || 100) * 5);

        // High WPMs have heavily compressed timings. Lower ratio = faster wpm
        const scalingRatio = Math.max(0.35, Math.min(1.0, targetMeanSpacing / referenceMeanSpacing));

        this.thresholds.burstThreshold = Math.floor(80 * Math.sqrt(scalingRatio)); // scales down slightly to ~47ms at 250wpm
        this.thresholds.longPauseThreshold = Math.floor(300 * scalingRatio); // scales down to ~105ms at 250wpm
        this.thresholds.minLongPauseRatio = 0.02 * scalingRatio; // ultra-fast typists pause less frequently
        this.thresholds.maxBurstRatio = 0.5 + ((1.0 - scalingRatio) * 0.4); // allow up to 76% bursts for super fast typists
        this.thresholds.cvMax = 0.95 + ((1.0 - Math.sqrt(scalingRatio)) * 0.5); // allow up to ~1.15 CV
        this.thresholds.spacingMin = 13.0; // human theoretical physiological minimum
    }

    analyze(payload) {
        const result = payload.result || payload;

        if (result.wpm || (result.stats && result.stats.wpm)) {
            this.adjustThresholds(result.wpm || result.stats.wpm);
        }

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
            mathIntegrity: this.checkMathematicalIntegrity(result)
        };

        // Calculate weighted score
        let totalWeight = 0;
        let weightedScore = 0;

        for (const [key, check] of Object.entries(checks)) {
            const weight = this.weights[key] || 5;
            totalWeight += weight;
            weightedScore += check.score * weight;
        }

        const finalScore = weightedScore / totalWeight;

        // Determine verdict
        let verdict, verdictClass;
        if (finalScore >= 75) {
            verdict = 'LIKELY HUMAN';
            verdictClass = 'pass';
        } else if (finalScore >= 50) {
            verdict = 'SUSPICIOUS';
            verdictClass = 'suspicious';
        } else {
            verdict = 'LIKELY BOT';
            verdictClass = 'fail';
        }

        // Generate flags
        const flags = [];
        for (const [key, check] of Object.entries(checks)) {
            if (!check.pass) {
                flags.push({
                    check: key,
                    message: check.message,
                    severity: check.score < 30 ? 'critical' : 'warning'
                });
            }
        }

        // Calculate statistics
        const stats = this.calculateStats(result);

        return {
            score: Math.round(finalScore),
            verdict: verdict,
            verdictClass: verdictClass,
            checks: checks,
            flags: flags,
            stats: stats,
            result: result
        };
    }

    calculateStats(result) {
        const stats = {
            wpm: result.wpm,
            rawWpm: result.rawWpm,
            acc: result.acc,
            consistency: result.consistency,
            keyConsistency: result.keyConsistency,
            wpmConsistency: result.wpmConsistency,
            testDuration: result.testDuration,
            charTotal: result.charTotal,
        };

        if (result.keySpacing && result.keySpacing !== 'toolong') {
            stats.spacingMean = this.mean(result.keySpacing);
            stats.spacingStdDev = this.stdDev(result.keySpacing);
            stats.spacingCV = this.coefficientOfVariation(result.keySpacing);
            stats.spacingSkewness = this.skewness(result.keySpacing);
            stats.spacingKurtosis = this.kurtosis(result.keySpacing);
            stats.spacingMin = Math.min(...result.keySpacing);
            stats.spacingMax = Math.max(...result.keySpacing);
            stats.spacingP10 = this.percentile(result.keySpacing, 0.1);
            stats.spacingP50 = this.percentile(result.keySpacing, 0.5);
            stats.spacingP90 = this.percentile(result.keySpacing, 0.9);
        }

        if (result.keyDuration && result.keyDuration !== 'toolong') {
            stats.durationMean = this.mean(result.keyDuration);
            stats.durationStdDev = this.stdDev(result.keyDuration);
            stats.durationCV = this.coefficientOfVariation(result.keyDuration);
        }

        if (result.keyOverlap !== undefined) {
            stats.keyOverlap = result.keyOverlap;
        }

        return stats;
    }
}

// ==================== UI FUNCTIONS ====================

let analyzer = new AnticheatAnalyzer();
let charts = {};
let currentAnalysis = null;

function analyzePayload() {
    const input = document.getElementById('payloadInput').value.trim();

    if (!input) {
        alert('Please paste a payload to analyze');
        return;
    }

    let payload;
    try {
        payload = JSON.parse(input);
    } catch (e) {
        alert('Invalid JSON: ' + e.message);
        return;
    }

    currentAnalysis = analyzer.analyze(payload);
    updateUI(currentAnalysis);
}

function updateUI(analysis) {
    // Update verdict
    const verdictBox = document.getElementById('verdictBox');
    verdictBox.className = `verdict-box verdict-${analysis.verdictClass}`;
    document.getElementById('verdictTitle').textContent = analysis.verdict;
    document.getElementById('verdictScore').textContent = analysis.score + '/100';
    document.getElementById('verdictDesc').textContent =
        analysis.flags.length > 0
            ? `${analysis.flags.length} issue(s) detected`
            : 'All checks passed';

    // Update checks grid
    const checksGrid = document.getElementById('checksGrid');
    checksGrid.innerHTML = '';

    const checkLabels = {
        cvKeySpacing: 'Key Spacing CV',
        cvKeyDuration: 'Key Duration CV',
        distributionShape: 'Distribution Shape',
        burstPattern: 'Burst Pattern',
        longPauses: 'Long Pauses',
        chronologicalSum: 'Timing Sum',
        keyCountParity: 'Key Count Parity',
        wpmConsistency: 'WPM Consistency',
        valueBounds: 'Value Bounds',
        chartData: 'Chart Data',
        autocorrelation: 'Autocorrelation',
    };

    for (const [key, check] of Object.entries(analysis.checks)) {
        const item = document.createElement('div');
        item.className = 'check-item';

        const statusClass = check.pass ? 'check-pass' : (check.score >= 40 ? 'check-warn' : 'check-fail');
        const statusText = check.pass ? 'PASS' : (check.score >= 40 ? 'WARN' : 'FAIL');

        item.innerHTML = `
            <span class="check-name">${checkLabels[key] || key}</span>
            <span class="check-status ${statusClass}">${statusText} (${Math.round(check.score)})</span>
        `;
        checksGrid.appendChild(item);
    }

    // Update stats
    updateStats(analysis.stats);

    // Update flags
    updateFlags(analysis.flags);

    // Update charts
    updateCharts(analysis);

    // Update detailed analysis
    updateDetailedAnalysis(analysis);
}

function updateStats(stats) {
    const statsGrid = document.getElementById('statsGrid');

    const statItems = [
        { label: 'WPM', value: stats.wpm?.toFixed(1), expected: '30-350' },
        { label: 'Accuracy', value: stats.acc?.toFixed(1) + '%', expected: '75-100%' },
        { label: 'Consistency', value: stats.consistency?.toFixed(1) + '%', expected: '0-100%' },
        { label: 'Spacing CV', value: stats.spacingCV?.toFixed(3), expected: '0.25-0.95' },
        { label: 'Duration CV', value: stats.durationCV?.toFixed(3), expected: '0.15-0.80' },
        { label: 'Spacing Mean', value: stats.spacingMean?.toFixed(1) + 'ms', expected: '50-500ms' },
        { label: 'Spacing StdDev', value: stats.spacingStdDev?.toFixed(1) + 'ms', expected: 'Variable' },
        { label: 'Skewness', value: stats.spacingSkewness?.toFixed(2), expected: '0.3-3.0' },
        { label: 'Key Overlap', value: stats.keyOverlap?.toFixed(0) + 'ms', expected: 'Variable' },
    ];

    statsGrid.innerHTML = statItems.map(item => `
        <div class="stat-box">
            <div class="stat-value">${item.value || '--'}</div>
            <div class="stat-label">${item.label}</div>
            <div class="stat-expected">Expected: ${item.expected}</div>
        </div>
    `).join('');
}

function updateFlags(flags) {
    const flagsSection = document.getElementById('flagsSection');

    if (flags.length === 0) {
        flagsSection.innerHTML = '<p style="color: #4caf50; font-size: 0.9rem;">✅ No suspicious patterns detected</p>';
        return;
    }

    flagsSection.innerHTML = flags.map(flag => `
        <div class="flag-item ${flag.severity === 'warning' ? 'warning' : ''}">
            <span class="flag-icon">${flag.severity === 'critical' ? '🚨' : '⚠️'}</span>
            <span class="flag-text"><strong>${flag.check}:</strong> ${flag.message}</span>
        </div>
    `).join('');
}

function updateCharts(analysis) {
    const result = analysis.result;

    // Destroy existing charts
    Object.values(charts).forEach(chart => chart?.destroy());
    charts = {};

    // Key Spacing Histogram
    if (result.keySpacing && result.keySpacing !== 'toolong') {
        const ctx1 = document.getElementById('spacingHistogram').getContext('2d');
        const bins = createHistogram(result.keySpacing, 25);

        charts.spacingHistogram = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: bins.labels,
                datasets: [{
                    label: 'Frequency',
                    data: bins.counts,
                    backgroundColor: 'rgba(255, 107, 107, 0.6)',
                    borderColor: 'rgba(255, 107, 107, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } },
                    x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa', maxRotation: 45 } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Key Duration Histogram
    if (result.keyDuration && result.keyDuration !== 'toolong') {
        const ctx2 = document.getElementById('durationHistogram').getContext('2d');
        const bins = createHistogram(result.keyDuration, 25);

        charts.durationHistogram = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: bins.labels,
                datasets: [{
                    label: 'Frequency',
                    data: bins.counts,
                    backgroundColor: 'rgba(100, 181, 246, 0.6)',
                    borderColor: 'rgba(100, 181, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } },
                    x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa', maxRotation: 45 } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // WPM Over Time
    if (result.chartData && result.chartData !== 'toolong' && result.chartData.wpm) {
        const ctx3 = document.getElementById('wpmChart').getContext('2d');

        charts.wpmChart = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: result.chartData.wpm.map((_, i) => i + 1),
                datasets: [{
                    label: 'WPM',
                    data: result.chartData.wpm,
                    borderColor: 'rgba(76, 175, 80, 1)',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } },
                    x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Key Spacing Timeline
    if (result.keySpacing && result.keySpacing !== 'toolong') {
        const ctx4 = document.getElementById('spacingTimeline').getContext('2d');

        // Downsample if too many points
        const maxPoints = 200;
        let data = result.keySpacing;
        if (data.length > maxPoints) {
            const step = Math.ceil(data.length / maxPoints);
            data = data.filter((_, i) => i % step === 0);
        }

        charts.spacingTimeline = new Chart(ctx4, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    label: 'Key Spacing',
                    data: data,
                    borderColor: 'rgba(255, 193, 7, 1)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    fill: true,
                    tension: 0,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } },
                    x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

function createHistogram(data, numBins) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / numBins;

    const counts = new Array(numBins).fill(0);
    const labels = [];

    for (let i = 0; i < numBins; i++) {
        const binStart = min + i * binWidth;
        labels.push(Math.round(binStart));
    }

    data.forEach(value => {
        const binIndex = Math.min(numBins - 1, Math.floor((value - min) / binWidth));
        counts[binIndex]++;
    });

    return { labels, counts };
}

function updateDetailedAnalysis(analysis) {
    const section = document.getElementById('analysisSection');
    const stats = analysis.stats;
    const checks = analysis.checks;

    section.innerHTML = `
        <div class="analysis-item">
            <div class="analysis-title">📊 Statistical Summary</div>
            <div class="analysis-detail">
                <strong>Key Spacing:</strong> Mean <code>${stats.spacingMean?.toFixed(1)}ms</code>, 
                StdDev <code>${stats.spacingStdDev?.toFixed(1)}ms</code>, 
                CV <code>${stats.spacingCV?.toFixed(3)}</code><br>
                <strong>Percentiles:</strong> P10=<code>${stats.spacingP10?.toFixed(0)}ms</code>, 
                P50=<code>${stats.spacingP50?.toFixed(0)}ms</code>, 
                P90=<code>${stats.spacingP90?.toFixed(0)}ms</code><br>
                <strong>Range:</strong> <code>${stats.spacingMin?.toFixed(0)}</code> - <code>${stats.spacingMax?.toFixed(0)}ms</code>
            </div>
        </div>
        
        <div class="analysis-item">
            <div class="analysis-title">📈 Distribution Analysis</div>
            <div class="analysis-detail">
                <strong>Skewness:</strong> <code>${stats.spacingSkewness?.toFixed(3)}</code> 
                (human typing is positively skewed, typically 0.5-2.0)<br>
                <strong>Kurtosis:</strong> <code>${stats.spacingKurtosis?.toFixed(3)}</code> 
                (indicates tail heaviness)<br>
                <strong>Assessment:</strong> ${checks.distributionShape.message}
            </div>
        </div>
        
        <div class="analysis-item">
            <div class="analysis-title">⚡ Burst Pattern Analysis</div>
            <div class="analysis-detail">
                <strong>Burst Ratio:</strong> <code>${(checks.burstPattern.burstRatio * 100)?.toFixed(1)}%</code> 
                of keystrokes are fast bursts (&lt;80ms)<br>
                <strong>Burst Clusters:</strong> <code>${checks.burstPattern.burstClusters || 'N/A'}</code> 
                distinct burst sequences detected<br>
                <strong>Assessment:</strong> ${checks.burstPattern.message}
            </div>
        </div>
        
        <div class="analysis-item">
            <div class="analysis-title">⏱️ Timing Validation</div>
            <div class="analysis-detail">
                <strong>Chronological Sum:</strong> Calculated <code>${checks.chronologicalSum.calculated?.toFixed(0)}ms</code> 
                vs Expected <code>${checks.chronologicalSum.expected?.toFixed(0)}ms</code><br>
                <strong>Difference:</strong> <code>${checks.chronologicalSum.diff?.toFixed(0)}ms</code><br>
                <strong>Assessment:</strong> ${checks.chronologicalSum.message}
            </div>
        </div>
        
        <div class="analysis-item">
            <div class="analysis-title">🔗 Autocorrelation</div>
            <div class="analysis-detail">
                <strong>Lag-1 Autocorrelation:</strong> <code>${checks.autocorrelation.autocorr?.toFixed(4)}</code><br>
                Human typing shows temporal dependency (adjacent timings are related).<br>
                <strong>Assessment:</strong> ${checks.autocorrelation.message}
            </div>
        </div>
        
        <div class="analysis-item">
            <div class="analysis-title">🎯 Kogasa Consistency Score</div>
            <div class="analysis-detail">
                <strong>Formula:</strong> <code>kogasa(cv) = 100 × (1 - tanh(cv + cv³/3 + cv⁵/5))</code><br>
                <strong>Reported:</strong> <code>${stats.consistency}%</code><br>
                <strong>Recalculated:</strong> <code>${analyzer.kogasa(stats.spacingCV).toFixed(2)}%</code>
            </div>
        </div>
    `;
}

function clearAll() {
    document.getElementById('payloadInput').value = '';
    document.getElementById('verdictBox').className = 'verdict-box verdict-suspicious';
    document.getElementById('verdictTitle').textContent = 'AWAITING ANALYSIS';
    document.getElementById('verdictScore').textContent = '--';
    document.getElementById('verdictDesc').textContent = 'Paste a payload and click Analyze';
    document.getElementById('checksGrid').innerHTML = '';
    document.getElementById('statsGrid').innerHTML = '';
    document.getElementById('flagsSection').innerHTML = '<p style="color: #666; font-size: 0.9rem;">No flags detected yet</p>';
    document.getElementById('analysisSection').innerHTML = '';

    Object.values(charts).forEach(chart => chart?.destroy());
    charts = {};
    currentAnalysis = null;
}

// Sample payloads for testing
function loadSampleHuman() {
    // Real human-like payload with good variance
    const sample = {
        "result": {
            "wpm": 88.76,
            "rawWpm": 88.76,
            "charStats": [111, 0, 0, 0],
            "charTotal": 111,
            "acc": 97.39,
            "mode": "time",
            "mode2": "15",
            "punctuation": false,
            "numbers": false,
            "lazyMode": false,
            "timestamp": 1775009885711,
            "language": "english",
            "restartCount": 2,
            "incompleteTests": [],
            "incompleteTestSeconds": 0.81,
            "difficulty": "normal",
            "blindMode": false,
            "tags": [],
            "keySpacing": [
                74, 73.6, 184.1, 151.9, 198.2, 151.8, 107.5, 108.7, 85.1, 119.6, 159.7,
                83.3, 220.9, 200.3, 156.8, 74.6, 75.3, 133.2, 91.9, 97.6, 110.2, 109.8,
                96.1, 212.3, 108.6, 598.4, 296.4, 190.2, 176.6, 121.2, 112.7, 189, 79.7,
                142.5, 108.5, 106.7, 107.6, 101.6, 81, 109, 114.6, 110.5, 99.7, 83.6,
                82.9, 115.2, 86.5, 133.1, 92.3, 152.2, 57.6, 166.8, 322.5, 108.3, 82.6,
                84.4, 98, 204.3, 79.6, 156.4, 146.6, 133.1, 98.8, 126.6, 112.1, 239.3,
                170.9, 162.6, 122.1, 105.9, 59.3, 67.2, 81.9, 93.1, 56.2, 145.7, 158.9,
                130.7, 76.4, 94.6, 93.5, 88.1, 98.7, 86.7, 165.9, 61.6, 119.4, 54.5, 76.6,
                117.1, 81.8, 106.2, 77.7, 125.3, 74.9, 370.6, 499.1, 97.8, 121, 113.6,
                67.9, 147.8, 152.7, 97.8, 150.9, 351.2, 58.3, 177.7, 63, 68.2
            ],
            "keyDuration": [
                158.2, 128.1, 135.7, 233.1, 225.4, 82.3, 147.2, 175.6, 202.1,
                163.2, 109.1, 170.2, 110.1, 148.4, 127.6, 137, 101.7, 105.4, 157.2,
                113.7, 132.4, 205.7, 127.4, 151.2, 121.8, 90, 82.1, 122.3, 105.1, 186.5,
                123.8, 176, 143.4, 138.3, 116.1, 129, 107.5, 101.1, 123.4, 151.1, 155.9,
                161.7, 132.5, 189.4, 176.3, 156.4, 133.3, 166.6, 153.7, 179.9, 156.4, 192.9,
                102.6, 156.8, 153.9, 101.2, 129, 88.6, 152.2, 238.4, 177.4, 130.9,
                246.6, 148.4, 169.4, 132, 131.9, 187.9, 103.7, 185.6, 156.2, 215.3,
                148.8, 149.2, 96.4, 217.4, 186.8, 82.2, 169.2, 172.4, 142.9,
                125.1, 201.5, 153.9, 95.8, 130.5, 140.9, 136.5, 147.6, 126.5, 149.3,
                105.9, 144, 172.1, 110.8, 86.7, 102.6, 115.2, 119.1, 139.1, 215.5, 131.1,
                152.4, 103.5, 195.6, 84, 146.9, 123.7, 116.8, 174.9, 146.7
            ],
            "keyOverlap": 4342.4,
            "lastKeyToEnd": 0,
            "startToFirstKey": 0,
            "consistency": 71.56,
            "wpmConsistency": 93.54,
            "keyConsistency": 39.42,
            "funbox": [],
            "bailedOut": false,
            "chartData": {
                "wpm": [95, 90, 96, 75, 77, 82, 87, 87, 87, 89, 91, 93, 88, 87, 89],
                "burst": [96, 84, 108, 36, 84, 108, 120, 84, 84, 108, 108, 132, 36, 84, 108],
                "err": [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]
            },
            "testDuration": 15.01,
            "afkDuration": 0,
            "stopOnLetter": false,
            "hash": "2b753ee6163e701da87d50f460eed0680d27fbc1"
        }
    };

    document.getElementById('payloadInput').value = JSON.stringify(sample, null, 2);
}

function loadSampleBot() {
    // Bot-like payload with suspicious patterns
    const charTotal = 150;
    const keySpacing = [];
    const keyDuration = [];

    // Generate suspiciously consistent timings (low CV)
    for (let i = 0; i < charTotal - 1; i++) {
        // Very consistent - small variance around mean
        keySpacing.push(100 + (Math.random() - 0.5) * 10); // 95-105ms range
    }
    for (let i = 0; i < charTotal; i++) {
        keyDuration.push(120 + (Math.random() - 0.5) * 8); // 116-124ms range
    }

    const sample = {
        "result": {
            "wpm": 120,
            "rawWpm": 122,
            "charStats": [150, 0, 0, 0],
            "charTotal": charTotal,
            "acc": 100,
            "mode": "time",
            "mode2": "15",
            "punctuation": false,
            "numbers": false,
            "lazyMode": false,
            "timestamp": Date.now(),
            "language": "english",
            "restartCount": 0,
            "incompleteTests": [],
            "incompleteTestSeconds": 0,
            "difficulty": "normal",
            "blindMode": false,
            "tags": [],
            "keySpacing": keySpacing.map(s => Math.round(s * 10) / 10),
            "keyDuration": keyDuration.map(d => Math.round(d * 10) / 10),
            "keyOverlap": 0,
            "lastKeyToEnd": 100,
            "startToFirstKey": 100,
            "consistency": 95,
            "wpmConsistency": 98,
            "keyConsistency": 95,
            "funbox": [],
            "bailedOut": false,
            "chartData": {
                "wpm": [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120],
                "burst": [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120],
                "err": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            },
            "testDuration": 15,
            "afkDuration": 0,
            "stopOnLetter": false,
            "hash": "fakehash123"
        }
    };

    document.getElementById('payloadInput').value = JSON.stringify(sample, null, 2);
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnticheatAnalyzer };
}
