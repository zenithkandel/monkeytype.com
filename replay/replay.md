# Replay Guide for POST /results

Date: 2026-03-31
Scope: How to replay a result submission request in a legitimate, test-oriented way.

## Important Boundaries

Use this only for your own account and authorized testing. Do not fabricate or tamper with typing telemetry to bypass anti-cheat/validation systems.

## 1. Short Answers to Your Questions

### 1.1 What must be true for server acceptance and recording?

For a successful record insert under your account, you need all of the following:

1. Valid Firebase ID token for your account in Authorization header.
2. Correct request shape: POST https://api.monkeytype.com/results with JSON body {"result": {...}}.
3. A schema-valid result object (field names/types/limits must match server schema).
4. A valid hash value in result.hash (client computes hash from the result object before send).
5. Data that passes server-side validation and anti-abuse checks (duplicate detection, key data validity, etc.).

### 1.2 Is preflight necessary if you use your own backend?

- Browser to api.monkeytype.com: preflight is expected/normal because custom headers are sent (Authorization, x-client-version, content-type application/json).
- Your backend to api.monkeytype.com (server-to-server): CORS preflight is not involved. CORS is a browser policy, not a server-to-server requirement.

So, if replaying from your own backend, OPTIONS preflight is not required.

### 1.3 Which parameters are typing data vs authentication data?

Authentication/identity is carried in headers, not in typing metrics.

- Auth parameters:
  - Authorization: Bearer <firebase_id_token>
  - x-client-version: build/client version marker (compatibility, not user identity)
- Typing data parameters:
  - Most fields in body.result (wpm/rawWpm/charStats/keySpacing/keyDuration/chartData/etc.)

## 2. Request Anatomy

## 2.1 Endpoint and method

- Method: POST
- URL: https://api.monkeytype.com/results

## 2.2 Required/expected request headers

| Header                           | Purpose                                   | Auth-related?         |
| -------------------------------- | ----------------------------------------- | --------------------- |
| Authorization: Bearer <token>    | User authentication via Firebase ID token | Yes                   |
| Content-Type: application/json   | JSON body parsing                         | No                    |
| Accept: application/json         | Response media type                       | No                    |
| x-client-version: <client build> | Client/server compatibility signaling     | Indirectly (protocol) |

Observed server response also returns x-compatibility-check to indicate protocol compatibility.

## 2.3 Body shape

Top-level body is:

```json
{
  "result": {
    "...": "CompletedEvent fields",
    "hash": "<object hash>"
  }
}
```

## 3. Field Classification (Typing vs Auth vs Meta)

### 3.1 Typing telemetry and performance fields

These represent the actual typing behavior and outcome:

- wpm
- rawWpm
- acc
- charStats
- charTotal
- keySpacing
- keyDuration
- keyOverlap
- consistency
- wpmConsistency
- keyConsistency
- chartData.wpm
- chartData.burst
- chartData.err
- testDuration
- afkDuration
- startToFirstKey
- lastKeyToEnd
- incompleteTests
- incompleteTestSeconds
- restartCount
- bailedOut

### 3.2 Test configuration/context fields

These describe test conditions:

- mode
- mode2
- punctuation
- numbers
- lazyMode
- blindMode
- difficulty
- language
- funbox
- stopOnLetter
- customText (custom mode only)
- quoteLength (quote mode only)
- tags

### 3.3 Identity/auth/integrity fields

- Authorization header: identity + auth
- result.uid: user id field in payload context (server still authenticates from token)
- result.hash: payload integrity check field
- timestamp: event time metadata

## 4. What Usually Causes Rejection

Known non-200 result statuses include:

- 460: test too short
- 461: result hash invalid
- 462: result spacing invalid
- 463: result data invalid
- 464: missing key data
- 465: bot detected
- 466: duplicate result

Operationally, this means "well-formed JSON" is not enough; telemetry must also pass behavioral and integrity checks.

## 5. Replay From Your Own Backend (Legitimate Pattern)

Because this is server-to-server, do this flow:

1. Obtain a fresh Firebase ID token for your signed-in user.
2. Build the same JSON shape used by the web app: {"result": {...}}.
3. Ensure result.hash is recomputed after final payload assembly.
4. Send POST with Authorization + x-client-version + JSON headers.
5. Log status/body and handle non-200 codes explicitly.

Minimal pseudo-request:

```http
POST /results HTTP/1.1
Host: api.monkeytype.com
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
Accept: application/json
x-client-version: <current_client_version>

{"result": { ...full result object..., "hash": "..." }}
```

## 6. Practical Safety Checklist Before Sending

- Token is for your own account and unexpired.
- x-client-version matches an active client build format.
- mode/mode2/duration/arrays are internally consistent.
- keySpacing/keyDuration are present unless server-allowed special case applies.
- Hash computed from the exact final object bytes/object structure your hash routine expects.
- No credentials are logged in plaintext.

## 7. Notes on Preflight vs Backend Replay

- If you replay from browser JavaScript in a different origin context, browser may preflight automatically.
- If you replay from your own backend service, no browser CORS preflight occurs.
- Preflight success does not authenticate you; Authorization token does.

## 8. Response You Should Expect on Success

HTTP 200 JSON body data typically includes:

- insertedId
- isPb
- tagPbs
- xp
- xpBreakdown
- streak
- optional leaderboard ranks

This indicates persistence succeeded and the result should appear in your records/history.

## 9. Security Reminder

Never share or commit:

- Raw bearer tokens
- Full JWT payloads containing personal data
- Unredacted network captures with Authorization headers

## 10. Hash Internals (Where, How, and What)

### 10.1 Where hash is generated in client flow

Hash generation happens in the test logic before sending to /results:

- In normal save flow: src/ts/test/test-logic.ts, inside saveResult(...)
  - delete result.hash
  - result.hash = objectHash(result)
- In signed-out-later-sync flow: src/ts/test/test-logic.ts, setNotSignedInUidAndHash(uid)
  - sets result.uid first
  - deletes old hash
  - recalculates hash with objectHash(...)

Implication: hash is always computed on the final object state right before transmission.

### 10.2 Which algorithm is used

The client imports object-hash and calls it with no custom options.

- Library: object-hash@3.0.0
- Default algorithm: sha1
- Default output encoding: hex

So result.hash is a SHA-1 hex digest generated by object-hash canonical object serialization.

### 10.3 What data is hashed

The input to hashing is the full result object at the time of hashing, except hash itself is removed first.

That means:

- Included: all present result fields (typing telemetry + config + metadata)
  - example groups: wpm/rawWpm/acc/charStats, keySpacing/keyDuration/keyOverlap, chartData, mode/mode2/language/difficulty, timestamp, flags, etc.
- Included conditionally:
  - uid is included when setNotSignedInUidAndHash(uid) runs.
  - customText exists only in custom mode.
  - quoteLength exists only in quote mode.
- Excluded:
  - hash (explicitly deleted before recompute)

Also note: for very long tests (testDuration > 122), client may replace chartData/keySpacing/keyDuration with "toolong" before hashing and send.

### 10.4 Plaintext format being hashed (important)

It is not a raw JSON string hash.

object-hash first serializes the object into an internal canonical token stream (type-prefixed text), then hashes that stream.

From object-hash defaults visible in runtime code:

- respectType = true
- unorderedObjects = true (object keys sorted)
- unorderedArrays = false (array order preserved)
- unorderedSets = true

So two JSON objects with same values but different key order generally hash the same, while array order differences change hash.

### 10.5 Example of the plaintext token stream

Using object-hash passthrough mode on {"b":"x","a":1}:

- SHA-1 hash:
  - d7bbdf6c18050e874f6ab127ef2722370937fc0a
- Internal plaintext stream before hashing:
  - object:5:string:9:prototype:Undefined,string:9:**proto**:object:3:string:9:prototype:Undefined,string:9:**proto**:Null,string:11:constructor:fn:string:8:[native]string:20:function-name:Objectobject:0:,,string:11:constructor:fn:string:8:[native]string:20:function-name:Objectstring:12:[CIRCULAR:2],string:1:a:number:1,string:1:b:string:1:x,

This demonstrates why replay hash generation must use the same library behavior, not JSON.stringify(...).

### 10.6 Replay correctness checklist for hash

Before sending:

1. Finalize every result field first.
2. Remove hash field.
3. Compute hash using object-hash default call (no option overrides).
4. Set result.hash to that output.
5. Do not mutate result afterward.

If any field changes after hash generation, hash validation can fail (status 461).
