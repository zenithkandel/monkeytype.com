# MonkeyType Anticheat Analyzer

A comprehensive anticheat system that replicates MonkeyType's server-side validation to detect synthetic/bot-generated typing test results.

## 🛡️ Features

The analyzer performs **11 validation checks** to detect fake payloads:

| Check                  | Description                           | What It Detects                                |
| ---------------------- | ------------------------------------- | ---------------------------------------------- |
| **CV Key Spacing**     | Coefficient of Variation for timing   | Bots have CV < 0.15, humans have 0.25-0.95     |
| **CV Key Duration**    | Coefficient of Variation for key hold | Too consistent = bot                           |
| **Distribution Shape** | Skewness and kurtosis analysis        | Human timing is positively skewed (log-normal) |
| **Burst Pattern**      | Detection of fast typing bursts       | Humans type in bursts, bots are steady         |
| **Long Pauses**        | Presence of thinking pauses           | Humans have occasional long pauses             |
| **Chronological Sum**  | Timing arithmetic validation          | `keySpacing + stfk + lkte = duration × 1000`   |
| **Key Count Parity**   | Array length validation               | `keySpacing.len = charTotal - 1`               |
| **WPM Consistency**    | Average spacing vs reported WPM       | Mean spacing should match WPM                  |
| **Value Bounds**       | Schema validation                     | WPM 1-350, accuracy 50-100, etc.               |
| **Chart Data**         | Chart array validation                | Length matches duration, has variance          |
| **Autocorrelation**    | Temporal dependency analysis          | Real typing has lag-1 autocorrelation          |

## 📁 Files

| File               | Description                       |
| ------------------ | --------------------------------- |
| `index.html`       | Web-based GUI with visualizations |
| `anticheat.js`     | Core analysis engine for browser  |
| `anticheat-cli.js` | Node.js CLI version               |

## 🚀 Usage

### Web Interface

1. Open `index.html` in your browser
2. Paste a MonkeyType payload JSON
3. Click "Analyze Payload"
4. View the verdict, checks, and visualizations

### Sample Data

The interface includes buttons to load:

- **Human Sample**: Real human typing data with natural variance
- **Bot Sample**: Synthetic data with suspicious patterns

### CLI Usage

```bash
# Analyze a JSON file
node anticheat-cli.js payload.json

# Read from stdin
cat payload.json | node anticheat-cli.js --stdin

# Show help
node anticheat-cli.js --help
```

## 📊 Detection Thresholds

### Coefficient of Variation (CV)

```
Humans:  CV = 0.25 - 0.95 (typically 0.35-0.75)
Bots:    CV = 0.01 - 0.15 (too consistent)
```

### Distribution Shape

- **Skewness**: Human timing is positively skewed (0.3-3.0)
  - Many small values, few large spikes (log-normal)
  - Negative or near-zero skewness = synthetic
- **Kurtosis**: Indicates tail heaviness (-1 to 15)

### Burst Patterns

```
Bursts (<80ms):    10-50% of keystrokes
Long pauses (>300ms): 2-30% of keystrokes
```

### Autocorrelation

```
Real typing:  0.05 - 0.70 (adjacent timings are related)
Pure random:  ~0 (no temporal dependency)
Patterned:    >0.70 (too predictable)
```

## 🎯 Scoring System

Each check contributes to a weighted final score:

| Check              | Weight |
| ------------------ | ------ |
| CV Key Spacing     | 15     |
| Chronological Sum  | 15     |
| Distribution Shape | 15     |
| CV Key Duration    | 10     |
| Burst Pattern      | 10     |
| Long Pauses        | 10     |
| Key Count Parity   | 10     |
| WPM Consistency    | 10     |
| Value Bounds       | 5      |

### Verdict Thresholds

- **75-100**: LIKELY HUMAN ✅
- **50-74**: SUSPICIOUS ⚠️
- **0-49**: LIKELY BOT ❌

## 📈 Visualizations

The web interface shows:

1. **Key Spacing Histogram**: Distribution of inter-key intervals
   - Human: Positively skewed (right tail)
   - Bot: Symmetric or uniform

2. **Key Duration Histogram**: Distribution of key hold times

3. **WPM Over Time**: Typing speed variation per second
   - Human: Wavy with variance
   - Bot: Flat line

4. **Key Spacing Timeline**: Raw timing data over test duration
   - Human: Irregular with bursts and pauses
   - Bot: Consistent pattern

## 🔬 Technical Details

### Kogasa Consistency Formula

```javascript
kogasa(cv) = 100 × (1 - tanh(cv + cv³/3 + cv⁵/5))
```

### Chronological Validation

```
Sum(keySpacing) + startToFirstKey + lastKeyToEnd = testDuration × 1000
```

### Expected Mean Spacing

```
meanSpacing = 12000 / WPM
```

### Key Count Rules

```
keySpacing.length = charTotal - 1
keyDuration.length = charTotal
chartData.wpm.length = ceil(testDuration)
```

## 🚩 Common Bot Indicators

1. **Too Consistent**: CV below 0.15
2. **No Long Pauses**: Missing thinking breaks
3. **Symmetric Distribution**: Timing not log-normal
4. **Flat WPM Chart**: No variation over time
5. **Zero Autocorrelation**: Appears purely random
6. **Perfect Timing Sum**: Exactly matches duration
7. **Missing Bursts**: No fast typing sequences

## 🔒 How MonkeyType's Real Anticheat Works

Based on code analysis:

1. **Hash Verification**: `object-hash` SHA-256
2. **Schema Validation**: Zod schemas with strict bounds
3. **Key Statistics**: Mean and stdDev analysis
4. **Duplicate Detection**: Rolling window of recent hashes
5. **Rate Limiting**: 300 results per hour
6. **Progressive Trust**: Stricter checks for unverified users
7. **High WPM Scrutiny**: Extra validation above 130 WPM

## 📝 Example Output

```
============================================================
🛡️  MONKEYTYPE ANTICHEAT ANALYSIS REPORT
============================================================

VERDICT: LIKELY BOT
SCORE: 32/100

📊 PAYLOAD INFO
  WPM: 120
  Accuracy: 100%
  Consistency: 95%
  Duration: 15s
  Characters: 150

✅ VALIDATION CHECKS
  Key Spacing CV       ✗ FAIL ( 10)
  Key Duration CV      ✗ FAIL ( 10)
  Distribution Shape   ⚠ WARN ( 45)
  Burst Pattern        ✗ FAIL ( 30)
  Long Pauses          ✗ FAIL ( 40)
  Timing Summation     ✓ PASS (100)
  ...

🚩 FLAGS DETECTED
  🚨 cvKeySpacing: CV 0.050 is TOO LOW - bot indicator
  🚨 cvKeyDuration: Duration CV 0.033 TOO consistent
  ⚠️ burstPattern: Only 0.0% bursts
```

## ⚠️ Disclaimer

This tool is for educational purposes only. It demonstrates how typing pattern analysis works and can help developers understand human-computer interaction metrics.
