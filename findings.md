# Monkeytype Result Submission Findings

Date analyzed: 2026-03-31
Scope: One captured typing result payload, preflight OPTIONS request headers, and POST /results request-response headers.

## 1. Executive Summary

The captured submission is consistent with the client flow found in source code:

- Endpoint used: https://api.monkeytype.com/results
- CORS preflight succeeds with 204 and allows authorization, content-type, x-client-version.
- Main request uses POST with JSON payload containing a top-level result object.
- Authentication is Firebase JWT via Authorization: Bearer <token>.
- Version pinning is enforced by x-client-version request header and x-compatibility-check response header.
- Payload values are internally coherent for a 15-second timed test.

## 2. Transport Workflow (Network Layer)

### 2.1 Preflight OPTIONS (Browser CORS handshake)

| Item                           | Observed value                              | Meaning                                                  |
| ------------------------------ | ------------------------------------------- | -------------------------------------------------------- |
| URL                            | https://api.monkeytype.com/results          | Target endpoint for result upload                        |
| Method                         | OPTIONS                                     | CORS preflight probe                                     |
| Status                         | 204                                         | Preflight accepted                                       |
| Access-Control-Allow-Headers   | authorization,content-type,x-client-version | Browser may send these custom/credential headers on POST |
| Access-Control-Allow-Methods   | GET,HEAD,PUT,PATCH,POST,DELETE              | POST is allowed                                          |
| Access-Control-Allow-Origin    | \*                                          | Cross-origin allowed                                     |
| Access-Control-Expose-Headers  | X-Compatibility-Check                       | Browser JS can read compatibility header                 |
| Origin                         | https://monkeytype.com                      | Web app origin                                           |
| Access-Control-Request-Method  | POST                                        | Intended actual method                                   |
| Access-Control-Request-Headers | authorization,content-type,x-client-version | Intended non-simple headers                              |

Conclusion: Preflight confirms exactly the headers the app code sets in the API adapter.

### 2.2 POST /results (Actual submission)

| Item                                  | Observed value                     | Meaning                                     |
| ------------------------------------- | ---------------------------------- | ------------------------------------------- |
| URL                                   | https://api.monkeytype.com/results | Result ingestion endpoint                   |
| Method                                | POST                               | Create result record                        |
| Status                                | 200                                | Server accepted and processed payload       |
| Content-Type (request)                | application/json                   | JSON body                                   |
| Accept (request)                      | application/json                   | Client expects JSON response                |
| Authorization                         | Bearer JWT                         | User-authenticated write                    |
| x-client-version                      | 2026.03.30_22.12_82bf09564         | Build/version compatibility marker          |
| Origin                                | https://monkeytype.com             | Browser origin context                      |
| Response header x-compatibility-check | 4                                  | Server-client protocol compatibility number |
| Rate limit headers                    | limit=300, remaining=299           | Request counted in API quota                |

Note: The full bearer token should be treated as a credential and redacted in logs/reports.

## 3. Payload Dissection (result object)

### 3.1 Core performance metrics

| Field        | Value          | Interpretation                                   |
| ------------ | -------------- | ------------------------------------------------ |
| wpm          | 96.04          | Net typing speed                                 |
| rawWpm       | 96.04          | Raw speed equals net speed (near-zero penalties) |
| acc          | 99.17          | Very high accuracy                               |
| charStats    | [120, 0, 0, 0] | Correct=120, incorrect=0, extra=0, missed=0      |
| charTotal    | 120            | Total characters counted                         |
| testDuration | 14.99          | Effectively 15-second run                        |
| afkDuration  | 0              | No AFK intervals recorded                        |

### 3.2 Mode and config context

| Field        | Value   | Interpretation                    |
| ------------ | ------- | --------------------------------- |
| mode         | time    | Timed test mode                   |
| mode2        | 15      | 15-second preset                  |
| difficulty   | normal  | Standard validation profile       |
| language     | english | Active word list/language         |
| punctuation  | false   | Punctuation disabled              |
| numbers      | false   | Numbers disabled                  |
| lazyMode     | false   | Standard input handling           |
| blindMode    | false   | Blind mode disabled               |
| funbox       | []      | No gameplay modifiers             |
| stopOnLetter | false   | Not in stop-on-error(letter) mode |

### 3.3 Timing/biometric-style keystroke telemetry

| Field           | Value pattern                     | Interpretation                             |
| --------------- | --------------------------------- | ------------------------------------------ |
| keySpacing      | Array of inter-key intervals (ms) | Flight times between consecutive keydowns  |
| keyDuration     | Array of key hold times (ms)      | Dwell times per key                        |
| keyOverlap      | 4579.1 ms                         | Total time with >1 key held simultaneously |
| startToFirstKey | 0                                 | First key immediately after test start     |
| lastKeyToEnd    | 0                                 | Last key aligned with test end             |
| keyConsistency  | 53.47                             | Stability of inter-key rhythm              |

Observation: keyDuration includes many long dwell values and one non-integer tail value (140.32), consistent with forced keyup averaging behavior in client code when a key remains down at test end.

### 3.4 Per-second chart streams

| Field           | Value     | Interpretation                                            |
| --------------- | --------- | --------------------------------------------------------- |
| chartData.wpm   | 15 values | 1 bucket per second for 15s test                          |
| chartData.burst | 15 values | Raw/burst speed stream                                    |
| chartData.err   | 15 values | Error counts per second (single error spike at second 7)  |
| wpmConsistency  | 92.43     | Consistency from wpm history dispersion                   |
| consistency     | 86.07     | Consistency metric derived from raw-per-second dispersion |

## 4. Coherency Checks

### 4.1 WPM vs charTotal sanity check

Expected characters from WPM formula:

expectedChars = wpm _ 5 _ (testDuration / 60)

Substitute values:

expectedChars = 96.04 _ 5 _ (14.99 / 60) = about 119.95

This matches charTotal=120 after rounding, so speed and character totals are coherent.

### 4.2 Accuracy vs charStats check

charStats indicates 120 correct and zero incorrect/extra/missed.
This would normally imply 100% character accuracy.
Observed acc is 99.17, which can happen when accuracy accounting includes transient wrong keystrokes that were corrected during typing (tracked separately in live input accuracy counters), while final charStats reflects final aligned text outcome.

### 4.3 Time-series bucket check

mode2=15 and chart arrays have 15 elements, matching expected per-second aggregation behavior.

## 5. Security and Protocol Findings

| Area           | Finding                                       | Risk/impact                                                       |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Auth           | JWT bearer token is sent on each result POST  | If exposed, attacker can impersonate user until token expiry      |
| CORS           | Allow-Origin is \* while auth header is used  | Typical for token-based APIs; still requires strong token secrecy |
| Version gating | x-client-version + x-compatibility-check used | Protects server/client schema drift                               |
| Integrity      | result.hash present in payload                | Helps detect tampering/inconsistent client payloads               |
| Rate limiting  | x-ratelimit-\* returned                       | Controls abusive submission volume                                |

Operational recommendation: never share raw Authorization header values in screenshots/log exports.

## 6. Mapping to Source-Code Mechanism

The captured request aligns with source implementation behavior:

- Client builds a CompletedEvent-like result object at test finish.
- If payload is too large (testDuration > 122), key arrays/chart data are replaced with toolong markers; your test is 14.99s so full arrays are sent.
- Client computes hash over result object and includes hash before POST.
- Request is sent through API adapter that adds:
  - Authorization: Bearer <Firebase ID token> when logged in
  - Accept: application/json
  - x-client-version: <build version>
- Browser performs OPTIONS preflight because Authorization and custom headers are present.

## 7. Final Interpretation of This Specific Sample

- This sample appears valid and server-accepted.
- It represents a high-accuracy 15-second run with stable pace and very low error pressure.
- Telemetry depth is high: behavioral typing dynamics are transmitted (spacing, duration, overlap) in addition to basic score.
- Request/response headers confirm production API path with compatibility and rate-limit control.

## 8. Redaction Notes

Sensitive elements detected in provided capture:

- Full bearer JWT token (credential)
- User identifying claims embedded in JWT payload (name, email, uid)

These should be redacted before sharing publicly.
