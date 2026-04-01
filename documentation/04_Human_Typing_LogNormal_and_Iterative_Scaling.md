# Human Log-Normal Structures and Iterative Bounds

Generating random delays that look "human" relies wholly on simulating human visual and physical latency limits rather than just `Math.random()`.

## 1. Box-Muller transformation to Log-Normal

Calling `Math.random()` provides a perfectly flat, uniform distribution between 0 and 1.

To mimic the delay spectrum of a human reading sentences, we needed a right-skewed curve: a rapid cluster of ultra-fast n-grams mapping toward the left, trickling slowly to long pauses on the right.
We achieved this by dynamically wrapping `Math.random()` in the **Box-Muller Formula**:

```javascript
let u1 = 1 - Math.random();
let u2 = Math.random();
let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
let normalDist = mean + stdDev * z0;
let logNormal = Math.exp(normalDist);
```

This forces the arrays of spacing matrices into a biological curve pattern.

## 2. Key Overlaps (N-Key Rollovers)

When typists type fast, Key 'B' is depressed before Key 'A' has released physically. The generator fakes this overlap conditionally.

```javascript
const potentialOverlap = Math.max(0, duration[i] - spacing[i]);
```

If the holding duration exceeds the gap between the next press, the system incrementally stores physical bio-metric overlap stats verifying 10-finger rolling combinations commonly found on mechanical hardware switches.

## 3. Iterative Bounded Scaling (The Safety Valve)

When parameters hit extreme ranges (e.g. 250 WPM on a 15s test), scaling standard Gaussian constraints forces values into the negatives or zeroes—physically impossible since switches poll around 1000Hz (1ms gap minimum, functionally humans bottom at 20ms).

We built a massive while-loop architecture (the bounds scaler):

1. **Target Derivation**: Generate the exact total characters needed.
2. **First Pass**: Allocate base log-normal delays across `charTotal`.
3. **Validation**: Check if the array sums to EXACTLY `testDuration * 1000`.
4. **Nudging**: If the sum is lacking, proportionately scale all numbers up.
5. **Bounding**: Any number that visually dips below `<20ms` is crushed back into `<20ms` constraints, and the deficient sum mathematical debt is recursively scattered among higher pause clusters.
6. **Iteration Phase**: We yield up to 5,000 recursive execution loops. It bends the mathematical matrix safely into physical limits while precisely adhering to statistical norms before returning the array vectors.
