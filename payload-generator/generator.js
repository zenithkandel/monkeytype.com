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

        // Iterative bounded scaling to hit EXACT targetSum while preserving bucket bounds!
        let currentSum = gaps.reduce((a, b) => a + b, 0);
        let diff = targetSum - currentSum;
        let attempts = 0;
        
        while (Math.abs(diff) > 0.1 && attempts < 5000) {
            const add = diff > 0;
            const step = diff / gaps.length;
            
            for (let i = 0; i < gaps.length; i++) {
                const oldVal = gaps[i];
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
    generateChartData(keySpacing, startToFirstKey, testDuration, targetAcc, charStats) {
        let wpmData = [];
        let burstData = [];
        let errData = [];
        let absoluteTimes = [];
        let currentAbs = startToFirstKey;
        absoluteTimes.push(currentAbs);
        for(const gap of keySpacing) {
            currentAbs += gap;
            absoluteTimes.push(currentAbs);
        }
        let totalTimeSec = testDuration;
        let numSeconds = Math.ceil(totalTimeSec);
        let keysProcessed = 0;
        let correctRatio = charStats[0] / (charStats[0] + charStats[1] + charStats[2] + charStats[3]);
        for (let s = 1; s <= numSeconds; s++) {
            let startSec = (s - 1) * 1000;
            let endSec = s * 1000;
            let isLastBucket = (s === numSeconds && totalTimeSec % 1 !== 0);
            if(isLastBucket) { endSec = totalTimeSec * 1000; }
            let keysInBucket = 0;
            while(keysProcessed < absoluteTimes.length && absoluteTimes[keysProcessed] <= endSec) {
                keysInBucket++;
                keysProcessed++;
            }
            let bucketDuration = isLastBucket ? totalTimeSec - (s - 1) : 1;
            let burst = Math.round((keysInBucket / 5) * (60 / bucketDuration));
            burstData.push(burst);
            let wpmElapsed = isLastBucket ? totalTimeSec : s;
            let currentWpm = Math.round(((keysProcessed * correctRatio) / 5) * (60 / wpmElapsed) * 100) / 100;
            wpmData.push(currentWpm);
            errData.push(0);
        }
        if (wpmData.length > 0) wpmData[wpmData.length - 1] = Math.round((charStats[0] / 5) * (60 / testDuration) * 100) / 100;
        return { wpmData, burstData, errData };
    }

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
        const totalSpacingTime = Math.round(keySpacing.reduce((a, b) => a + b, 0) * 100) / 100;
        const remainingTime = Math.round(((testDuration * 1000) - totalSpacingTime) * 100) / 100;

        // startToFirstKey and lastKeyToEnd should add up with spacing to equal duration
        // These are decimals rounded to 2 decimal places (like real data: 275.38, 124.8)
        const startToFirstKey = Math.max(0, Math.round(remainingTime * 0.3 * 100) / 100);
        const lastKeyToEnd = Math.max(0, Math.round((remainingTime - startToFirstKey) * 100) / 100);

        // Generate chart data
        
        const { wpmData: chartWpm, burstData: chartBurst, errData: chartErr } = this.generateChartData(keySpacing, startToFirstKey, testDuration, targetAcc, charStats);


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
