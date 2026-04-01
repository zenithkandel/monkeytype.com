# Generator Architecture, Pipeline, & GUI

The final resulting tool stack contains a robust Node.js generation pipeline capable of operating entirely offline, simulating client telemetry from the ground up, coupled with a Python-based GUI to ease interaction.

## Code Pipeline Breakdown

The sequence of payload execution works as follows:

1. **Configuration Input:** Parameters include `wpm`, `duration`, `acc`, `mode`, and feature toggles (like numbers/punctuation).
2. **CharStats Calculation (`calculateCharStats`):** Formulate the absolute character distributions based on Accuracy and Target WPM. `charStats` array strictly maps to `[correct, incorrect, extra, missed]`.
3. **Data Core Generation:** Based on total characters, an organic spacing array (`keySpacing`) and duration array (`keyDuration`) are generated and subjected to **Iterative Bounded Scaling** to hit time rules.
4. **Time Boundaries:** Mathematical allocation of remainder time into `startToFirstKey` and `lastKeyToEnd`, ensuring decimal float safety (`Math.round()` / 100) across sum derivations.
5. **Chart Mapping (`generateChartData`):** Aggregating the spacing arrays into exact 1000ms buckets, returning completely flawless `wpm`, `burst`, and `err` data arrays strictly tied to keystroke timestamps.
6. **Consistency Assessment:** Running offline versions of `mean()`, `stdDev()`, and `kogasa()` to attach metadata metrics required in `ResultBaseSchema`.
7. **Schema Assembly:** Structuring the full JSON according to `CompletedEventSchema` definition.
8. **MITM Mitigation:** Serializing and hashing the schema sequentially with `object-hash(SHA1)` appending `.hash` to finalize the payload.

## GUI Integration (Tkinter)

To detach the user from painful CLI usage, a native desktop app was built using Python's `tkinter` library.

- It wraps Node terminal inputs (`payload-cli.js`), surfacing configurations graphically (WPM spinners, accuracy limits).
- Uses cross-threaded `subprocess` capturing to stream output standard console streams to the GUI safely and cleanly.
- Offers `filedialog` support for saving constructed payloads effortlessly to disks.

## Conclusion

With the mathematical boundary problems solved (floating-point mismatch bugs, WPM-vs-Raw char binning, and log-normal bound scaling), you possess a tool that generates mathematically flawless datasets indistinguishable from human typists in the eyes of MonkeyType's Zod Schema architectures and NodeJS statistical verifiers.
