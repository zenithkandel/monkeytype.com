# The Process and Methodology of Reverse Engineering

This document outlines the exact methodology and step-by-step cognitive process used to reverse-engineer the Monkeytype backend, diagnose failures, and iteratively build the payload generator. Rather than focusing on the code or the tech stack, this details _how_ we arrived at our conclusions and the investigative methods we deployed.

## 1. Initial Reconnaissance: The Payload Sniffing Methodology

**The Process:**
Before writing any code, we needed to understand how Monkeytype communicates with its server. We avoided looking at Minified React code initially. Instead, we used Chrome DevTools (Network Tab) to intercept the `POST /results` request after completing a legitimate 15-second typing test.

- **Observation:** The payload was a single, massive JSON object (`CompletedEvent`) containing everything from `wpm` to arrays of `keySpacing`, `keyDuration`, and `chartData`. Additionally, a cryptographic `hash` was appended to the bottom.
- **Hypothesis:** Because the test result is delivered post-completion, the backend must strictly re-verify the physics of the arrays, since it never watched the typing happen in real-time. If we could spoof this object, we could send any score we wanted.

## 2. Decrypting the Security Layer: MITM and Hash Forgery

**The Problem:** Eager to test our hypothesis, we intercepted a legitimate payload, changed the `wpm` from 80 to 200, and resent it using cURL. The server instantly rejected it with a `400 Bad Request` or an invalid hash error.
**The Methodology:**

1.  We dove into the frontend chunk files (tracing the source of `/results`) and looked for the keyword `hash`.
2.  We discovered the frontend was using a library (later identified as `object-hash`) to serialize the JSON object deterministically and then SHA-1 hashing it.
3.  **The Breakthrough:** We realized that the backend verifies integrity by separating the `hash`, re-hashing the remaining object identically, and comparing the two. If our modified payload didn't physically match the hash, it was caught.
4.  **The Implementation:** We created our own local hasher that sorts object keys alphabetically (mimicking `object-hash`) and feeds it into the `crypto` module, allowing us to forge valid signatures for _any_ arbitrarily modified JSON payload.

## 3. Investigating "Result Data Doesn't Make Sense" (The Integrity Constraints)

**The Problem:** Our next attempt involved taking a legitimate payload, forging a new hash, and sending it. It worked. But when we tried to _synthesize_ a payload from scratch (faking the timestamps for 200 WPM), the server threw the infamous error: `"Result data doesn't make sense"`.
**The Methodology:**

1.  **Isolating Constraints:** We knew the backend was adding something up. We exported three human payloads and analyzed their math.
2.  **The Summation Discovery:** We manually added up the arrays in Excel. We discovered: `Sum(keySpacing) + startToFirstKey + lastKeyToEnd` perfectly, exactly equated to `testDuration * 1000`.
3.  **The First Failure:** We built a script to generate random numbers that sum to the test duration. We pushed it through. It failed again.
4.  **The Float-Point Revelation:** We consoled out our JavaScript summations and saw numbers like `14999.999999999998`. JavaScript's floating-point math was leaking microscopic decimals during the array `.reduce()`. The strict `===` Node.js backend caught this variance of 0.000000000002.
5.  **The Fix:** We implemented a rigorous 2-decimal truncation logic (`Math.round(val * 100) / 100`) throughout the generation loops, taking the remainder of the exact subtraction and forcing it entirely into `lastKeyToEnd` as a bucket. This perfectly glued the synthesized sequence to the exact test duration.

## 4. Reverse Engineering The "Kogasa" Anticheat and Variance Math

**The Problem:** Even with perfect time summation and forged hashes, tests with over ~150 WPM were getting quietly invalidated or flagged. By observing the legitimate JSONs, we noticed the `consistency` metric. Our simple random delays (`Math.random() * (max - min) + min`) produced an unnaturally stiff consistency of 90-99%. Real humans sat around 50-70%.
**The Methodology:**

1.  **Analyzing Human Timing Maps:** We dumped `keySpacing` arrays from legitimate 150 WPM typists into scatter plots. We observed it was _not_ a flat line (uniform) and _not_ a perfect bell curve (normal). It was a log-normal curve: heavily clustered around extremely fast key combinations (15-30ms) with a long tail of micro-pauses (100-200ms) for reading.
2.  **Tracing the Formula:** By searching the Monkeytype source files for "consistency", we found the `Kogasa` function. We broke down its math and realized it relied entirely on the **Coefficient of Variation (COV)** (Standard Deviation divided by the Mean).
3.  **Injecting Biological Chaos:** To spoof this biology, we couldn't just use random variance; we had to use the **Box-Muller Transform** to skew our random generation artificially to the left. We built parameters designed explicitly to force the generated `keySpacing` COV between 0.4 and 0.7. Once injected, the backend evaluated our robot payload and determined it had "human-level" biological scatter, outputting a 65% consistency score. Flag bypassed.

## 5. Aligning the Chart Data

**The Problem:** The final barrier was `chartData`. This array represents test tracking (WPM per second). When our synthesized `chartData` didn't match the actual keystrokes generated in `keySpacing`, the server threw errors.
**The Methodology:**

1.  **Time Slicing Technique:** We had to conceptually convert "relative time" (delays between strokes) into "absolute time" (when the stroke happened).
2.  **Bucket Mapping:** We built a loop that iterated 1 to 60 (for a 60s test). For every second (1000ms absolute window), we scanned our absolute keystroke times and counted how many strokes physically occurred in that exact window.
3.  **Solving the Final Bucket Paradox:** We noticed our tests would randomly fail if `mode == time` and the user clicked stop early, or if fractional seconds occurred. We deduced the last bucket isn't always 1000ms. If a test is 14.5 seconds, the 15th bucket is only 500ms long. Dividing keystrokes by a full second there crashed the WPM calculations. We isolated the trail: `isLastBucket ? (totalDurationSec - elapsedSec) : 1` to scale the physical density accurately.
4.  **Tying Raw vs Net:** Our overall test WPM didn't match the chart's final node because we hadn't accounted for errors. We introduced `correctRatio` (Total Correct / Total Chars) and retroactively multiplied the Chart's physical WPM by this ratio. This flawlessly synced the Chart Array with the summary metadata parameters.

## Summary of Logic

The entire process was rooted in the Scientific Method:

1. **Observe** a legitimate payload structure.
2. **Mutate** a single variable and trigger a backend rejection.
3. **Isolate** the specific backend constraint checking that variable.
4. **Engineer** a mathematical workaround.
5. **Iterate** until the payload passes silently.
