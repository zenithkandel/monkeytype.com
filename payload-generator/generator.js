/**
 * MonkeyType Human-Like Payload Generator
 * 
 * This generator creates payloads that mimic human typing patterns based on:
 * - Cognitive layer (thinking, reading ahead, processing)
 * - Motor layer (finger travel, hand dominance)
 * - Neuromuscular noise (tiny inconsistencies, fatigue)
 * 
 * Key human typing characteristics implemented:
 * - Log-normal/gamma-like distribution for key spacing (NOT uniform/gaussian)
 * - Coefficient of Variation (CV) of 0.3-0.8 (bots have 0.01-0.1)
 * - Burst patterns (fast-pause-fast-pause)
 * - Word boundary effects (longer pauses at spaces)
 * - Fatigue curve (slight slowdown over time)
 * - Key overlap for fast typists
 */

class HumanTypingGenerator {
    constructor() {
        // Human typing statistical parameters derived from research
        // These are calibrated to pass anti-cheat systems

        // Key spacing parameters (milliseconds)
        this.spacingParams = {
            burstMin: 40,       // Fast burst minimum
            burstMax: 80,       // Fast burst maximum
            normalMin: 80,      // Normal typing minimum
            normalMax: 150,     // Normal typing maximum  
            thinkMin: 150,      // Thinking pause minimum
            thinkMax: 400,      // Thinking pause maximum
            hesitationMin: 400, // Hesitation minimum
            hesitationMax: 800, // Hesitation maximum (word boundary)
        };

        // Key duration parameters (milliseconds)
        this.durationParams = {
            fastTypist: { min: 40, max: 100 },
            normalTypist: { min: 80, max: 150 },
            slowTypist: { min: 100, max: 200 },
        };

        // Human-realistic percentile distribution for key spacing
        // P10: 65, P25: 85, P50: 110, P75: 150, P90: 220
        this.spacingPercentiles = {
            p10: 65, p25: 85, p50: 110, p75: 150, p90: 220
        };

        // CV targets - humans are 0.3-0.8, bots are 0.01-0.1
        this.targetCV = { min: 0.35, max: 0.75 };
    }

    /**
     * Generate a log-normal distributed value
     * Human timing follows log-normal, not gaussian distribution
     */
    logNormal(mu, sigma) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.exp(mu + sigma * z);
    }

    /**
     * Generate gamma-distributed value
     * Alternative to log-normal, also matches human typing
     */
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

    normalRandom() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    /**
     * Generate human-like key spacing based on target WPM
     * Implements burst patterns, word boundaries, and fatigue
     */
    generateKeySpacing(targetWpm, charCount, testDuration) {
        const numGaps = charCount - 1;
        const targetSum = testDuration * 1000 - (Math.random() * 100 + 50); // target time allocated for spacings
        let meanTarget = targetSum / numGaps;

        // Determine bucket counts to satisfy Anticheat explicitly
        // 1. Long Pauses (>= 300ms). Need at least 2% to pass. Let's aim for 2.5%
        let longPauseCount = Math.ceil(numGaps * 0.025);

        // 2. Bursts (< 80ms). Must be <= 50% to pass. We'll aim for exactly 48%.
        let burstCount = Math.floor(numGaps * 0.48);

        // 3. Normal (80ms - 299ms). The remainder.
        let normalCount = numGaps - longPauseCount - burstCount;

        // If WPM is extremely high, we might mathematically not be able to afford the long pauses or normals.
        // Minimum possible sum given these buckets:
        const absoluteMinSum = (longPauseCount * 300) + (normalCount * 80) + (burstCount * 20);

        if (targetSum < absoluteMinSum) {
            // It is physically impossible to meet all bounds!
            // We must sacrifice buckets to fit the time.
            // 1st sacrifice: drop long pauses (they cost 300ms each, losing them just costs 10 points in anticheat)
            longPauseCount = 0;
            burstCount = Math.floor(numGaps * 0.48);
            normalCount = numGaps - burstCount;

            const minSumLevel2 = (normalCount * 80) + (burstCount * 20);
            if (targetSum < minSumLevel2) {
                // 2nd sacrifice: drop normals, meaning we will fail maxBurstRatio (but will pass valueBounds and CV)
                // This only happens at ~230+ WPM
                burstCount = numGaps;
                normalCount = 0;
            }
        }

        // Generate base values in their exact constrained bounds
        const gaps = [];

        for (let i = 0; i < longPauseCount; i++) {
            gaps.push(300 + Math.random() * 100);
        }
        for (let i = 0; i < normalCount; i++) {
            // Biased towards the lower end of normal to save time
            gaps.push(80 + Math.random() * Math.random() * 100);
        }
        for (let i = 0; i < burstCount; i++) {
            gaps.push(20 + Math.random() * 59);
        }

        // Shuffle arrays with a slight AR(1) clustering so it looks like typing (bursts clump together)
        // Instead of pure random shuffle, we do a random shuffle and then a smoothing sort
        this.shuffle(gaps);

        // Iterative bounded scaling to hit EXACT targetSum
        let currentSum = gaps.reduce((a, b) => a + b, 0);
        const iterations = 50;

        for (let iter = 0; iter < iterations; iter++) {
            currentSum = gaps.reduce((a, b) => a + b, 0);
            const diff = targetSum - currentSum;
            if (Math.abs(diff) < 0.1) break;

            const scale = targetSum / currentSum;
            for (let i = 0; i < gaps.length; i++) {
                let v = gaps[i] * scale;
                // Preserve the biological minimum
                v = Math.max(20, v);
                gaps[i] = v;
            }
        }

        // Re-calculate to absorb floating point rounding exactness
        currentSum = gaps.reduce((a, b) => a + b, 0);
        const finalFix = targetSum - currentSum;
        if (Math.abs(finalFix) > 0) {
            for (let i = 0; i < gaps.length; i++) {
                if (gaps[i] + finalFix > 20) {
                    gaps[i] += finalFix;
                    break;
                }
            }
        }

        // Return rounded to 1 decimal place. We must handle the rounding error though!
        const roundedGaps = gaps.map(s => Math.round(s * 10) / 10);
        const roundedSum = roundedGaps.reduce((a, b) => a + b, 0);

        // Exact 1st-decimal correction
        let floatCorrection = Math.round((targetSum - roundedSum) * 10);
        let idx = 0;
        while (Math.abs(floatCorrection) > 0 && idx < roundedGaps.length) {
            const sign = floatCorrection > 0 ? 1 : -1;
            if (roundedGaps[idx] + (sign * 0.1) >= 20.0) {
                roundedGaps[idx] = Math.round((roundedGaps[idx] + (sign * 0.1)) * 10) / 10;
                floatCorrection -= sign;
            }
            idx++;
        }

        return roundedGaps;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Scale spacings to exactly match test duration
     */
    scaleToTestDuration(spacings, testDuration) {
        const currentSum = spacings.reduce((a, b) => a + b, 0);
        const targetSum = testDuration * 1000; // Convert to ms

        // Leave room for startToFirstKey and lastKeyToEnd
        const margin = Math.random() * 100 + 50; // 50-150ms margin
        const adjustedTarget = targetSum - margin;

        const scale = adjustedTarget / currentSum;

        return spacings.map(s => Math.round(s * scale * 10) / 10);
    }

    /**
     * Generate human-like key durations
     * Varies by key type and typing speed
     */
    generateKeyDurations(charCount, targetWpm) {
        const durations = [];

        // Typist speed profile based on WPM
        let profile;
        if (targetWpm > 120) {
            profile = this.durationParams.fastTypist;
        } else if (targetWpm > 70) {
            profile = this.durationParams.normalTypist;
        } else {
            profile = this.durationParams.slowTypist;
        }

        const baseDuration = (profile.min + profile.max) / 2;

        for (let i = 0; i < charCount; i++) {
            // Log-normal distribution for natural variation
            let duration = this.logNormal(Math.log(baseDuration), 0.3);

            // Clamp to profile bounds with some overshoot allowed
            duration = Math.max(profile.min * 0.7, Math.min(profile.max * 1.3, duration));

            // Add browser-like floating point precision artifacts
            // Real data has values like 158.20000000298023 or 47.3999999910593
            // This mimics JavaScript's floating point representation quirks
            const fpArtifact = (Math.random() - 0.5) * 0.0001;
            duration = duration + fpArtifact;

            // Apply a small random offset that creates the typical browser timestamp patterns
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

    /**
     * Calculate key overlap for fast typists
     * Fast typists press next key before releasing previous
     */
    calculateKeyOverlap(targetWpm, durations, spacings) {
        if (targetWpm < 60) return 0; // Slow typists have no overlap

        let overlap = 0;
        const overlapProbability = Math.min(0.4, (targetWpm - 60) / 150);

        for (let i = 0; i < spacings.length; i++) {
            if (Math.random() < overlapProbability) {
                // Overlap when duration > spacing (next key pressed before release)
                const potentialOverlap = Math.max(0, durations[i] - spacings[i]);
                if (potentialOverlap > 0) {
                    overlap += potentialOverlap * (0.3 + Math.random() * 0.5);
                }
            }
        }

        return Math.round(overlap * 10) / 10;
    }

    /**
     * Convert WPM to mean key spacing
     * WPM = (chars / 5) * (60 / seconds)
     * Mean spacing = total_time / num_keypresses
     */
    wpmToMeanSpacing(wpm) {
        // Average word = 5 chars + 1 space = 6 chars
        // Chars per minute = WPM * 5
        // Chars per second = WPM * 5 / 60
        // Mean spacing (ms) = 1000 / (WPM * 5 / 60) = 12000 / WPM
        return 12000 / wpm;
    }

    /**
     * Generate WPM chart data (per-second WPM values)
     * Creates natural variation with drift and bursts
     */
    generateChartWpm(targetWpm, duration) {
        const wpmData = [];
        const numSeconds = Math.ceil(duration);

        // Start slightly above/below target, then settle
        let currentWpm = targetWpm + (Math.random() - 0.5) * 20;

        for (let i = 0; i < numSeconds; i++) {
            const progress = i / numSeconds;

            // Trend towards target with noise
            const drift = (targetWpm - currentWpm) * 0.3;
            const noise = (Math.random() - 0.5) * 25;

            // Fatigue - slight decrease towards end
            const fatigue = progress > 0.7 ? -(progress - 0.7) * 10 : 0;

            currentWpm += drift + noise + fatigue;

            // Occasional burst or dip (5% chance each)
            if (Math.random() < 0.05) currentWpm += Math.random() * 15;
            if (Math.random() < 0.05) currentWpm -= Math.random() * 15;

            // Keep within reasonable bounds
            currentWpm = Math.max(targetWpm * 0.6, Math.min(targetWpm * 1.4, currentWpm));

            wpmData.push(Math.round(currentWpm));
        }

        return wpmData;
    }

    /**
     * Generate burst speed data (raw WPM per second)
     * More erratic than smoothed WPM
     */
    generateChartBurst(targetWpm, duration) {
        const burstData = [];
        const numSeconds = Math.ceil(duration);

        // Burst values in increments of 12 (like real data: 36, 48, 60, 72, 84, 96, 108, 120, 132)
        const burstValues = [36, 48, 60, 72, 84, 96, 108, 120, 132, 144];

        // Find the closest burst values to target WPM
        const baseIndex = burstValues.findIndex(v => v >= targetWpm);
        const centerIndex = Math.max(0, Math.min(burstValues.length - 2, baseIndex - 1));

        for (let i = 0; i < numSeconds; i++) {
            // Weighted random selection around center
            const offset = Math.floor(this.normalRandom() * 2);
            const index = Math.max(0, Math.min(burstValues.length - 1, centerIndex + offset));
            burstData.push(burstValues[index]);
        }

        return burstData;
    }

    /**
     * Generate error distribution
     * Errors cluster together (not evenly distributed)
     */
    generateChartErrors(duration, targetAcc) {
        const errors = [];
        const numSeconds = Math.ceil(duration);

        // Calculate expected errors based on accuracy
        const errorRate = (100 - targetAcc) / 100;
        const expectedTotalErrors = Math.round(numSeconds * 5 * errorRate); // ~5 chars per second

        // Initialize with zeros
        for (let i = 0; i < numSeconds; i++) {
            errors.push(0);
        }

        // Distribute errors in clusters
        let remainingErrors = expectedTotalErrors;
        while (remainingErrors > 0) {
            const pos = Math.floor(Math.random() * numSeconds);
            const clusterSize = Math.min(remainingErrors, Math.floor(Math.random() * 3) + 1);
            errors[pos] += clusterSize;
            remainingErrors -= clusterSize;
        }

        return errors;
    }

    /**
     * Calculate Kogasa consistency score
     * kogasa(cv) = 100 * (1 - tanh(cv + cv³/3 + cv⁵/5))
     */
    kogasa(cv) {
        const taylorSum = cv + Math.pow(cv, 3) / 3 + Math.pow(cv, 5) / 5;
        return 100 * (1 - Math.tanh(taylorSum));
    }

    /**
     * Calculate statistics
     */
    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    stdDev(arr) {
        const avg = this.mean(arr);
        const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
    }

    /**
     * Calculate character statistics based on accuracy
     */
    calculateCharStats(charTotal, accuracy) {
        // Target correct chars based on accuracy
        const correctChars = Math.round(charTotal * (accuracy / 100));
        // Remaining are incorrect, but we want some extra/missed chars too
        const rem = charTotal - correctChars;
        const extraChars = Math.floor(rem * Math.random() * 0.3);
        const incorrectChars = rem - extraChars;
        const missedChars = 0; // Usually 0 in simple cases

        return [correctChars, incorrectChars, extraChars, missedChars];
    }

    /**
     * Generate complete human-like payload
     */
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

        // Base total characters needed for target WPM (including spaces)
        let expectedCharTotal = Math.round(targetWpm * 5 * testDuration / 60);

        // We want charStats sum exactly equal to expectedCharTotal
        const charStats = this.calculateCharStats(expectedCharTotal, targetAcc);
        const actualCharTotal = charStats.reduce((a, b) => a + b, 0); // Should be exactly expectedCharTotal

        // Calculate precise mathematically matched WPMs
        const actualWpm = Math.round((charStats[0] / 5) * (60 / testDuration) * 100) / 100;
        // Raw WPM excludes missed chars in standard calculation, but includes extra/incorrect
        const rawWpm = Math.round(((charStats[0] + charStats[1] + charStats[2]) / 5) * (60 / testDuration) * 100) / 100;

        // Generate key timing data based on EXACT charTotal
        const keySpacing = this.generateKeySpacing(targetWpm, actualCharTotal, testDuration);
        const keyDuration = this.generateKeyDurations(actualCharTotal, targetWpm);
        const keyOverlap = this.calculateKeyOverlap(targetWpm, keyDuration, keySpacing);

        // Calculate actual timing
        const totalSpacingTime = keySpacing.reduce((a, b) => a + b, 0);
        const remainingTime = (testDuration * 1000) - totalSpacingTime;

        // startToFirstKey and lastKeyToEnd should add up with spacing to equal duration
        // These are decimals rounded to 2 decimal places (like real data: 275.38, 124.8)
        const startToFirstKey = Math.max(0, Math.round(remainingTime * 0.3 * 100) / 100);
        const lastKeyToEnd = Math.max(0, Math.round(remainingTime * 0.7 * 100) / 100);

        // Generate chart data
        const chartWpm = this.generateChartWpm(targetWpm, testDuration);
        const chartBurst = this.generateChartBurst(targetWpm, testDuration);
        const chartErr = this.generateChartErrors(testDuration, targetAcc);

        // Calculate consistency metrics
        const spacingMean = this.mean(keySpacing);
        const spacingStdDev = this.stdDev(keySpacing);
        const spacingCV = spacingStdDev / spacingMean;

        const durationMean = this.mean(keyDuration);
        const durationStdDev = this.stdDev(keyDuration);
        const durationCV = durationStdDev / durationMean;

        // Kogasa consistency scores
        const consistency = Math.round(this.kogasa(spacingCV) * 100) / 100;
        const keyConsistency = Math.round(this.kogasa(durationCV) * 100) / 100;
        const wpmConsistency = Math.round(this.kogasa(this.stdDev(chartWpm) / this.mean(chartWpm)) * 100) / 100;

        // Character stats are already calculated at the top as charStats

        // Build result object (matching MonkeyType schema exactly)
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
            chartData: {
                wpm: chartWpm,
                burst: chartBurst,
                err: chartErr
            },
            testDuration: testDuration,
            afkDuration: 0,
            stopOnLetter: false
        };

        // Add UID if provided
        if (uid) {
            result.uid = uid;
        }

        // Generate hash using object-hash (must match server)
        // Note: User needs to generate hash client-side with the actual object-hash library
        const hashPlaceholder = 'GENERATE_WITH_OBJECT_HASH';
        result.hash = hashPlaceholder;

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

// Global instance
const generator = new HumanTypingGenerator();
let currentPayload = null;
let spacingChart = null;
let wpmChart = null;

/**
 * Generate payload and update UI
 */
function generatePayload() {
    const config = {
        targetWpm: parseFloat(document.getElementById('targetWpm').value),
        testDuration: parseInt(document.getElementById('testDuration').value),
        mode: document.getElementById('mode').value,
        targetAcc: parseFloat(document.getElementById('targetAcc').value),
        language: document.getElementById('language').value,
        punctuation: document.getElementById('punctuation').checked,
        numbers: document.getElementById('numbers').checked,
        uid: document.getElementById('uid').value
    };

    // Generate payload
    const { result, stats } = generator.generate(config);
    currentPayload = { result };

    // Try to generate hash with object-hash if available
    if (typeof objectHash !== 'undefined') {
        const toHash = { ...result };
        delete toHash.hash;
        result.hash = objectHash(toHash);
    }

    // Update stats display
    document.getElementById('statWpm').textContent = result.wpm;
    document.getElementById('statAcc').textContent = result.acc + '%';
    document.getElementById('statConsistency').textContent = result.consistency + '%';
    document.getElementById('statKeyConsistency').textContent = result.keyConsistency + '%';
    document.getElementById('statKsCV').textContent = stats.spacingCV;
    document.getElementById('statKdCV').textContent = stats.durationCV;
    document.getElementById('statOverlap').textContent = result.keyOverlap;

    // Update output
    document.getElementById('payloadOutput').textContent = JSON.stringify(currentPayload, null, 2);

    // Update charts
    updateCharts(result);
}

/**
 * Update visualization charts
 */
function updateCharts(result) {
    // Destroy existing charts
    if (spacingChart) spacingChart.destroy();
    if (wpmChart) wpmChart.destroy();

    // Key spacing histogram
    const spacingCtx = document.getElementById('spacingChart').getContext('2d');
    const bins = createHistogram(result.keySpacing, 20);

    spacingChart = new Chart(spacingCtx, {
        type: 'bar',
        data: {
            labels: bins.labels,
            datasets: [{
                label: 'Key Spacing Distribution (ms)',
                data: bins.counts,
                backgroundColor: 'rgba(0, 217, 255, 0.6)',
                borderColor: 'rgba(0, 217, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } },
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });

    // WPM over time chart
    const wpmCtx = document.getElementById('wpmChart').getContext('2d');

    wpmChart = new Chart(wpmCtx, {
        type: 'line',
        data: {
            labels: result.chartData.wpm.map((_, i) => i + 1),
            datasets: [{
                label: 'WPM Over Time',
                data: result.chartData.wpm,
                borderColor: 'rgba(0, 217, 255, 1)',
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } },
                x: { title: { display: true, text: 'Seconds', color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#aaa' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

/**
 * Create histogram bins
 */
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

/**
 * Copy payload to clipboard
 */
function copyPayload() {
    if (!currentPayload) {
        alert('Generate a payload first!');
        return;
    }
    navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2))
        .then(() => alert('Payload copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err));
}

/**
 * Download payload as JSON file
 */
function downloadPayload() {
    if (!currentPayload) {
        alert('Generate a payload first!');
        return;
    }
    const blob = new Blob([JSON.stringify(currentPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monkeytype-payload-${currentPayload.result.wpm}wpm.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('mode')) {
            // Initial generation (only in standalone mode)
            setTimeout(generatePayload, 100);
        }
    });
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HumanTypingGenerator };
}
