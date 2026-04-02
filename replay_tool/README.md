# MT Replay Tool

The **Replay Tool** is a web-based graphical interface and proxy designed to take the mathematically synthesized JSON payloads (created by the `payload-generator`) and forward them directly to the Monkeytype backend API. It simulates a completed typing test submission while spoofing a legitimate browser environment.

## Features

1. **Multiple Input Methods (JSON Parsing)**
   - **Paste JSON:** Paste the raw JSON output directly into a text area.
   - **Upload File:** Load a generated `.json` payload parameter file directly from your machine.
   - **Smart Detection:** The tool automatically detects if the JSON is wrapped in a `result` object, wrapped in a `payload` parent, or is just a direct object, and parses it cleanly.

2. **JWT Authorization Persistence**
   - Requires a Bearer Token (JWT) from an active Monkeytype session.
   - Includes a "Remember Token" feature that saves the token to your browser's local storage (`localStorage`), so you don't have to repeatedly paste it between tests.

3. **Data Verification & Editing UI**
   - Automatically populates a mapped HTML form with the imported JSON data (WPM, Accuracy, Char Stats, Mode, etc.).
   - Allows for manual, on-the-fly tweaking of parameters before submission without needing to regenerate the entire JSON file.

4. **Dynamic Timestamp Injection**
   - Contains a "Set Now" button that recalculates the `timestamp` parameter to the exact current millisecond `Date.now()`. This is crucial because sending old payloads with historical timestamps could be flagged by backend chronologies.

5. **CORS Bypass & Header Spoofing (PHP Proxy)**
   - Because modern browsers enforce Strict CORS (Cross-Origin Resource Sharing), you cannot `POST` directly to `api.monkeytype.com` from a local HTML file or `localhost` environment.
   - The tool utilizes a strictly mapped backend `proxy.php` script to act as a middleman.

## Working Mechanism

Here is the exact step-by-step pipeline of how the Replay Tool pushes data to the server:

1. **Data Ingestion:** The user loads the generated JSON payload. The JS script (`script.js`) parses the JSON and populates the frontend form fields.
2. **Preparation:** The user checks "Set Now" to update the timestamp and inputs their active JWT authorization token.
3. **Internal Submission:** When the user clicks Submit, `script.js` gathers all the form fields, rebuilds the exact `CompletedEvent` JSON object (including massive arrays like `keySpacing` and the forged `hash`), and sends it securely to the local `proxy.php` file via a `fetch()` POST request.
4. **Proxy Forwarding (`proxy.php`):**
   - The PHP script catches the local request.
   - It initializes a server-side `cURL` request targeted at `https://api.monkeytype.com/results`.
   - **Header Spoofing:** It explicitly sets the `Authorization: Bearer <TOKEN>` header, and overrides strict security headers by faking `User-Agent`, `Origin: https://monkeytype.com`, `Referer: https://monkeytype.com/`, and setting `X-Client-Version` to mimic exactly what a legitimate browser session would send.
   - It executes the POST request entirely from the backend environment to bypass CORS.
5. **Response Handling:** The Monkeytype API responds (usually with a `200 OK` or `400 Bad Request`). The PHP proxy catches this HTTP status code and response body, returning it to the frontend container where `script.js` prints the API success or failure directly in the browser's UI.
