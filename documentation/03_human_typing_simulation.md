# Human Typing Simulation

Bots and macros normally fail because they type linearly (e.g., waiting exactly `45ms` between every keystroke with a tiny random variation `±5ms`). Humans type completely differently: they read ahead, cache a word in memory, burst type it rapidly, pause for a fraction of a second to read the next text boundary, and repeat.

## 1. Log-normal Distribution

Human keystrokes follow a **log-normal distribution** curve, not a uniform or Gaussian one. A log-normal distribution is heavily right-skewed: most delays are packed around an average short burst speed, but there's a long tail of sparse, much longer pauses (representing reading or thinking).

We implemented the `normalRandom()` Box-Muller method combined with `Math.exp()` to artificially build log-normal delays that map directly to real human standard deviations.

## 2. Burst and Fatigue Mapping

Typists don't maintain a consistent rhythm over 60 seconds. Our mathematical model simulates:

- **Bursts:** Simulating word-level "roll-offs", where consecutive strokes in familiar letter patterns happen almost instantly (e.g., typing 'i' right after hitting 't' in "the").
- **Fatigue:** The algorithm slowly expands the mean spacing and standard deviation logarithmically as the `testDuration` increases, mimicking physical finger fatigue.

## 3. Key Roll-off (Overlaps)

Humans don't lift their finger fully before pressing the next key. This generates overlap.

- `keyOverlap`: Calculated dynamically when the duration of Key A exceeds the spacing gap to Key B. `potentialOverlap = Math.max(0, duration[i] - spacing[i])`. This physical hardware phenomenon acts as bio-metric proof of a 10-finger typing style versus a linear 1-finger robotic macro script.

## 4. Iterative Bounded Scaling

To simulate 200+ WPM on short tests (e.g., 15 seconds), standard algorithm scaling often creates mathematically impossible delays (like spacing dropping to negative numbers, jumping backward in time, or hitting `0ms`, which implies hitting multiple keys at the strict hardware polling limit).

**The Solution:**
We implemented an **Iterative Bounded Scaler**. It generates the initial log-normal array, checks physical limits (`< 20ms`), and runs it through an intensive loop (up to `5000` attempts) gently nudging values away from physical constraints while mathematically balancing the remaining sum to maintain the fixed `testSum == duration * 1000` boundary. This guarantees high WPM payloads without mathematically violating biological polling bounds.
