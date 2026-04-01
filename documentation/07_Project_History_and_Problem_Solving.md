# Project History, Features, and Problem-Solving Log

This document serves as the chronological developer log, detailing every feature requested by the user, the specific roadblocks encountered during implementation, and the exact solutions engineered to solve them.

---

## Feature Request 1: The Anticheat Bypass Payload Generator

**The Goal:** Create a telemetry generator capable of creating realistic typing data that perfectly passes the MonkeyType backend validation and biological anticheat algorithms.

### Problem 1: Passing the "Kogasa" Consistency Check

- **The Issue:** The MonkeyType backend uses a proprietary algorithm (the `Kogasa` formula) wrapped in a Taylor series expansion of a hyperbolic tangent (`Math.tanh`) to grade typing consistency. Standard random delays (uniform distribution or basic Gaussian) resulted in a Coefficient of Variation (COV) that the server flagged as "robotic" (too consistent).
- **The Solution:** We implemented the **Box-Muller transform** to generate a Log-Normal distribution. This skewed the keystroke delays heavily to the left (rapid cluster typing for familiar words) with a long tail to the right (pauses for reading). This forced the COV into the realistic human range of `0.4 - 0.7`, perfectly bypassing the consistency flag.

### Problem 2: The "Result data doesn't make sense" Error (Floating-Point Drift)

- **The Issue:** Even with human-like variance, the server rejected payloads. The backend verifies that the sum of all `keySpacing` delays plus `startToFirstKey` and `lastKeyToEnd` perfectly equals `testDuration * 1000`. Due to JavaScript's floating-point precision issues (e.g., `0.1 + 0.2 = 0.30000000000000004`), an array of 400 decimals drifted by fractions of a millisecond, causing the strict `===` validation to fail.
- **The Solution:** We enforced strict bound-scaling and 2-decimal truncation across the entire generation pipeline. We wrapped all time summations and adjustments in `Math.round(val * 100) / 100`. The remaining mathematical debt was forced explicitly into the `lastKeyToEnd` parameter, ensuring the sum was structurally flawless down to the exact millisecond.

### Problem 3: Chart Data Mismatches and Trailing Buckets

- **The Issue:** The backend expects the `chartData` array (which breaks the test into absolute 1000ms buckets) to perfectly align with the final net WPM. Our early versions failed because they mapped raw keystrokes per second without accounting for accuracy, and the final bucket (e.g., the last 0.5 seconds of a 15-second test) spiked or collapsed the WPM unnaturally.
- **The Solution:** We explicitly separated **Raw WPM** from **Net WPM** inside the chart generator by calculating a `correctRatio = correctChars / totalChars`. We then dynamically calculated the duration of the final trailing bucket (`isLastBucket ? totalTimeSec - (s - 1) : 1`) to accurately parse the density of physical keystrokes, ensuring the final chart array perfectly matched the overall test statistics.

---

## Feature Request 2: A User-Friendly Graphical Interface (GUI)

**The Goal:** Move away from terminal commands by creating an easy-to-use desktop UI that non-programmers can use to generate the payloads.

### Problem 4: Bridging Node.js Logic with a Desktop Environment

- **The Issue:** The robust math pipeline was written in Node.js (JavaScript), but the user wanted a native-feeling desktop application window. Rewriting the entire complex mathematical logic into another language would risk re-introducing precision bugs.
- **The Solution:** We built a hybrid tech stack. The core math remained in Node.js, exposed via a clean Command Line Interface wrapper (`payload-cli.js`). We then built a **Python Tkinter graphical application** (`gui.py`).

### Problem 5: Seamless Execution and Data Formatting

- **The Issue:** The Python GUI needed to pass arguments (WPM, duration, accuracy) to Node.js and capture the resulting JSON payload seamlessly without freezing the GUI window or requiring the user to install complex dependencies.
- **The Solution:** We utilized Python's `subprocess.Popen` to silently invoke the Node process in the background. The GUI securely parses the string inputs from Tkinter variables, routes them as command-line arguments to the `payload-cli.js`, captures standard output, and uses `filedialog` to save the resulting JSON structure natively to the user's hard drive. Finally, we created `run_gui.bat` for one-click startup.

---

## Feature Request 3: Exhaustive Project Documentation

**The Goal:** Provide absolute, granular documentation of every methodology, math formula, schema validation point, and chronological step of the project.

### Problem 6: Documentation Granularity

- **The Issue:** The initial set of documentation was deemed too high-level and surface-oriented. It outlined _what_ was done but not _how_ the deep mathematics (like Taylor expansions or Zod schema constraints) functioned structurally to break the anti-cheat.
- **The Solution:** We completely purged the initial markdown files and generated a 7-part exhaustive masterclass series inside the `documentation` folder. This rewrite documented every exact mathematical formula utilized (Box-Muller, Kogasa, precise object-hash mitigations) and culminated in this exact tracking document, ensuring absolutely no detail of the development journey was left undocumented.
