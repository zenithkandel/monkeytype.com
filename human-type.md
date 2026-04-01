🧠 1. What “Human Typing” Actually Looks Like (Behaviorally)

When people think of typing, they imagine speed. Anti-cheat systems care about structure, not just speed.

Human typing is governed by three major layers:

A. Cognitive Layer (thinking)
Reading ahead
Planning next word
Processing unfamiliar words
Handling punctuation/numbers

👉 Causes:

pauses before hard words
uneven rhythm
B. Motor Layer (finger movement)
Finger travel distance
dominant hand bias
keyboard layout familiarity

👉 Causes:

certain keys slower (e.g. p, q)
asymmetry between left/right hand
C. Neuromuscular Noise
tiny inconsistencies in movement
fatigue
micro-delays

👉 Causes:

randomness in timing
non-uniform spacing
⏱️ 2. Key Timing Signals (What Systems Analyze)
2.1 Inter-Key Delay (Key Spacing)

This is:

time between consecutive key presses

Human pattern:

Not constant
Roughly clustered around a mean
Has long tail outliers

Typical structure:

Region Meaning
40–80 ms fast bursts
80–150 ms normal typing
150–400 ms thinking pauses
400+ ms hesitation / word boundary

👉 Important:
Humans are not Gaussian—they are skewed + bursty

2.2 Key Hold Duration
keydown → keyup

Human traits:

shorter for fast typists (~40–80 ms)
longer for beginners (~80–150 ms)
varies per key

👉 Example:

vowels → shorter
symbols → longer
2.3 Overlap (Multi-key Pressing)

Fast typists:

press next key before releasing previous
creates overlap

Slow typists:

almost no overlap

👉 This produces:

negative gaps
stacked timing
📊 3. Statistical Properties of Human Typing

This is where anti-cheat systems focus.

3.1 Distribution Shape (CRITICAL)

Human key spacing is:

not uniform
not perfectly random
not perfectly normal

It’s usually:

log-normal or gamma-like

Meaning:

many small values
few large spikes
3.2 Coefficient of Variation (σ / μ)

This is huge.

Humans:

CV ≈ 0.3 – 0.8

Bots:

CV ≈ 0.01 – 0.1 (too consistent ❌)

👉 Low variance = suspicious

3.3 Temporal Drift

Humans slow down and speed up:

start fast
stabilize
fatigue near end

👉 WPM is not flat.

3.4 Burst Behavior

Typing happens in chunks:

fast → pause → fast → pause

Not:

steady steady steady ❌
🧩 4. Higher-Level Patterns
4.1 Word Boundary Effects

Humans pause more at:

spaces
punctuation
long words

👉 spacing spikes at:

"hello| world"
↑ pause here
4.2 Error Patterns

Humans:

cluster errors
correct mid-word
sometimes skip corrections

👉 errors are NOT evenly distributed

4.3 Fatigue Curve

Over time:

speed slightly drops
variance increases
4.4 Learning / Adaptation

Within a single test:

unfamiliar words slow you down
repeated patterns speed you up
🧠 5. Why Synthetic Data Usually Fails

Even smart attempts fail because they miss:

❌ 5.1 Too Perfect Timing
80ms, 82ms, 79ms, 81ms...

👉 Humans don’t do this.

❌ 5.2 Wrong Distribution

Uniform:

random(60–100)

👉 looks fake

❌ 5.3 No Long Pauses

Humans always have:

occasional 200–400 ms gaps
❌ 5.4 No Correlation

Real typing:

spacing correlates with difficulty

Fake:

independent randomness
❌ 5.5 Flat Speed Graph

Real:

wavy graph

Fake:

straight line
📈 6. What Real Anti-Cheat Likely Checks

Based on your doc, systems like this usually check:

6.1 Plausibility Checks
WPM vs spacing consistency
duration vs overlap consistency
6.2 Statistical Checks
mean
std deviation
CV
6.3 Shape Checks
histogram shape
skewness
kurtosis
6.4 Behavioral Checks
pauses at word boundaries
realistic burst patterns
6.5 Cross-Field Consistency

Everything must align:

wpm
keySpacing
chartData
duration
🔬 7. How Researchers Model Human Input (Safe Context)

In legitimate fields (HCI, biometrics, accessibility), people model typing using:

7.1 Probabilistic Models
log-normal distributions
mixture models
7.2 Markov Chains

Next delay depends on:

previous delay
key type
7.3 Keystroke Dynamics

Used for:

identity verification
behavioral biometrics
7.4 Time Series Modeling
autocorrelation
temporal dependency
🧠 8. The Big Idea

Human typing is:

structured randomness with memory

Not:

pure random ❌
perfectly consistent ❌
⚖️ Final Takeaway

If you strip everything down, systems are asking:

“Does this data behave like something produced by a human nervous system interacting with a keyboard over time?”

That includes:

noise
inconsistency
pauses
adaptation
imperfection
