# Zod Schemas and Backend Validation Pipeline

When the JSON payload reaches the backend `/api/controllers/result.ts` endpoint, it undergoes intense validation before being pushed to MongoDB.

## 1. Schema Validation (zod)

Monkeytype utilizes `zod` to securely typecast incoming json objects.
The payload must strictly pass `ResultBaseSchema` and `CompletedEventSchema`.

### Strict Property Filtering

`zod` enforces `.strict()`. This means if a payload contains _any_ unknown key (like injecting `debug: true` or attaching `quoteLength` when the `mode` is `time`), `zod` immediately throws a schema resolution error. The backend catches this, returning a `400 Bad Request` or the catch-all error: `Result data doesn't make sense`.

### Schema Constraints

- **charStats:** Must be exactly a tuple of 4 strictly non-negative integers: `[correct, incorrect, extra, missed]`.
- **keyDuration:** Must be an array of non-negative integers, with a length precisely equal to `charTotal`.
- **keySpacing:** Must be an array of non-negative integers, with a length precisely equal to `charTotal - 1`. The discrepancy of 1 is because the first keypress begins logically at `startToFirstKey`, not relative to a previous physical keystroke.

## 2. object-hash (SHA1 Mitigations)

A major bottleneck is the `.hash` property affixed to the payload object.

### The Algorithm:

1. The frontend isolates the `CompletedEvent` object.
2. It completely strips the `.hash` property if it exists.
3. It runs the entire object through `object-hash` (an npm library that deterministically stringifies an object's keys alphanumerically).
4. The string is fed into a `crypto.createHash('sha1')` digest and appended back as `hash: <SHA1_STRING>`.

**Backend Integrity Check:**
When the backend receives the payload, it plucks off the `.hash` parameter, functionally regenerates the hash natively on the server side using the pristine raw JSON, and compares the two hashes. If they do not match perfectly, the server rejects it.
We replicated this locally using Node's native `crypto` module, sorting the `Object.keys()` prior to hashing to mimic `object-hash` without needing external library dependencies natively on offline payload generators.

## 3. Flagging Analytics

If structural validations pass, the backend pushes data to anomaly detectors:

- `suspicious_user_result`: Any user flagged by the database whose test duration is less than or equal to 120s gets appended to an important log.
- `highwpm_user_result`: If `mode == "time"`, `mode2 == 60` or `15`, and WPM > 250, the result is manually sent to an admin-read queue under `addImportantLog()`.
  Passing valid math prevents an _auto-ban_, but reaching 250 WPM will still alert admins to physically check the replay visualizer.
