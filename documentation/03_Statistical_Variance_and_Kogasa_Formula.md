# Statistical Mathematics & The Kogasa Formula

At the heart of the biological verification system is how Monkeytype calculates the `consistency` matrix.

## 1. Core Variance Analytics

For every keystroke event, the backend analyzes two dynamically generated lists:

- `keySpacing`: An array representing the ms delay _between_ keystrokes (`[80.5, 45.2, 102.1]`).
- `keyDuration`: An array representing how long the switch was physically depressed (`[30.2, 45.1, 70.0]`).

For both arrays, the server invokes:

- **Mean:** `(sum of elements) / length`
- **Standard Deviation (StdDev):** `Math.sqrt( Sum((x - mean)^2) / length )`
- **Coefficient of Variation (COV):** `stdDev / mean`

The COV normalizes data. A 300 WPM typist and a 40 WPM typist will have vastly different raw `StdDev` values. But dividing by the mean scales it universally.

- **Robotic Simulation:** COV = ~ `0.01 - 0.1` (Too uniform).
- **Human Typist:** COV = ~ `0.3 - 0.9` (Biologically scattered).

## 2. Deriving Kogasa

Instead of showing the user a raw COV (which is unintuitive), MonkeyType engineered the `Kogasa` algorithm to convert biological drift into a clean `0% - 100%` accuracy dial.

### The Kogasa Formula

`consistency = 100 * (1 - Math.tanh(cov + Math.pow(cov,3)/3 + Math.pow(cov,5)/5))`

### The Deep Math Breakdown

- The parameter `cov + (cov^3)/3 + (cov^5)/5` represents the first three terms of the Taylor Series expansion for the inverse hyperbolic tangent function `arctanh(x)`.
- By wrapping this expanded sum into the standard Hyperbolic Tangent function `Math.tanh(x)`, they achieve a non-linearly damped sigmoid curve.
- As COV bounds infinitely upward toward chaotic typing, `tanh(x)` approaches 1. Therefore, `1 - 1` approaches `0`% consistency.
- As COV shrinks toward `0` (a robotic perfection script), `tanh(x)` approaches `0`. Therefore, `1 - 0` approaches `100`% consistency.

By generating log-normal variance in our payload generator explicitly designed to output a COV of `0.6`, we deterministically bend the `Kogasa` function into returning a believable biological benchmark of 50-80% consistency.
