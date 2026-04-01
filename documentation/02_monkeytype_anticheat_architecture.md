# MonkeyType Anticheat Architecture

Throughout this project, we fully deciphered the backend protection vectors that MonkeyType has structured to prevent botting. MonkeyType relies more on **Mathematical Integrity** and **Statistical Variance** than generic static thresholds or generic web application firewall rules.

## 1. Schema Strictness

MonkeyType's backend leverages `Zod` to strictly validate `ResultBaseSchema` and `CompletedEventSchema`.

- **Property Filtering:** Passing unknown fields causes schema resolution drops. Passing known fields with wrong types leads to an immediate internal rejection.
- **Contextual Integrity:** If the `mode` is `"time"`, fields like `quoteLength` cannot exist on the payload. Passing them will directly trigger a `Result data doesn't make sense` crash.

## 2. Statistical Variance & Consistency Analytics

MonkeyType analyzes variance using Coefficient of Variation (COV) instead of flat timing minimums.

### Measuring Spread (StdDev and Mean)

The backend calculates the `mean` and standard deviation (`stdDev`) of the user's `keySpacing` (delay between hitting keys) and `keyDuration` (how long a key is held down).

### Coefficient of Variation (COV)

To measure consistency regardless of how fast the user types, it uses:
`COV = stdDev / mean`

- **Robots:** A macro script will typically have a COV of `0.01` to `0.10` since timing is mostly static.
- **Humans:** Usually range between `0.30` and `0.80`, representing bursts of speed tied with momentary reading pauses.

### Kogasa Consistency Algorithm

MonkeyType transforms this variation into a percentage using a custom Taylor-expanded hyperbolic tangent function dubbed "Kogasa":
`consistency = 100 * (1 - Math.tanh(cov + Math.pow(cov,3)/3 + Math.pow(cov,5)/5))`

- If your Kogasa output is > `100%`, it trips the anticheat.
- Generating arrays must aim for a Kogasa range of `50% - 90%` for biological realism.

## 3. Time Summation Check

One of the strictest backend mechanisms checks the total physical lifespan of the test versus the timestamp vectors.
`Sum(keySpacing) + startToFirstKey + lastKeyToEnd == testDuration * 1000`

### Discovery

The sum must be _exactly_ the test duration multiplied by 1000ms. In JavaScript, doing complex array mapping often caused floating-point drift (e.g., resulting in `30000.000000000015` ms). This micro-drift of `1.455e-11` ms would fail the validation check (`diff != 0`) and throw the `Result data doesn't make sense` error.

**Fix:** Standardized precision wrapping `Math.round(val * 100) / 100` must be used linearly down the time mapping sequence.

## 4. Key Count Parity

MonkeyType maps characters to events with fierce 1:1 dependency:

- The length of `keyDuration` array must equal **`charTotal`**.
- The length of `keySpacing` array must equal **`charTotal - 1`**.
  Because the first key does not have a "space" before it, its spacing is calculated as `startToFirstKey`.

## 5. Security & Authentication (objectHash)

Monkeytype uses `object-hash` (SHA1 mechanism) locally to serialize the payload object and generate a `.hash` property string. To prevent tampering, the server generates the hash for the exact same object and compares them. If the objects do not match, the test is voided. You must strip the `hash` property before hashing the object locally to duplicate their implementation properly.
