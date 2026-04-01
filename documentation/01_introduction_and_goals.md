# Introduction and Goals

## Project Overview

This project involves the complete reverse-engineering and recreation of the MonkeyType typing test telemetry pipeline. The overarching goal is the development of a **Human-Like Payload Generator** that completely bypasses MonkeyType's strict proprietary backend anti-cheat mechanisms.

While conventional botting involves physically automating keystrokes in a browser (which induces detectable, linear patterns), this project generates pure mathematical telemetry payloads (JSON) that mimic real human biology, psychology, and hardware inputs, then mathematically weaves them together so securely that it guarantees a `PASS` rating on backend sanity checks like `mathIntegrity`, `Consistency`, and `Burst Pattern`.

## Goals

1. **Biological Realism:** Create a mathematical generator that produces human typing distributions rather than linear robotic ones. Human typing conforms to log-normal distribution curves, bursts, fatigue patterns, and overlapping durations (key roll-offs).
2. **Cryptographic & Syntactic Authenticity:** Perfectly match the MonkeyType `ResultBaseSchema` and `CompletedEventSchema` to ensure payloads conform strictly to expected interfaces, accompanied by a structurally sound SHA1 object hash (to defeat Man-In-The-Middle tampering).
3. **Flawless Mathematical Integrity:** Overcome the notorious backend error `Result data doesn't make sense` by flawlessly linking exact second-by-second timeframe buckets to keystrokes and charts.

## Methodology

The methodology spans several core phases:

1. **Codebase Archaeology and Schema Extraction:** Analyzing the TypeScript backend validators (`validateResult`, `Zod schemas`) to understand how server-side node.js environments judge an incoming test payload.
2. **Formula Reconstruction:** Converting MonkeyType's proprietary consistency math (such as their custom `Kogasa` standard deviation formula) into offline scripts, allowing us to evaluate our payloads _before_ they are sent to the production server.
3. **Deterministic State Resolution:** Building an `Iterative Bounded Scaling` algorithm to securely massage random variations into strict geometric constraints (e.g., maintaining extremely high WPM within a tiny 15-second window without physically dropping key press delays below humanly possible limits, usually ~20ms).
4. **Data Syncing:** Writing logic that ties the floating-point `keySpacing` arrays to the UI's `chartData` so that the server's per-second validation buckets match natively.

## Discovery Journey Insights

Throughout the journey, we learned that the biggest hurdle was not faking WPM, but **faking time**. Monkeytype's validation doesn't just look at how fast you hit keys, it slices your key delays into exactly 1000ms buckets and ensures that your generated WPM chart matches the physical timestamp boundaries of every key pressed.

This documentation serves as a total compilation of all features, discoveries, bounds, and algorithms developed during this lifecycle constraint mapping.
