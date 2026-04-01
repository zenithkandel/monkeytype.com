# Monkeytype Anticheat Systems Report

Below is a detailed breakdown of the tools, technologies, mathematics, and variables used in Monkeytype's proprietary anti-cheat mechanisms derived from the core backend logic.

## 1. Core Technology Stack

| Technology/Library           | Purpose / Usage in Anticheat                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript / Node.js**     | The backend is written mathematically in TypeScript, meaning validations are strictly typed and heavily reliant on JS JSON boundary checks.                                        |
| **`object-hash` (npm)**      | Used to prevent MITM (Man-in-the-Middle) tampering. It hashes the entire payload excluding the `.hash` property directly on the browser and verifies it identically on the server. |
| **`UAParser` (UAParser.js)** | Fingerprints the client request header `User-Agent` and compares the stringified parsed data natively against the origin client request properties.                                |

## 2. Mathematical Functions

Monkeytype analyzes human variance using statistical variance mapping instead of static thresholds.

| Function                             | Formula / Logic                                                                        | Purpose                                                                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mean**                             | `array.reduce((a,b) => a+b, 0) / array.length`                                         | Finds the average `keySpacing`, `keyDuration`, and `wpm` per second.                                                                                                                      |
| **Standard Deviation (`stdDev`)**    | `Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a,b) => a+b) / array.length)` | Measures how far average keystrokes deviate from the mean. Identifies robots vs human burst typing.                                                                                       |
| **Coefficient of Variation (`COV`)** | `stdDev(array) / mean(array)`                                                          | Normalizes standard deviation regardless of how fast you type. A robotic script has a COV of `0.05` to `0.10`, while a human is usually between `0.65` and `0.90`.                        |
| **Kogasa Consistency (`kogasa`)**    | `100 * (1 - Math.tanh(cov + Math.pow(cov,3)/3 + Math.pow(cov,5)/5))`                   | Applies a customized hyperbolic tangent transformation `Math.tanh()` utilizing the Taylor expansion of inverse tangent to non-linearly scale the COV into a readable % score from 0-100%. |

## 3. Strict Boundary Validations

To pass an injection test, the payload must flawlessly pass physical and schema boundary checks:

| Validation Target           | Verification Rule / Constraint                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chronological Summation** | The sum of `keySpacing` array + `startToFirstKey` + `lastKeyToEnd` must equal exactly `testDuration * 1000` (e.g. 15000ms).                                                     |
| **Key Count Parity**        | `keySpacing` must be exactly `charTotal - 1`. `keyDuration` must be exactly `charTotal`.                                                                                        |
| **WPM History Arrays**      | `chartData.wpm` and `chartData.burst` arrays must precisely reflect the array length of `testDuration`, and they are mathematically recalculated based on timestamp boundaries. |
| **Out-of-Bounds Rejection** | WPM must be > 0 and <= 350. Accuracy must be >= 75%. Consistency must be <= 100%. Mode duration constraints (e.g. test time must be > 15s).                                     |
| **Schema Strictness**       | Values like `quoteLength` cannot exist in `mode: "time"`; if present, the strict backend schema validator automatically throws "Result data doesn't make sense".                |

## 4. Derived Anomaly Flags

When validations fail or anomalies are found, the system triggers the following internal flags:

- `suspicious_user_result`: Tests under 120s flagged with internal cheat properties.
- `highwpm_user_result`: Flags tests > 250 WPM on 15s/60s timespans to a manual review queue.
- `incorrect_result_hash`: Payload does not perfectly match the server's regeneration of `objectHash(result)`.
- `MISSING_KEY_DATA`: Fails when `keySpacingStats` or `keyDurationStats` fail to compute logically.
