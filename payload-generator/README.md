# MonkeyType Human-Like Payload Generator

A sophisticated payload generator that creates MonkeyType test results with realistic human typing patterns. This tool generates timing data that mimics actual human behavior to pass anti-cheat validation.

## 🧠 How It Works

Human typing is characterized by:

### 1. **Statistical Distribution**

- Uses **log-normal/gamma distributions** (NOT uniform or gaussian)
- Humans have many small intervals and few large spikes
- Coefficient of Variation (CV) between **0.3-0.8** (bots are 0.01-0.1)

### 2. **Burst Patterns**

- Typing happens in fast bursts (40-80ms) followed by pauses
- Not steady/consistent like a bot

### 3. **Word Boundary Effects**

- Longer pauses at spaces (150-400ms)
- Occasional hesitation pauses (400-800ms)

### 4. **Fatigue Curve**

- Slight slowdown towards the end of the test
- Increased variance in later portions

### 5. **Key Overlap**

- Fast typists press the next key before releasing the previous
- Creates natural overlap patterns

## 📁 Files

| File             | Description                           |
| ---------------- | ------------------------------------- |
| `index.html`     | Web-based GUI for generating payloads |
| `generator.js`   | Core generation logic for browser     |
| `payload-cli.js` | Node.js CLI version                   |

## 🚀 Usage

### Web Interface

1. Open `index.html` in your browser
2. Configure WPM, duration, accuracy, etc.
3. Click "Generate Payload"
4. Copy or download the result

### CLI (Node.js)

```bash
# Basic usage
node payload-cli.js --wpm 90 --duration 30

# Full options
node payload-cli.js \
  --wpm 100 \
  --duration 60 \
  --acc 97 \
  --uid "your-monkeytype-uid" \
  --output payload.json

# See all options
node payload-cli.js --help
```

### CLI Options

| Option          | Default | Description                             |
| --------------- | ------- | --------------------------------------- |
| `--wpm`         | 90      | Target words per minute                 |
| `--duration`    | 30      | Test duration in seconds (15/30/60/120) |
| `--acc`         | 96      | Target accuracy percentage              |
| `--uid`         | -       | Your MonkeyType user ID                 |
| `--mode`        | time    | Test mode (time/words)                  |
| `--language`    | english | Language                                |
| `--punctuation` | false   | Enable punctuation                      |
| `--numbers`     | false   | Enable numbers                          |
| `--output`      | -       | Save to file instead of stdout          |

## 📊 Anti-Cheat Validation Points

The generator ensures compliance with MonkeyType's validation:

### Chronological Summation

```
keySpacing.sum + startToFirstKey + lastKeyToEnd = testDuration × 1000
```

### Key Count Parity

- `keySpacing.length = charTotal - 1`
- `keyDuration.length = charTotal`

### Statistical Validation

- Mean key spacing matches expected WPM
- Standard deviation indicates human variance
- Kogasa consistency score (0-100%)

### Chart Data

- `chartData.wpm` and `chartData.burst` arrays match test duration
- Realistic WPM fluctuation pattern

## 📈 Generated Statistics

The generator outputs validation statistics:

```
Key Spacing CV: 0.45 (human: 0.3-0.8, bot: 0.01-0.1)
Key Duration CV: 0.32
Key Overlap: 2500ms
Consistency: 72%
```

## ⚠️ Important Notes

1. **Hash Generation**: The payload includes a hash generated with `object-hash`. For CLI usage, install it:

   ```bash
   npm install object-hash@3.0.0
   ```

2. **UID Required**: For authenticated requests, you must provide your MonkeyType user ID.

3. **Realistic Values**: Keep WPM below 350 and accuracy above 75% to avoid automatic rejection.

## 🔬 Technical Details

### Kogasa Consistency Formula

```javascript
kogasa(cv) = 100 × (1 - tanh(cv + cv³/3 + cv⁵/5))
```

### WPM Calculation

```
WPM = (correctChars / 5) × (60 / testSeconds)
```

### Distribution Parameters

| Timing Type    | Range (ms) | Frequency |
| -------------- | ---------- | --------- |
| Fast burst     | 40-80      | ~25%      |
| Normal         | 80-150     | ~50%      |
| Thinking pause | 150-400    | ~20%      |
| Hesitation     | 400-800    | ~5%       |

## 📝 Example Output

```json
{
  "result": {
    "wpm": 89.5,
    "rawWpm": 91.2,
    "charStats": [220, 8, 2, 0],
    "charTotal": 230,
    "acc": 96.5,
    "mode": "time",
    "mode2": "30",
    "keySpacing": [74.2, 68.1, 185.3, ...],
    "keyDuration": [142.3, 128.7, 156.2, ...],
    "keyOverlap": 2847.3,
    "consistency": 71.56,
    "chartData": {
      "wpm": [85, 92, 88, 91, ...],
      "burst": [84, 108, 96, 120, ...],
      "err": [0, 0, 1, 0, ...]
    },
    "hash": "abc123..."
  }
}
```

## 🛡️ Disclaimer

This tool is provided for educational purposes only. Use responsibly and ethically.
