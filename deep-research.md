# Monkeytype Test Result System: Complete Technical Deep-Dive

## Executive Summary

This document provides an exhaustive technical analysis of the Monkeytype typing test result system, covering the complete lifecycle from test creation through database storage. The system employs a multi-layered security architecture including cryptographic hashing, behavioral analysis, rate limiting, and statistical validation to ensure data integrity and prevent cheating.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Test Configuration & Creation](#2-test-configuration--creation)
3. [Test Execution & State Management](#3-test-execution--state-management)
4. [Statistics & Metrics Calculation](#4-statistics--metrics-calculation)
5. [Result Object Generation](#5-result-object-generation)
6. [Hash Generation & Anti-Cheat (Client-Side)](#6-hash-generation--anti-cheat-client-side)
7. [API Communication & Contracts](#7-api-communication--contracts)
8. [Backend Result Processing](#8-backend-result-processing)
9. [Anti-Cheat System (Server-Side)](#9-anti-cheat-system-server-side)
10. [Database Storage](#10-database-storage)
11. [Error Handling & Status Codes](#11-error-handling--status-codes)
12. [Rate Limiting](#12-rate-limiting)
13. [XP & Leaderboard Systems](#13-xp--leaderboard-systems)
14. [Data Type Constraints](#14-data-type-constraints)
15. [Security Architecture Summary](#15-security-architecture-summary)

---

## 1. Technology Stack

### Frontend

| Component        | Technology                                         | Version |
| ---------------- | -------------------------------------------------- | ------- |
| Framework        | Vite + SolidJS (partial migration from vanilla JS) | -       |
| Language         | TypeScript                                         | -       |
| Hash Generation  | `object-hash`                                      | 3.0.0   |
| HTTP Client      | Custom `Ape` wrapper over fetch                    | -       |
| State Management | Module-level exports + Stores                      | -       |

### Backend

| Component          | Technology                                     | Version |
| ------------------ | ---------------------------------------------- | ------- |
| Framework          | Express.js                                     | -       |
| Language           | TypeScript                                     | -       |
| Database           | MongoDB                                        | -       |
| Cache/Leaderboards | Redis                                          | -       |
| API Contracts      | ts-rest                                        | -       |
| Schema Validation  | Zod                                            | -       |
| Hash Verification  | `object-hash`                                  | 3.0.0   |
| User Agent Parsing | `ua-parser-js`                                 | -       |
| Rate Limiting      | `express-rate-limit` + `rate-limiter-flexible` | -       |

### Shared Packages

| Package                 | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| `@monkeytype/schemas`   | Zod schemas for results, configs, users     |
| `@monkeytype/contracts` | ts-rest API contract definitions            |
| `@monkeytype/funbox`    | Funbox definitions and compatibility checks |
| `@monkeytype/util`      | Utility functions (numbers, dates, etc.)    |

---

## 2. Test Configuration & Creation

### Configuration Storage

**File:** `frontend/src/ts/config/store.ts`

Test configuration is stored in a reactive store and includes:

```typescript
interface Config {
  // Core Test Parameters
  mode: "time" | "words" | "quote" | "zen" | "custom";
  time: number; // Time limit in seconds (default: 30)
  words: number; // Word count limit (default: 50)
  language: string; // Language code (e.g., "english")

  // Difficulty Modifiers
  difficulty: "normal" | "expert" | "master";
  punctuation: boolean; // Include punctuation
  numbers: boolean; // Include numbers
  blindMode: boolean; // Hide text during typing
  lazyMode: boolean; // Lazy mode setting

  // Error Handling
  stopOnError: "off" | "letter" | "word";

  // Funbox
  funbox: FunboxName[]; // Array of active funbox names (max 15)

  // Custom Mode
  customText: CustomTextSettings;
}
```

### Default Configuration

**File:** `frontend/src/ts/constants/default-config.ts`

```typescript
const defaultConfig = {
  mode: "time",
  time: 30,
  words: 50,
  language: "english",
  difficulty: "normal",
  punctuation: false,
  numbers: false,
  blindMode: false,
  lazyMode: false,
  stopOnError: "off",
  funbox: [],
  // ... additional settings
};
```

### Mode2 Calculation

**File:** `frontend/src/ts/utils/misc.ts`

The `mode2` field represents the secondary mode parameter:

```typescript
function getMode2(config: Config, quote?: Quote): string {
  switch (config.mode) {
    case "time":
      return config.time.toString(); // e.g., "30", "60"
    case "words":
      return config.words.toString(); // e.g., "50", "100"
    case "quote":
      return quote?.group?.toString() ?? "-1";
    case "zen":
      return "zen";
    case "custom":
      return "custom";
  }
}
```

---

## 3. Test Execution & State Management

### Test State Module

**File:** `frontend/src/ts/test/test-state.ts`

```typescript
// State Variables
export let isActive: boolean = false; // Test is currently running
export let activeWordIndex: number = 0; // Current word position
export let bailedOut: boolean = false; // User quit mid-test
export let isRepeated: boolean = false; // Test is being repeated
export let resultVisible: boolean = false; // Results are displayed
```

### Test Input Tracking

**File:** `frontend/src/ts/test/test-input.ts`

The `Input` class tracks all typing input:

```typescript
class Input {
  current: string; // Current word being typed
  history: string[]; // Completed words
  koreanStatus: boolean; // Korean input handling

  // Key timing data
  keyDownData: Record<string, { timestamp: number; index: number }>;
}
```

### Keypress Timing Collection

**File:** `frontend/src/ts/test/test-input.ts`

```typescript
// Timing data structure
const keypressTimings = {
  spacing: {
    array: number[];    // Time intervals between keypresses (ms)
    last: number;       // Timestamp of last keypress
    first: number;      // Timestamp of first keypress
  },
  duration: {
    array: number[];    // Key hold durations (ms)
  }
};

// Key overlap tracking
const keyOverlap = {
  total: number;        // Total time with multiple keys pressed
  lastStartTime: number;
};
```

### Key Spacing Calculation

**Lines 429-438 of test-input.ts:**

```typescript
if (keypressTimings.spacing.last !== -1) {
  const diff = Math.abs(now - keypressTimings.spacing.last);
  keypressTimings.spacing.array.push(roundTo2(diff));
}
keypressTimings.spacing.last = now;
```

**Formula:** `|current_keypress_time - previous_keypress_time|` (milliseconds, rounded to 2 decimal places)

### Key Duration Calculation

**Lines 380-385 of test-input.ts:**

```typescript
const diff = Math.abs(keyDownDataForKey.timestamp - now);
keypressTimings.duration.array[keyDownDataForKey.index] = diff;
```

**Formula:** `|keydown_time - keyup_time|` (milliseconds)

### Key Overlap Measurement

**Lines 441-453 of test-input.ts:**

```typescript
function updateOverlap(now: number): void {
  const keys = Object.keys(keyDownData);
  if (keys.length > 1) {
    if (keyOverlap.lastStartTime === -1) {
      keyOverlap.lastStartTime = now;
    }
  } else {
    if (keyOverlap.lastStartTime !== -1) {
      keyOverlap.total += now - keyOverlap.lastStartTime;
      keyOverlap.lastStartTime = -1;
    }
  }
}
```

**Logic:** Accumulates total time when multiple keys are pressed simultaneously.

---

## 4. Statistics & Metrics Calculation

### File: `frontend/src/ts/test/test-stats.ts`

### WPM Calculation

**Lines 150-176:**

```typescript
const wpm = Numbers.roundTo2(
  ((chars.correctWordChars + chars.correctSpaces) * (60 / testSeconds)) / 5,
);
```

**Formula:**

```
WPM = ((correct_word_chars + correct_spaces) × 60 / test_seconds) / 5
```

**Note:** Only characters from fully correct words count toward WPM.

### Raw WPM Calculation

```typescript
const raw = Numbers.roundTo2(
  ((chars.allCorrectChars +
    chars.spaces +
    chars.incorrectChars +
    chars.extraChars) *
    (60 / testSeconds)) /
    5,
);
```

**Formula:**

```
Raw WPM = ((all_typed_chars) × 60 / test_seconds) / 5
```

**Difference:** Raw WPM includes ALL typed characters (correct + incorrect + extra).

### Accuracy Calculation

```typescript
const accuracy = Numbers.roundTo2(
  (chars.correctChars /
    (chars.correctChars + chars.incorrectChars + chars.extraChars)) *
    100,
);
```

**Formula:**

```
Accuracy = (correct_chars / total_typed_chars) × 100
```

### Consistency Calculation (Kogasa Method)

**File:** `frontend/src/ts/test/test-logic.ts`, Lines 761-782

```typescript
// Raw/Burst consistency
const stddev = Numbers.stdDev(rawPerSecond);
const avg = Numbers.mean(rawPerSecond);
let consistency = Numbers.roundTo2(Numbers.kogasa(stddev / avg));

// WPM consistency
const stddev3 = Numbers.stdDev(chartData.wpm ?? []);
const avg3 = Numbers.mean(chartData.wpm ?? []);
const wpmConsistency = Numbers.roundTo2(Numbers.kogasa(stddev3 / avg3));

// Key consistency
let keyConsistency = Numbers.roundTo2(
  Numbers.kogasa(
    Numbers.stdDev(keyConsistencyArray) / Numbers.mean(keyConsistencyArray),
  ),
);
```

**Kogasa Formula:**

```
kogasa(coefficient_of_variation) → percentage score (0-100)
```

The Kogasa function transforms the coefficient of variation (σ/μ) into a consistency score where lower variance yields higher consistency.

### Character Statistics

**Function:** `countChars()` in test-stats.ts, Lines 288-382

| Stat               | Description                                   |
| ------------------ | --------------------------------------------- |
| `correctWordChars` | Characters from completely correct words only |
| `allCorrectChars`  | All correctly typed characters                |
| `incorrectChars`   | Mistyped characters                           |
| `extraChars`       | Additional characters beyond word length      |
| `missedChars`      | Characters not typed in incomplete words      |
| `correctSpaces`    | Correct space characters                      |

### AFK Duration Calculation

**Lines 190-209:**

```typescript
// Test Duration
const duration = (end - start) / 1000; // seconds

// AFK Duration
const afkDuration = calculateAfkSeconds(duration);
// Based on afkHistory array + extra seconds for missing keypress data
```

---

## 5. Result Object Generation

### File: `frontend/src/ts/test/test-logic.ts`

### Function: `buildCompletedEvent()` (Lines 742-878)

The complete result object structure:

```typescript
const completedEvent: Omit<CompletedEvent, "hash" | "uid"> = {
  // Performance Metrics
  wpm: stats.wpm, // Words per minute (0-420)
  rawWpm: stats.wpmRaw, // Raw WPM (uncorrected)
  acc: stats.acc, // Accuracy percentage (50-100)
  consistency: consistency, // Burst consistency (0-100)
  wpmConsistency: wpmConsistency, // WPM consistency (0-100)
  keyConsistency: keyConsistency, // Key timing consistency (0-100)

  // Character Statistics
  charStats: [
    // Tuple of 4 integers
    stats.correctChars + stats.correctSpaces, // [0] correct
    stats.incorrectChars, // [1] incorrect
    stats.extraChars, // [2] extra
    stats.missedChars, // [3] missed
  ],
  charTotal: stats.allChars, // Total characters typed

  // Test Configuration
  mode: Config.mode, // "time" | "words" | "quote" | "zen" | "custom"
  mode2: Misc.getMode2(Config, TestWords.currentQuote),
  language: language,
  difficulty: Config.difficulty,
  punctuation: Config.punctuation,
  numbers: Config.numbers,
  blindMode: Config.blindMode,
  lazyMode: Config.lazyMode,
  funbox: Config.funbox, // Array of funbox names

  // Timing Data
  timestamp: Date.now(), // Unix timestamp (ms)
  testDuration: duration, // Test duration (seconds)
  afkDuration: afkDuration, // AFK time (seconds)
  startToFirstKey: stfk, // Time to first keypress (ms)
  lastKeyToEnd: lkte, // Time from last key to end (ms)

  // Keypress Data
  keySpacing: keypressTimings.spacing.array, // Array of intervals (ms)
  keyDuration: keypressTimings.duration.array, // Array of durations (ms)
  keyOverlap: Numbers.roundTo2(TestInput.keyOverlap.total),

  // Session Data
  restartCount: TestStats.restartCount,
  incompleteTests: TestStats.incompleteTests,
  incompleteTestSeconds: TestStats.incompleteSeconds,

  // Chart Data
  chartData: {
    wpm: TestInput.wpmHistory, // WPM per second
    burst: rawPerSecond, // Burst speed per second
    err: chartErr, // Errors per second
  },

  // Mode-Specific
  quoteLength: quoteLength, // Only for quote mode (0-3)
  customText: customText, // Only for custom mode

  // Flags
  tags: activeTagsIds, // Array of tag IDs
  bailedOut: TestState.bailedOut, // User quit early
  stopOnLetter: Config.stopOnError === "letter",
};
```

### Data Sanitization (Lines 874-876)

```typescript
if (completedEvent.mode !== "custom") delete completedEvent.customText;
if (completedEvent.mode !== "quote") delete completedEvent.quoteLength;
```

---

## 6. Hash Generation & Anti-Cheat (Client-Side)

### Hash Library

- **Package:** `object-hash` version 3.0.0
- **Algorithm:** SHA-256 (default for object-hash)
- **File:** `frontend/src/ts/test/test-logic.ts`

### Hash Generation Process

**Lines 1242-1244:**

```typescript
//@ts-expect-error just in case this is repeated and already has a hash
delete result.hash;
result.hash = objectHash(result);
```

### Data Included in Hash

The entire `CompletedEvent` object is hashed, including:

- All performance metrics (WPM, accuracy, consistency)
- All character statistics
- All test configuration
- All timing data (keySpacing, keyDuration, keyOverlap)
- All session data
- Chart data
- Timestamps

### Long Test Data Handling

**Lines 1237-1241:**

```typescript
if (result.testDuration > 122) {
  result.chartData = "toolong";
  result.keySpacing = "toolong";
  result.keyDuration = "toolong";
}
```

**Purpose:** Reduces payload size for tests longer than ~2 minutes while maintaining hash integrity.

### Hash Generation Timing

1. **Signed-in users:** Hash generated immediately before API submission
2. **Anonymous users:** Hash generated when user signs in (re-hashed with UID)

---

## 7. API Communication & Contracts

### API Contract Definition

**File:** `packages/contracts/src/results.ts`

### Endpoint: Add Result

```typescript
add: {
  method: "POST",
  path: "/results",
  body: AddResultRequestSchema.strict(),
  responses: {
    200: AddResultResponseSchema,
    460: MonkeyClientError.describe("Test too short"),
    461: MonkeyClientError.describe("Result hash invalid"),
    462: MonkeyClientError.describe("Result spacing invalid"),
    463: MonkeyClientError.describe("Result data invalid"),
    464: MonkeyClientError.describe("Missing key data"),
    465: MonkeyClientError.describe("Bot detected"),
    466: MonkeyClientError.describe("Duplicate result"),
  },
  metadata: meta({
    rateLimit: "resultsAdd",
    requireConfiguration: {
      path: "results.savingEnabled",
      invalidMessage: "Results are not being saved at this time.",
    },
  }),
}
```

### Request Schema

```typescript
export const AddResultRequestSchema = z.object({
  result: CompletedEventSchema, // The complete result with hash
});
```

### Response Schema

```typescript
export const PostResultResponseSchema = z.object({
  insertedId: IdSchema, // New result ID
  isPb: z.boolean(), // Personal best achieved
  tagPbs: z.array(IdSchema), // Tag-specific PBs
  dailyLeaderboardRank: z.number().int().nonnegative().optional(),
  weeklyXpLeaderboardRank: z.number().int().nonnegative().optional(),
  xp: z.number().int().nonnegative(), // XP gained
  dailyXpBonus: z.boolean(), // Daily bonus applied
  xpBreakdown: XpBreakdownSchema, // Detailed XP breakdown
  streak: z.number().int().nonnegative(), // Current streak
});
```

### Frontend Submission

**File:** `frontend/src/ts/test/test-logic.ts`, Lines 1250-1276

```typescript
const response = await Ape.results.add({ body: { result } });
```

### Retry Logic (Lines 1254-1262)

```typescript
if (response.status !== 200) {
  // Only allow retry if status is not in the non-retryable list
  if (![460, 461, 463, 464, 465, 466].includes(response.status)) {
    retrySaving.canRetry = true;
    // Show retry button
  }
}
```

**Non-Retryable Errors:**

- 460: Test too short (permanent)
- 461: Hash invalid (security issue)
- 463: Data invalid (anti-cheat)
- 464: Missing key data (permanent)
- 465: Bot detected (security)
- 466: Duplicate result (permanent)

---

## 8. Backend Result Processing

### File: `backend/src/api/controllers/result.ts`

### Function: `addResult()` (Lines 187-700+)

### Processing Pipeline

#### Step 1: User Validation (Lines 192-199)

```typescript
const user = await UserDAL.getUser(uid, "add result");

if (user.needsToChangeName) {
  throw new MonkeyError(
    403,
    "Please change your name before submitting a result",
  );
}
```

#### Step 2: Test Duration Validation (Lines 204-207)

```typescript
if (isTestTooShort(completedEvent)) {
  const status = MonkeyStatusCodes.TEST_TOO_SHORT;
  throw new MonkeyError(status.code, status.message);
}
```

**Minimum Requirements:**
| Mode | Requirement |
|------|-------------|
| time | ≥15 seconds (set time) or ≥15s duration (infinite) |
| words | ≥10 words (set) or ≥15s duration (infinite) |
| custom | ≥10 words/sections OR ≥15s time limit |
| zen | ≥15 seconds duration |

#### Step 3: Accuracy Validation (Lines 209-211)

```typescript
if (user.lbOptOut !== true && completedEvent.acc < 75) {
  throw new MonkeyError(400, "Accuracy too low");
}
```

**Requirement:** 75% minimum accuracy for leaderboard-eligible users.

#### Step 4: Hash Verification (Lines 213-232)

```typescript
const resulthash = completedEvent.hash;
if (req.ctx.configuration.results.objectHashCheckEnabled) {
  const objectToHash = omit(completedEvent, ["hash"]);
  const serverhash = objectHash(objectToHash);
  if (serverhash !== resulthash) {
    void addLog(
      "incorrect_result_hash",
      { serverhash, resulthash, result },
      uid,
    );
    const status = MonkeyStatusCodes.RESULT_HASH_INVALID;
    throw new MonkeyError(status.code, "Incorrect result hash");
  }
}
```

**Process:**

1. Remove hash from object
2. Recalculate hash server-side using identical `object-hash` library
3. Compare client hash with server hash
4. Log discrepancy and reject if mismatch

#### Step 5: Funbox Validation (Lines 234-240)

```typescript
if (completedEvent.funbox.length !== new Set(completedEvent.funbox).size) {
  throw new MonkeyError(400, "Duplicate funboxes");
}

if (!checkCompatibility(completedEvent.funbox)) {
  throw new MonkeyError(400, "Impossible funbox combination");
}
```

#### Step 6: Key Statistics Calculation (Lines 242-268)

```typescript
let keySpacingStats: KeyStats | undefined = undefined;
if (
  completedEvent.keySpacing !== "toolong" &&
  completedEvent.keySpacing.length > 0
) {
  keySpacingStats = {
    average:
      completedEvent.keySpacing.reduce((p, c) => (c += p)) /
      completedEvent.keySpacing.length,
    sd: stdDev(completedEvent.keySpacing),
  };
}

let keyDurationStats: KeyStats | undefined = undefined;
if (
  completedEvent.keyDuration !== "toolong" &&
  completedEvent.keyDuration.length > 0
) {
  keyDurationStats = {
    average:
      completedEvent.keyDuration.reduce((p, c) => (c += p)) /
      completedEvent.keyDuration.length,
    sd: stdDev(completedEvent.keyDuration),
  };
}
```

#### Step 7: Suspicious User Logging (Lines 270-281)

```typescript
if (user.suspicious && completedEvent.testDuration <= 120) {
  await addImportantLog("suspicious_user_result", completedEvent, uid);
}

if (
  completedEvent.mode === "time" &&
  (completedEvent.mode2 === "60" || completedEvent.mode2 === "15") &&
  completedEvent.wpm > 250 &&
  user.lbOptOut !== true
) {
  await addImportantLog("highwpm_user_result", completedEvent, uid);
}
```

**Triggers:**

- Suspicious users with tests ≤120s
- WPM >250 on time 15/60 modes (for leaderboard users)

#### Step 8: Anti-Cheat Validation (Lines 283-305)

```typescript
if (anticheatImplemented()) {
  if (
    !validateResult(
      completedEvent,
      req.raw.headers["x-client-version"] as string,
      JSON.stringify(new UAParser(req.raw.headers["user-agent"]).getResult()),
      user.lbOptOut === true,
    )
  ) {
    const status = MonkeyStatusCodes.RESULT_DATA_INVALID;
    throw new MonkeyError(status.code, "Result data doesn't make sense");
  }
}
```

**Parameters Passed to Anti-Cheat:**

- Complete result object
- Client version header
- Parsed user agent (browser, OS, device)
- Leaderboard opt-out status

#### Step 9: Result Spacing Validation (Lines 319-349)

```typescript
const testDurationMilis = completedEvent.testDuration * 1000;
const incompleteTestsMilis = completedEvent.incompleteTestSeconds * 1000;
const earliestPossible = (lastResultTimestamp ?? 0) + testDurationMilis + incompleteTestsMilis;
const nowNoMilis = Math.floor(Date.now() / 1000) * 1000;

if (isSafeNumber(lastResultTimestamp) && nowNoMilis < earliestPossible - 1000) {
  void addLog("invalid_result_spacing", { ... }, uid);
  const status = MonkeyStatusCodes.RESULT_SPACING_INVALID;
  throw new MonkeyError(status.code, "Invalid result spacing");
}
```

**Logic:** Ensures sufficient time has passed since last result based on test duration.

#### Step 10: Bot Detection for High WPM (Lines 351-402)

```typescript
if (
  completedEvent.mode === "time" &&
  completedEvent.wpm > 130 &&
  completedEvent.testDuration < 122 &&
  (user.verified === false || user.verified === undefined) &&
  user.lbOptOut !== true
) {
  if (!keySpacingStats || !keyDurationStats) {
    throw new MonkeyError(464, "Missing key data");
  }

  if (completedEvent.keyOverlap === undefined) {
    throw new MonkeyError(400, "Old key data format");
  }

  if (!validateKeys(completedEvent, keySpacingStats, keyDurationStats, uid)) {
    // Auto-ban logic
    const didUserGetBanned = await UserDAL.recordAutoBanEvent(
      uid,
      maxCount,
      maxHours,
    );
    if (didUserGetBanned) {
      // Send ban notification via inbox
    }
    throw new MonkeyError(465, "Possible bot detected");
  }
}
```

**Triggers for Enhanced Validation:**

- Time mode
- WPM >130
- Test duration <122 seconds
- User not verified
- User not opted out of leaderboards

#### Step 11: Duplicate Result Check (Lines 404-426)

```typescript
if (req.ctx.configuration.users.lastHashesCheck.enabled) {
  let lastHashes = user.lastReultHashes ?? [];
  if (lastHashes.includes(resulthash)) {
    const status = MonkeyStatusCodes.DUPLICATE_RESULT;
    throw new MonkeyError(status.code, "Duplicate result");
  } else {
    lastHashes.unshift(resulthash);
    if (lastHashes.length > maxHashes) {
      lastHashes = lastHashes.slice(0, maxHashes);
    }
    await UserDAL.updateLastHashes(uid, lastHashes);
  }
}
```

**Mechanism:** Maintains a rolling window of recent result hashes per user.

---

## 9. Anti-Cheat System (Server-Side)

### File: `backend/src/anticheat/index.ts`

### Module Structure

```typescript
const hasAnticheatImplemented = process.env["BYPASS_ANTICHEAT"] === "true";

export function implemented(): boolean {
  if (hasAnticheatImplemented) {
    Logger.warning("BYPASS_ANTICHEAT is enabled! Running without anti-cheat.");
  }
  return hasAnticheatImplemented;
}

export function validateResult(
  _result: object,
  _version: string,
  _uaStringifiedObject: string,
  _lbOptOut: boolean,
): boolean {
  Logger.warning("No anticheat module found, result will not be validated.");
  return true;
}

export function validateKeys(
  _result: CompletedEvent,
  _keySpacingStats: KeyStats,
  _keyDurationStats: KeyStats,
  _uid: string,
): boolean {
  Logger.warning("No anticheat module found, key data will not be validated.");
  return true;
}
```

**Important:** The actual anti-cheat implementation is **not included in the open-source repository**. The open-source version contains placeholder functions that always return `true`.

### Anti-Cheat Functions

#### `validateResult()`

**Parameters:**

- `result`: Complete result object
- `version`: Client version string
- `uaStringifiedObject`: JSON-stringified user agent data
- `lbOptOut`: Whether user opted out of leaderboards

**Purpose:** Validates overall result data patterns, checks for impossible values, analyzes behavioral patterns.

#### `validateKeys()`

**Parameters:**

- `result`: Complete result object
- `keySpacingStats`: `{ average: number, sd: number }`
- `keyDurationStats`: `{ average: number, sd: number }`
- `uid`: User ID

**Purpose:** Analyzes keystroke timing patterns for bot detection.

### Bot Detection Mechanisms (Inferred)

Based on the code structure, the anti-cheat likely analyzes:

1. **Statistical Analysis**
   - Key spacing standard deviation (too consistent = bot)
   - Key duration patterns
   - Key overlap patterns (human typing has natural overlap)

2. **Behavioral Patterns**
   - WPM progression over test duration
   - Error distribution
   - Timing consistency vs human variance

3. **Client Validation**
   - Client version verification
   - User agent analysis
   - Request pattern analysis

4. **Historical Comparison**
   - User's historical performance
   - Sudden performance spikes

### Auto-Ban System (Lines 371-389)

```typescript
const autoBanConfig = req.ctx.configuration.users.autoBan;
if (autoBanConfig.enabled) {
  const didUserGetBanned = await UserDAL.recordAutoBanEvent(
    uid,
    autoBanConfig.maxCount,
    autoBanConfig.maxHours,
  );
  if (didUserGetBanned) {
    const mail = buildMonkeyMail({
      subject: "Banned",
      body: "Your account has been automatically banned for triggering the anticheat system...",
    });
    await UserDAL.addToInbox(uid, [mail], req.ctx.configuration.users.inbox);
    user.banned = true;
  }
}
```

**Mechanism:** Tracks anti-cheat violations over a time window; bans after threshold exceeded.

---

## 10. Database Storage

### MongoDB Collection

**Collection Name:** `results`

### DAL Module

**File:** `backend/src/dal/result.ts`

### Collection Access

```typescript
export const getResultCollection = (): Collection<DBResult> =>
  db.collection<DBResult>("results");
```

### Database Result Type

**File:** `backend/src/utils/result.ts`

```typescript
export type DBResult = WithObjectId<Result<Mode>> & {
  // Legacy fields for backwards compatibility
  correctChars?: number;
  incorrectChars?: number;
  chartData: ChartData | OldChartData | "toolong";
};
```

### Result Builder Function

**Function:** `buildDbResult()` (Lines 19-74)

```typescript
export function buildDbResult(
  completedEvent: CompletedEvent,
  userName: string,
  isPb: boolean,
): DBResult {
  const res: DBResult = {
    _id: new ObjectId(),
    uid: ce.uid,
    wpm: ce.wpm,
    rawWpm: ce.rawWpm,
    charStats: ce.charStats,
    acc: ce.acc,
    mode: ce.mode,
    mode2: ce.mode2,
    quoteLength: ce.quoteLength,
    timestamp: ce.timestamp,
    restartCount: ce.restartCount,
    incompleteTestSeconds: ce.incompleteTestSeconds,
    testDuration: ce.testDuration,
    afkDuration: ce.afkDuration,
    tags: ce.tags,
    consistency: ce.consistency,
    keyConsistency: ce.keyConsistency,
    chartData: ce.chartData,
    language: ce.language,
    lazyMode: ce.lazyMode,
    difficulty: ce.difficulty,
    funbox: ce.funbox,
    numbers: ce.numbers,
    punctuation: ce.punctuation,
    isPb: isPb,
    bailedOut: ce.bailedOut,
    blindMode: ce.blindMode,
    name: userName,
  };

  // Compression by omitting defaults...
  return res;
}
```

### Data Compression (Storage Optimization)

Default values are removed to reduce storage size:

```typescript
if (!ce.bailedOut) delete res.bailedOut;
if (!ce.blindMode) delete res.blindMode;
if (!ce.lazyMode) delete res.lazyMode;
if (ce.difficulty === "normal") delete res.difficulty;
if (ce.funbox.length === 0) delete res.funbox;
if (ce.language === "english") delete res.language;
if (!ce.numbers) delete res.numbers;
if (!ce.punctuation) delete res.punctuation;
if (ce.mode !== "quote") delete res.quoteLength;
if (ce.restartCount === 0) delete res.restartCount;
if (ce.incompleteTestSeconds === 0) delete res.incompleteTestSeconds;
if (ce.afkDuration === 0) delete res.afkDuration;
if (ce.tags.length === 0) delete res.tags;
if (res.isPb === false) delete res.isPb;
```

### Legacy Value Migration

**Function:** `replaceLegacyValues()` (Lines 81-126)

Handles backwards compatibility:

- `correctChars`/`incorrectChars` → `charStats[]`
- `funbox` string → `funbox[]` array
- `chartData.raw` → `chartData.burst`

### DAL Methods

| Method                            | Description                  |
| --------------------------------- | ---------------------------- |
| `addResult(uid, result)`          | Insert new result            |
| `getResult(uid, id)`              | Get single result by ID      |
| `getLastResult(uid)`              | Get most recent result       |
| `getLastResultTimestamp(uid)`     | Get timestamp of last result |
| `getResults(uid, opts)`           | Get paginated results        |
| `updateTags(uid, resultId, tags)` | Update result tags           |
| `deleteAll(uid)`                  | Delete all user results      |

### Query Optimization

When fetching multiple results, heavy fields are excluded:

```typescript
const query = getResultCollection()
  .find(condition, {
    projection: {
      chartData: 0,
      keySpacingStats: 0,
      keyDurationStats: 0,
      name: 0,
    },
  })
  .sort({ timestamp: -1 });
```

---

## 11. Error Handling & Status Codes

### Custom Status Codes

**File:** `backend/src/constants/monkey-status-codes.ts`

| Code | Name                     | Description                                  |
| ---- | ------------------------ | -------------------------------------------- |
| 460  | `TEST_TOO_SHORT`         | Test duration below minimum threshold        |
| 461  | `RESULT_HASH_INVALID`    | Client/server hash mismatch                  |
| 462  | `RESULT_SPACING_INVALID` | Results submitted too quickly                |
| 463  | `RESULT_DATA_INVALID`    | Anti-cheat validation failed                 |
| 464  | `MISSING_KEY_DATA`       | Required keystroke data missing for high WPM |
| 465  | `BOT_DETECTED`           | Automated typing detected                    |
| 466  | `DUPLICATE_RESULT`       | Identical result hash already exists         |
| 469  | `GIT_GUD`                | Git gud scrub (easter egg)                   |

### Standard HTTP Errors

| Code | Scenario                                                           |
| ---- | ------------------------------------------------------------------ |
| 200  | Success                                                            |
| 400  | Bad request (duplicate funboxes, old key format, accuracy too low) |
| 403  | User needs to change name                                          |
| 404  | User/result not found                                              |
| 422  | Validation error (invalid tags, limit exceeded)                    |
| 500  | Negative XP calculation error                                      |
| 503  | Premium feature disabled                                           |

### Error Response Format

```typescript
{
  message: string;  // Error description
  data?: any;       // Additional error data (in some cases)
}
```

### Frontend Error Handling

**Lines 1264-1274 of test-logic.ts:**

```typescript
if (response.body.message === "Old key data format") {
  response.body.message = "Old key data format. Please refresh the page...";
}

if (/"result\..+" is (not allowed|required)/gi.test(response.body.message)) {
  response.body.message =
    "Looks like your result data is using an incorrect schema...";
}
```

---

## 12. Rate Limiting

### Configuration

**File:** `packages/contracts/src/rate-limit/index.ts`

```typescript
resultsAdd: {
  window: "hour",
  max: 300,  // 300 results per hour
}
```

### Implementation

**File:** `backend/src/middlewares/rate-limit.ts`

**Technologies:**

- `express-rate-limit`
- `rate-limiter-flexible`

**Strategies:**

1. **IP-based limiting:** Limits requests per IP address
2. **UID-based limiting:** Limits requests per authenticated user
3. **API key limits:** Different limits for API key users

### Rate Limit Multipliers

- **Development:** 100x limits
- **Production:** 1x limits

### Bad Authentication Penalty

Failed authentication attempts incur additional rate limit penalties.

---

## 13. XP & Leaderboard Systems

### XP Calculation

**File:** `backend/src/api/controllers/result.ts`

#### Base XP

```
baseXP = (testDuration - afkDuration) × 2
```

#### Modifiers (Multiplicative)

| Modifier             | Bonus    | Condition                  |
| -------------------- | -------- | -------------------------- |
| Full Accuracy        | +50%     | 100% accuracy              |
| Corrected Everything | +25%     | No incorrect characters    |
| Quote Mode           | +50%     | Mode is quote              |
| Punctuation          | +40%     | Punctuation enabled        |
| Numbers              | +10%     | Numbers enabled            |
| Funbox               | Variable | Based on funbox difficulty |
| Streak               | Variable | Based on consecutive days  |

#### Final Calculation

```
xpWithModifiers = baseXp × modifier
xpAfterAccuracy = xpWithModifiers × ((accuracy - 50) / 50)
totalXp = (xpAfterAccuracy + incompleteXp) × gainMultiplier + dailyBonus
```

#### Daily Bonus

- 5% of total XP
- Applied if first test of the day
- Has min/max limits

### XP Breakdown Schema

```typescript
export const XpBreakdownSchema = z.object({
  base: z.number().int().optional(),
  fullAccuracy: z.number().int().optional(),
  quote: z.number().int().optional(),
  corrected: z.number().int().optional(),
  punctuation: z.number().int().optional(),
  numbers: z.number().int().optional(),
  funbox: z.number().int().optional(),
  streak: z.number().int().optional(),
  incomplete: z.number().int().optional(),
  daily: z.number().int().optional(),
  accPenalty: z.number().int().optional(),
  configMultiplier: z.number().int().optional(),
});
```

### Daily Leaderboard

**File:** `backend/src/utils/daily-leaderboards.ts`

**Storage:** Redis (real-time updates)

**Scoring:** Uses `kogascore(wpm, acc, timestamp)` formula

**Eligibility Requirements:**

```typescript
const validResultCriteria =
  canFunboxGetPb(completedEvent) &&
  !completedEvent.bailedOut &&
  userEligibleForLeaderboard &&
  !stopOnLetterTriggered;
```

### Weekly XP Leaderboard

**File:** `backend/src/services/weekly-xp-leaderboard.ts`

**Storage:** Redis

**Tracked Data:**

- Total XP per week
- Time typed (seconds)

**Auto-expiration:** After configured days

---

## 14. Data Type Constraints

### Zod Schema Constraints

**File:** `packages/schemas/src/results.ts`

| Field                   | Type   | Constraints                               |
| ----------------------- | ------ | ----------------------------------------- |
| `wpm`                   | number | 0 ≤ n ≤ 420                               |
| `rawWpm`                | number | 0 ≤ n ≤ 420                               |
| `acc`                   | number | 50 ≤ n ≤ 100                              |
| `consistency`           | number | 0 ≤ n ≤ 100                               |
| `keyConsistency`        | number | 0 ≤ n ≤ 100                               |
| `wpmConsistency`        | number | 0 ≤ n ≤ 100                               |
| `charStats`             | tuple  | 4 non-negative integers                   |
| `charTotal`             | number | Non-negative integer                      |
| `testDuration`          | number | ≥ 1                                       |
| `timestamp`             | number | Non-negative integer                      |
| `restartCount`          | number | Non-negative integer                      |
| `incompleteTestSeconds` | number | ≥ 0                                       |
| `afkDuration`           | number | ≥ 0                                       |
| `keyOverlap`            | number | ≥ 0                                       |
| `lastKeyToEnd`          | number | ≥ 0                                       |
| `startToFirstKey`       | number | ≥ 0                                       |
| `quoteLength`           | number | 0-3 (short, medium, long, thicc)          |
| `mode`                  | enum   | "time", "words", "quote", "zen", "custom" |
| `difficulty`            | enum   | "normal", "expert", "master"              |
| `funbox`                | array  | Max 15 items                              |
| `chartData.wpm`         | array  | Max 122 items                             |
| `chartData.burst`       | array  | Max 122 items                             |
| `chartData.err`         | array  | Max 122 items                             |
| `hash`                  | string | Alphanumeric + underscore, max 100 chars  |
| `tags`                  | array  | Valid tag IDs only                        |

### Token Schema

```typescript
export function token() {
  return z.string().regex(/^[a-zA-Z0-9_]+$/);
}
```

### ID Schema

```typescript
export const IdSchema = z.string().regex(/^[a-f0-9]{24}$/); // MongoDB ObjectId format
```

### Accepted vs Rejected Data

**Accepted:**

- Valid JSON matching Zod schemas
- Hash matching server-side calculation
- Timing data consistent with test duration
- Reasonable statistical patterns

**Rejected:**

- Schema validation failures
- Hash mismatches
- Impossible timing (e.g., result spacing)
- Statistical anomalies (anti-cheat)
- Duplicate hashes
- Missing required fields
- Out-of-bounds values

---

## 15. Security Architecture Summary

### Defense-in-Depth Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Client-Side Validation                            │
│  - Zod schema validation                                    │
│  - SHA-256 hash generation (object-hash)                    │
│  - Data sanitization                                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Transport Security                                │
│  - HTTPS/TLS encryption                                     │
│  - Authentication tokens                                    │
│  - Rate limiting (300/hour per user)                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Backend Validation                                │
│  - Zod schema re-validation                                 │
│  - Hash verification (server recalculates)                  │
│  - Result spacing validation (timing physics)               │
│  - Duplicate result detection                               │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Anti-Cheat Analysis                               │
│  - Result data validation (validateResult)                  │
│  - Key timing analysis (validateKeys)                       │
│  - Statistical anomaly detection                            │
│  - User agent verification                                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Progressive Enforcement                           │
│  - Enhanced checks for high WPM (>130)                      │
│  - Unverified user scrutiny                                 │
│  - Suspicious user logging                                  │
│  - Auto-ban system                                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: Audit & Monitoring                                │
│  - Important log events                                     │
│  - High WPM logging (>250)                                  │
│  - Hash mismatch logging                                    │
│  - Daily leaderboard top-10 logging                         │
└─────────────────────────────────────────────────────────────┘
```

### Key Security Properties

| Property              | Implementation                               |
| --------------------- | -------------------------------------------- |
| **Integrity**         | SHA-256 hash verified server-side            |
| **Authenticity**      | Firebase authentication + token verification |
| **Non-repudiation**   | Hash includes all result data                |
| **Anti-replay**       | Duplicate hash detection                     |
| **Rate Limiting**     | 300 results/hour                             |
| **Bot Detection**     | Key timing statistical analysis              |
| **Progressive Trust** | Verified users get lighter checks            |

### Critical Security Files

| File                                    | Purpose                     |
| --------------------------------------- | --------------------------- |
| `backend/src/anticheat/index.ts`        | Anti-cheat module interface |
| `backend/src/api/controllers/result.ts` | Main validation logic       |
| `backend/src/middlewares/rate-limit.ts` | Rate limiting               |
| `frontend/src/ts/test/test-logic.ts`    | Hash generation             |
| `packages/schemas/src/results.ts`       | Schema definitions          |

---

## Appendix A: Complete CompletedEvent Schema

```typescript
export const CompletedEventSchema = z
  .object({
    // Performance Metrics (Required)
    wpm: z.number().nonnegative().max(420),
    rawWpm: z.number().nonnegative().max(420),
    acc: z.number().nonnegative().max(100).min(50),
    consistency: z.number().nonnegative().max(100),
    keyConsistency: z.number().nonnegative().max(100),
    wpmConsistency: z.number().nonnegative().max(100),

    // Character Statistics (Required)
    charStats: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
    ]),
    charTotal: z.number().int().nonnegative(),

    // Test Configuration (Required)
    mode: z.enum(["time", "words", "quote", "zen", "custom"]),
    mode2: z.string(),
    language: z.string(),
    difficulty: z.enum(["normal", "expert", "master"]),
    punctuation: z.boolean(),
    numbers: z.boolean(),
    blindMode: z.boolean(),
    lazyMode: z.boolean(),
    funbox: z.array(z.string()).max(15),

    // Timing Data (Required)
    timestamp: z.number().int().nonnegative(),
    testDuration: z.number().min(1),
    afkDuration: z.number().nonnegative(),
    startToFirstKey: z.number().nonnegative(),
    lastKeyToEnd: z.number().nonnegative(),

    // Keypress Data (Required)
    keySpacing: z.array(z.number().nonnegative()).or(z.literal("toolong")),
    keyDuration: z.array(z.number().nonnegative()).or(z.literal("toolong")),
    keyOverlap: z.number().nonnegative(),

    // Session Data (Required)
    restartCount: z.number().int().nonnegative(),
    incompleteTests: z.array(IncompleteTestSchema),
    incompleteTestSeconds: z.number().nonnegative(),

    // Chart Data (Required)
    chartData: z
      .object({
        wpm: z.array(z.number().nonnegative()).max(122),
        burst: z.array(z.number().int().nonnegative()).max(122),
        err: z.array(z.number().nonnegative()).max(122),
      })
      .or(z.literal("toolong")),

    // Flags (Required)
    tags: z.array(z.string()),
    bailedOut: z.boolean(),
    stopOnLetter: z.boolean(),

    // Security (Required)
    hash: z
      .string()
      .regex(/^[a-zA-Z0-9_]+$/)
      .max(100),
    uid: z.string(),

    // Mode-Specific (Optional)
    quoteLength: z.number().int().nonnegative().max(3).optional(),
    customText: CompletedEventCustomTextSchema.optional(),
    challenge: z.string().max(100).optional(),
  })
  .strict();
```

---

## Appendix B: Error Code Reference

| Code | Constant                 | Retryable | Description                      |
| ---- | ------------------------ | --------- | -------------------------------- |
| 200  | -                        | N/A       | Success                          |
| 400  | -                        | Yes       | Bad request (generic)            |
| 403  | -                        | No        | Forbidden (name change required) |
| 404  | -                        | Yes       | Not found                        |
| 422  | -                        | No        | Validation error                 |
| 460  | `TEST_TOO_SHORT`         | No        | Test below minimum duration      |
| 461  | `RESULT_HASH_INVALID`    | No        | Hash verification failed         |
| 462  | `RESULT_SPACING_INVALID` | Yes\*     | Results too close together       |
| 463  | `RESULT_DATA_INVALID`    | No        | Anti-cheat validation failed     |
| 464  | `MISSING_KEY_DATA`       | No        | Key timing data required         |
| 465  | `BOT_DETECTED`           | No        | Automated input detected         |
| 466  | `DUPLICATE_RESULT`       | No        | Same hash already submitted      |
| 500  | -                        | Yes       | Server error                     |
| 503  | -                        | Yes       | Service unavailable              |

\*May resolve naturally after waiting

---

## Document Information

- **Document Version:** 1.0
- **Research Date:** April 2026
- **Codebase Version:** Monkeytype (as of research date)
- **Scope:** Complete test result lifecycle analysis

---

_This document was generated through comprehensive code analysis of the Monkeytype open-source repository._
