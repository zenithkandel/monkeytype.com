# Project Genesis and Core Philosophy

This documentation serves as an exhaustive, minute-by-minute breakdown of the technologies, mathematical formulas, constraints, and reverse-engineering logic associated with bypassing the MonkeyType anti-cheat backend.

## 1. The Core Architecture of MonkeyType

MonkeyType operates on a strictly separated frontend (React/Vite) and backend (Node.js/TypeScript/MongoDB/Redis).

- **The Problem:** Traditional "bots" simulate keypresses linearly using tools like Selenium, Puppeteer, or OS-level macro engines (AutoHotkey). These bots wait a static amount of time (e.g., 40ms) with a tiny Gaussian jitter (±5ms) before firing the next key.
- **The Backend Catch:** MonkeyType's backend does _not_ monitor typing in real-time. Instead, tests are entirely client-side. Once the test concludes, an aggregate payload `CompletedEvent` is sent as a single POST request to the `/results` endpoint.

## 2. Why Conventional Bots Fail

Bots that simulate keystrokes fail for two major reasons:

1.  **Hardware Polling & Event Loop Drift:** Simulating a browser event every 20ms often collides with the Node.js or browser JS event loop, resulting in a completely distinct variance pattern compared to a physical keyboard matrix polling over USB.
2.  **Biological Absence:** Humans do not type on a Gaussian curve. They read ahead, buffer words into short-term memory, instantly burst-type familiar n-grams (like "the", "and"), and pause to read the next visual boundary.

## 3. The Objective: Pure Mathematical Payload Synthesis

Rather than writing an optical character recognition (OCR) bot that reads the screen and fakes keystrokes, the goal became generating the final exact POST payload purely via mathematics.
If we can map exactly what statistical features the Node.js backend _validates_ and reverse-engineer the math, we can create a `generator.js` pipeline capable of mathematically deriving a 250 WPM payload within 15 seconds that genuinely "looks" like an olympic human typist.

## 4. The Tech Stack Mapped

- **Language:** Node.js (for the payload generation logic) + Python/Tkinter (for the GUI wrapper).
- **Backend Validation:** `zod` schema resolution.
- **Security Mitigation:** `object-hash` using SHA1 serialization to prevent Man-In-The-Middle parameter tampering.
- **Statistical Math:** Box-Muller Transformation for Normalizing Gaussian arrays, Taylor Expansions for trigonometric COV percentiles, and Iterative Bounded Logic routines for squeezing impossible data structures into fixed physical time thresholds.

This journey covers entirely how those layers were breached.
