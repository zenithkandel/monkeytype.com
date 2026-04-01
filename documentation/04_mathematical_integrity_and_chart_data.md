# Mathematical Integrity and Chart Data Construction

This covers the single hardest constraint within the MonkeyType ecosystem and how we solved it. The notorious backend error: `Result data doesn't make sense`.

## The Validation Paradigm

When a payload reaches the server, the backend takes the `keySpacing` array and iteratively processes it second-by-second. It aggregates those strokes, does the math, and verifies if the resulting array perfectly matches the client's provided `chartData.wpm` and `chartData.burst` arrays.

Initially, generating generic random sets for the `chartData` arrays failed because the literal timing math drifted out of sync. A client submitting a `wpm` array of `[100, 105, 110]` while their keys only physically summed up to `80 WPM` during those seconds triggers an instant ban.

## Converting Timestamps to Absolute Timelines

We created deterministic aggregation loops to solve this. Instead of faking charts, we generate the `keySpacing` array first, and then explicitly run the exact same parsing math the backend uses to organically generate the chart.

1. **Mapping Absolute Times:**
   We expand the `keySpacing` deltas into an `absoluteTimes` array by adding them consecutively to `startToFirstKey`.
   `[ 20ms, 80ms, 40ms ]` -> `[ 20ms, 100ms, 140ms ]`

2. **Bucket Binning (1000ms):**
   We iterate through `seconds = 1 to testDuration`. Using the absolute time map, we count exactly how many key events physically executed before crossing the `second * 1000ms` boundary.

3. **Handling Fractional Seconds (The Deepest Bug):**
   If a user bails out, or limits are reached on a weird boundary (e.g., `testDuration = 30.0`), the final bucket doesn't last a full `1000ms`.
   Raw bursts for that final sliver of a second must be scaled up inversely to compensate.
   `bucketDuration = isLastBucket ? totalTimeSec - (s - 1) : 1`
   `burst = Math.round((keysInBucket / 5) * (60 / bucketDuration))`

## `wpm` vs `rawWpm` in chartData

Another massive discovery involved the distinction between WPM tracks:

- `rawWpm` represents physical keystrokes hit globally (including wrong ones).
- `wpm` on the chart must calculate the **Net WPM** (Only correct key inputs).
  Since our generation algorithm bins absolute total strokes, we must derive `correctRatio = correct_keys / total_keys` and apply it structurally downstream in the chart generator.
- `currentWpm = Math.round(((keysProcessed * correctRatio) / 5) * (60 / wpmElapsed) * 100) / 100`

By enforcing exact final-element synchronization `wpmData[length - 1] == actualWpm` locally, the backend `mathIntegrity` validation now receives purely correlated data flows and successfully marks `Chart Data PASS (100)`.
