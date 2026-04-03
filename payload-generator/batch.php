<?php
set_time_limit(0);   // no execution time limit
ini_set('memory_limit', '512M'); // optional, just in case
/**
 * batch.php – Web UI + PHP port of HumanTypingGenerator.
 * Generates multiple payloads from a WPM list and stores them in generated.log.
 */

if (php_sapi_name() === 'cli') {
    // If run from command line, we could also process, but here we expect web.
    die("Run this script in a web server.\n");
}

// ------------------------------------------------------------
// 1. PHP port of HumanTypingGenerator (exact logic from generator.js)
// ------------------------------------------------------------
class HumanTypingGenerator
{
    private $durationParams;

    public function __construct()
    {
        $this->durationParams = [
            'fastTypist' => ['min' => 40, 'max' => 100],
            'normalTypist' => ['min' => 80, 'max' => 150],
            'slowTypist' => ['min' => 100, 'max' => 200],
        ];
    }

    // ----- random helpers -----
    private function normalRandom()
    {
        $u1 = mt_rand() / mt_getrandmax();
        $u2 = mt_rand() / mt_getrandmax();
        return sqrt(-2 * log($u1)) * cos(2 * M_PI * $u2);
    }

    private function logNormal($mu, $sigma)
    {
        $z = $this->normalRandom();
        return exp($mu + $sigma * $z);
    }

    // ----- key spacing generator (mirrors JS) -----
    public function generateKeySpacing($targetWpm, $charCount, $testDuration)
    {
        $numGaps = $charCount - 1;
        if ($numGaps <= 0)
            return [];

        $targetSum = $testDuration * 1000 - (mt_rand() / mt_getrandmax() * 100 + 50);

        // bucket counts (same as JS)
        $longPauseCount = (int) ceil($numGaps * 0.025);
        $burstCount = (int) floor($numGaps * 0.48);
        $normalCount = $numGaps - $longPauseCount - $burstCount;

        $absoluteMinSum = ($longPauseCount * 300) + ($normalCount * 80) + ($burstCount * 20);
        if ($targetSum < $absoluteMinSum) {
            $longPauseCount = 0;
            $burstCount = (int) floor($numGaps * 0.48);
            $normalCount = $numGaps - $burstCount;
            $minSumLevel2 = ($normalCount * 80) + ($burstCount * 20);
            if ($targetSum < $minSumLevel2) {
                $burstCount = $numGaps;
                $normalCount = 0;
            }
        }

        $gaps = [];
        for ($i = 0; $i < $longPauseCount; $i++) {
            $gaps[] = 300 + mt_rand() / mt_getrandmax() * 100;
        }
        for ($i = 0; $i < $normalCount; $i++) {
            $gaps[] = 80 + (mt_rand() / mt_getrandmax()) * (mt_rand() / mt_getrandmax()) * 100;
        }
        for ($i = 0; $i < $burstCount; $i++) {
            $gaps[] = 20 + mt_rand() / mt_getrandmax() * 59;
        }

        shuffle($gaps);

        // scaling loop
        $currentSum = array_sum($gaps);
        $diff = $targetSum - $currentSum;
        $attempts = 0;
        while (abs($diff) > 0.1 && $attempts < 5000) {
            $step = $diff / count($gaps);
            for ($i = 0; $i < count($gaps); $i++) {
                $oldVal = $gaps[$i];
                $add = $diff > 0;
                $newVal = $oldVal + (abs($step) * ($add ? 1 : -1) * (0.8 + (mt_rand() / mt_getrandmax()) * 0.4));
                if (!$add) {
                    if ($oldVal >= 300)
                        $newVal = max(300.1, $newVal);
                    elseif ($oldVal >= 80)
                        $newVal = max(80.1, $newVal);
                    else
                        $newVal = max(20.1, $newVal);
                } else {
                    if ($oldVal < 80)
                        $newVal = min(79.9, $newVal);
                    elseif ($oldVal < 300)
                        $newVal = min(299.9, $newVal);
                }
                $diff -= ($newVal - $oldVal);
                $gaps[$i] = $newVal;
                if (abs($diff) <= 0.1)
                    break;
            }
            $attempts++;
        }

        $roundedGaps = array_map(function ($v) {
            return round($v, 1);
        }, $gaps);
        $roundedSum = array_sum($roundedGaps);
        $floatCorrection = round(($targetSum - $roundedSum) * 10);
        $idx = 0;
        while (abs($floatCorrection) > 0 && $idx < count($roundedGaps)) {
            $sign = $floatCorrection > 0 ? 1 : -1;
            $newVal = $roundedGaps[$idx] + ($sign * 0.1);
            if ($newVal >= 20.0) {
                $roundedGaps[$idx] = round($newVal, 1);
                $floatCorrection -= $sign;
            }
            $idx++;
        }
        return $roundedGaps;
    }

    // ----- key durations -----
    public function generateKeyDurations($charCount, $targetWpm)
    {
        if ($targetWpm > 120)
            $profile = $this->durationParams['fastTypist'];
        elseif ($targetWpm > 70)
            $profile = $this->durationParams['normalTypist'];
        else
            $profile = $this->durationParams['slowTypist'];

        $baseDuration = ($profile['min'] + $profile['max']) / 2;
        $durations = [];

        for ($i = 0; $i < $charCount; $i++) {
            $duration = $this->logNormal(log($baseDuration), 0.3);
            $duration = max($profile['min'] * 0.7, min($profile['max'] * 1.3, $duration));

            // floating‑point artifacts
            $fpArtifact = (mt_rand() / mt_getrandmax() - 0.5) * 0.0001;
            $duration += $fpArtifact;
            if (mt_rand() / mt_getrandmax() > 0.3) {
                $artifactType = mt_rand(0, 3);
                switch ($artifactType) {
                    case 0:
                        $duration = round($duration, 2) + 0.00000000298023;
                        break;
                    case 1:
                        $duration = round($duration, 2) - 0.0000000089407;
                        break;
                    case 2:
                        $duration = round($duration, 2) + 0.00000000596046;
                        break;
                    case 3:
                        $duration = round($duration, 2) - 0.00000000298023;
                        break;
                }
            } else {
                $duration = round($duration, 1);
            }
            $durations[] = $duration;
        }
        return $durations;
    }

    // ----- key overlap -----
    public function calculateKeyOverlap($targetWpm, $durations, $spacings)
    {
        if ($targetWpm < 60)
            return 0;
        $overlap = 0;
        $overlapProbability = min(0.4, ($targetWpm - 60) / 150);
        for ($i = 0; $i < count($spacings); $i++) {
            if ((mt_rand() / mt_getrandmax()) < $overlapProbability) {
                $potentialOverlap = max(0, $durations[$i] - $spacings[$i]);
                if ($potentialOverlap > 0) {
                    $overlap += $potentialOverlap * (0.3 + (mt_rand() / mt_getrandmax()) * 0.5);
                }
            }
        }
        return round($overlap, 1);
    }

    // ----- char stats from accuracy -----
    private function calculateCharStats($charTotal, $accuracy)
    {
        $correctChars = (int) round($charTotal * ($accuracy / 100));
        $rem = $charTotal - $correctChars;
        $extraChars = (int) floor($rem * (mt_rand() / mt_getrandmax()) * 0.3);
        $incorrectChars = $rem - $extraChars;
        $missedChars = 0;
        return [$correctChars, $incorrectChars, $extraChars, $missedChars];
    }

    // ----- chart data (WPM per second) -----
    private function generateChartData($keySpacing, $startToFirstKey, $testDuration, $charStats)
    {
        $absoluteTimes = [$startToFirstKey];
        $current = $startToFirstKey;
        foreach ($keySpacing as $gap) {
            $current += $gap;
            $absoluteTimes[] = $current;
        }

        $totalTimeSec = $testDuration;
        $numSeconds = (int) ceil($totalTimeSec);
        $keysProcessed = 0;
        $wpmData = [];
        $burstData = [];

        for ($s = 1; $s <= $numSeconds; $s++) {
            $startSec = ($s - 1) * 1000;
            $endSec = ($s == $numSeconds && fmod($totalTimeSec, 1) != 0) ? $totalTimeSec * 1000 : $s * 1000;
            $keysInBucket = 0;
            while ($keysProcessed < count($absoluteTimes) && $absoluteTimes[$keysProcessed] <= $endSec) {
                $keysInBucket++;
                $keysProcessed++;
            }
            $bucketDuration = ($s == $numSeconds && fmod($totalTimeSec, 1) != 0) ? $totalTimeSec - ($s - 1) : 1;
            $burst = round(($keysInBucket / 5) * (60 / $bucketDuration));
            $burstData[] = $burst;

            $wpmElapsed = ($s == $numSeconds && fmod($totalTimeSec, 1) != 0) ? $totalTimeSec : $s;
            $correctRatio = $charStats[0] / ($charStats[0] + $charStats[1] + $charStats[2] + $charStats[3]);
            $currentWpm = round((($keysProcessed * $correctRatio) / 5) * (60 / $wpmElapsed), 2);
            $wpmData[] = $currentWpm;
        }
        $wpmData[count($wpmData) - 1] = round(($charStats[0] / 5) * (60 / $testDuration), 2);
        return ['wpm' => $wpmData, 'burst' => $burstData, 'err' => array_fill(0, count($wpmData), 0)];
    }

    // ----- statistics helpers -----
    private function mean($arr)
    {
        return array_sum($arr) / count($arr);
    }
    private function stdDev($arr)
    {
        $avg = $this->mean($arr);
        $sq = array_map(function ($x) use ($avg) {
            return pow($x - $avg, 2);
        }, $arr);
        return sqrt(array_sum($sq) / count($arr));
    }
    private function kogasa($cv)
    {
        $taylorSum = $cv + pow($cv, 3) / 3 + pow($cv, 5) / 5;
        return 100 * (1 - tanh($taylorSum));
    }

    // ----- main generation method -----
    public function generate($config)
    {
        $targetWpm = $config['targetWpm'] ?? 90;
        $testDuration = $config['testDuration'] ?? 30;
        $mode = $config['mode'] ?? 'time';
        $targetAcc = $config['targetAcc'] ?? 96;
        $language = $config['language'] ?? 'english';
        $punctuation = $config['punctuation'] ?? false;
        $numbers = $config['numbers'] ?? false;
        $uid = $config['uid'] ?? '';

        $expectedCharTotal = (int) round($targetWpm * 5 * $testDuration / 60);
        $charStats = $this->calculateCharStats($expectedCharTotal, $targetAcc);
        $actualCharTotal = array_sum($charStats);

        $actualWpm = round(($charStats[0] / 5) * (60 / $testDuration), 2);
        $rawWpm = round((($charStats[0] + $charStats[1] + $charStats[2]) / 5) * (60 / $testDuration), 2);

        $keySpacing = $this->generateKeySpacing($targetWpm, $actualCharTotal, $testDuration);
        $keyDuration = $this->generateKeyDurations($actualCharTotal, $targetWpm);
        $keyOverlap = $this->calculateKeyOverlap($targetWpm, $keyDuration, $keySpacing);

        $totalSpacingTime = array_sum($keySpacing);
        $remainingTime = ($testDuration * 1000) - $totalSpacingTime;
        $startToFirstKey = max(0, round($remainingTime * 0.3, 2));
        $lastKeyToEnd = max(0, round($remainingTime - $startToFirstKey, 2));

        $chartData = $this->generateChartData($keySpacing, $startToFirstKey, $testDuration, $charStats);

        $spacingMean = $this->mean($keySpacing);
        $spacingStdDev = $this->stdDev($keySpacing);
        $spacingCV = $spacingStdDev / $spacingMean;

        $durationMean = $this->mean($keyDuration);
        $durationStdDev = $this->stdDev($keyDuration);
        $durationCV = $durationStdDev / $durationMean;

        $consistency = round($this->kogasa($spacingCV), 2);
        $keyConsistency = round($this->kogasa($durationCV), 2);
        $wpmConsistency = round($this->kogasa($this->stdDev($chartData['wpm']) / $this->mean($chartData['wpm'])), 2);

        $result = [
            'wpm' => $actualWpm,
            'rawWpm' => $rawWpm,
            'charStats' => $charStats,
            'charTotal' => $actualCharTotal,
            'acc' => round($targetAcc, 2),
            'mode' => $mode,
            'mode2' => (string) $testDuration,
            'punctuation' => $punctuation,
            'numbers' => $numbers,
            'lazyMode' => false,
            'timestamp' => round(microtime(true) * 1000),
            'language' => $language,
            'restartCount' => mt_rand(0, 2),
            'incompleteTests' => [],
            'incompleteTestSeconds' => 0,
            'difficulty' => 'normal',
            'blindMode' => false,
            'tags' => [],
            'keySpacing' => $keySpacing,
            'keyDuration' => $keyDuration,
            'keyOverlap' => $keyOverlap,
            'lastKeyToEnd' => $lastKeyToEnd,
            'startToFirstKey' => $startToFirstKey,
            'consistency' => $consistency,
            'wpmConsistency' => $wpmConsistency,
            'keyConsistency' => $keyConsistency,
            'funbox' => [],
            'bailedOut' => false,
            'chartData' => $chartData,
            'testDuration' => $testDuration,
            'afkDuration' => 0,
            'stopOnLetter' => false
        ];
        if ($uid)
            $result['uid'] = $uid;

        // generate hash (simulated, real would need external lib)
        $result['hash'] = 'generated_by_php_' . substr(md5(json_encode($result)), 0, 16);

        return [
            'result' => $result,
            'stats' => [
                'spacingCV' => round($spacingCV, 3),
                'durationCV' => round($durationCV, 3),
                'spacingMean' => round($spacingMean, 1),
                'durationMean' => round($durationMean, 1),
                'spacingStdDev' => round($spacingStdDev, 1),
                'durationStdDev' => round($durationStdDev, 1)
            ]
        ];
    }
}

// ------------------------------------------------------------
// 2. Helper: parse WPM list from string (e.g. "60,75,90" or "60-120:5")
// ------------------------------------------------------------
function parseWpmList($input)
{
    $wpms = [];
    $parts = explode(',', $input);
    foreach ($parts as $part) {
        $part = trim($part);
        if (strpos($part, '-') !== false) {
            // range like 60-120 or 60-120:5
            if (strpos($part, ':') !== false) {
                list($range, $step) = explode(':', $part);
                $step = (int) $step;
            } else {
                $range = $part;
                $step = 1;
            }
            list($start, $end) = explode('-', $range);
            $start = (int) $start;
            $end = (int) $end;
            for ($w = $start; $w <= $end; $w += $step) {
                $wpms[] = $w;
            }
        } else {
            $wpms[] = (int) $part;
        }
    }
    return array_unique($wpms);
}

// ------------------------------------------------------------
// 3. Process form submission (POST)
// ------------------------------------------------------------
$logFile = 'generated.log';
$message = '';
$generatedCount = 0;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['wpm_list'])) {
    $wpmListRaw = $_POST['wpm_list'];
    $wpms = parseWpmList($wpmListRaw);
    if (empty($wpms)) {
        $message = "⚠️ No valid WPM values found.";
    } else {
        $generator = new HumanTypingGenerator();
        $baseConfig = [
            'testDuration' => (int) ($_POST['testDuration'] ?? 30),
            'mode' => $_POST['mode'] ?? 'time',
            'targetAcc' => (float) ($_POST['targetAcc'] ?? 96),
            'language' => $_POST['language'] ?? 'english',
            'punctuation' => isset($_POST['punctuation']),
            'numbers' => isset($_POST['numbers']),
            'uid' => $_POST['uid'] ?? ''
        ];
        $fp = fopen($logFile, 'a');
        if (!$fp) {
            $message = "❌ Cannot write to $logFile. Check permissions.";
        } else {
            foreach ($wpms as $wpm) {
                $config = array_merge($baseConfig, ['targetWpm' => $wpm]);
                $payload = $generator->generate($config);
                fwrite($fp, json_encode($payload['result']) . "\n");
                $generatedCount++;
            }
            fclose($fp);
            $message = "✅ Generated $generatedCount payload(s) and appended to $logFile.";
        }
    }
}

// ------------------------------------------------------------
// 4. HTML UI
// ------------------------------------------------------------
?><!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MonkeyType Batch Payload Generator</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #e0e0e0;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        h1 {
            text-align: center;
            color: #00d9ff;
            margin-bottom: 30px;
        }

        .card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #aaa;
            font-weight: 500;
        }

        input,
        select,
        textarea {
            width: 100%;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: #fff;
            font-size: 1rem;
        }

        textarea {
            font-family: monospace;
            resize: vertical;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .checkbox-group input {
            width: auto;
        }

        button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%);
            border: none;
            border-radius: 6px;
            color: #000;
            font-weight: bold;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0, 217, 255, 0.3);
        }

        .message {
            background: rgba(0, 217, 255, 0.1);
            border-left: 4px solid #00d9ff;
            padding: 12px;
            border-radius: 6px;
            margin-top: 20px;
        }

        hr {
            border-color: rgba(255, 255, 255, 0.1);
            margin: 15px 0;
        }

        a {
            color: #00d9ff;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .info {
            font-size: 0.85rem;
            color: #aaa;
            margin-top: 5px;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>🐵 MonkeyType Batch Payload Generator</h1>

        <div class="card">
            <form method="POST">
                <div class="form-group">
                    <label>📋 WPM List (comma or range)</label>
                    <input type="text" name="wpm_list" required
                        placeholder="e.g., 60,75,90  or  60-120:5  or  80,100-150:10"
                        value="<?= htmlspecialchars($_POST['wpm_list'] ?? '') ?>">
                    <div class="info">Examples: <code>60,80,100</code> or <code>60-120:5</code> (range with step 5)
                    </div>
                </div>

                <div class="form-group">
                    <label>⏱️ Test Duration (seconds)</label>
                    <select name="testDuration">
                        <option value="15">15 seconds</option>
                        <option value="30" selected>30 seconds</option>
                        <option value="60">60 seconds</option>
                        <option value="120">120 seconds</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>🎯 Target Accuracy (%)</label>
                    <input type="number" name="targetAcc" step="0.1" min="75" max="100"
                        value="<?= htmlspecialchars($_POST['targetAcc'] ?? '96') ?>">
                </div>

                <div class="form-group">
                    <label>🌐 Language</label>
                    <input type="text" name="language" value="<?= htmlspecialchars($_POST['language'] ?? 'english') ?>">
                </div>

                <div class="form-group checkbox-group">
                    <input type="checkbox" name="punctuation" id="punctuation" <?= isset($_POST['punctuation']) ? 'checked' : '' ?>>
                    <label for="punctuation">➕ Include Punctuation</label>
                </div>

                <div class="form-group checkbox-group">
                    <input type="checkbox" name="numbers" id="numbers" <?= isset($_POST['numbers']) ? 'checked' : '' ?>>
                    <label for="numbers">🔢 Include Numbers</label>
                </div>

                <div class="form-group">
                    <label>🆔 User ID (optional)</label>
                    <input type="text" name="uid" value="<?= htmlspecialchars($_POST['uid'] ?? '') ?>">
                </div>

                <button type="submit">🚀 Generate Batch & Save to Log</button>
            </form>

            <?php if ($message): ?>
                <div class="message">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>

            <hr>
            <div style="text-align: center;">
                📄 <a href="<?= $logFile ?>" target="_blank">View / Download generated.log</a>
            </div>
        </div>

        <div class="card">
            <h3>ℹ️ About</h3>
            <p>This tool uses an exact PHP port of the <strong>HumanTypingGenerator</strong> logic from
                <code>generator.js</code>. Each payload mimics human typing patterns (log‑normal spacing, bursts, word
                boundaries, floating‑point artifacts, etc.).
            </p>
            <p>Payloads are appended as JSON objects (one per line) to <code><?= $logFile ?></code>.</p>
        </div>
    </div>
</body>

</html>