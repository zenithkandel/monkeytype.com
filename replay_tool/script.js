document.addEventListener('DOMContentLoaded', () => {
    const jsonFileInput = document.getElementById('jsonFile');
    const jsonPasteInput = document.getElementById('jsonPaste');
    const loadPastedJsonBtn = document.getElementById('loadPastedJson');
    const missingFieldsMsg = document.getElementById('missingFieldsMsg');
    const successMsg = document.getElementById('successMsg');
    const form = document.getElementById('replayForm');
    const btnNow = document.getElementById('btnNow');
    const autoTimestamp = document.getElementById('autoTimestamp');
    const timestampInput = document.getElementById('timestamp');
    const responseContainer = document.getElementById('responseContainer');
    const responseBox = document.getElementById('responseBox');
    const tokenInput = document.getElementById('token');
    const rememberTokenCheckbox = document.getElementById('rememberToken');

    // JWT Token persistence with localStorage
    const STORAGE_KEY_TOKEN = 'mt_replay_jwt_token';
    const STORAGE_KEY_REMEMBER = 'mt_replay_remember_token';

    // Load saved token settings on page load
    function loadSavedToken() {
        const shouldRemember = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
        rememberTokenCheckbox.checked = shouldRemember;
        
        if (shouldRemember) {
            const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
            if (savedToken) {
                tokenInput.value = savedToken;
            }
        }
    }

    // Save token to localStorage if remember is checked
    function saveToken() {
        if (rememberTokenCheckbox.checked) {
            localStorage.setItem(STORAGE_KEY_TOKEN, tokenInput.value);
            localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
        } else {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.setItem(STORAGE_KEY_REMEMBER, 'false');
        }
    }

    // Handle remember token checkbox change
    rememberTokenCheckbox.addEventListener('change', () => {
        saveToken();
    });

    // Save token on input change (if remember is checked)
    tokenInput.addEventListener('input', () => {
        if (rememberTokenCheckbox.checked) {
            localStorage.setItem(STORAGE_KEY_TOKEN, tokenInput.value);
        }
    });

    // Load saved token on page load
    loadSavedToken();

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
        });
    });

    // Expected fields for validation
    const expectedFields = [
        'wpm', 'rawWpm', 'charStats', 'charTotal', 'acc', 'mode', 'mode2',
        'punctuation', 'numbers', 'lazyMode', 'timestamp', 'language', 'restartCount',
        'incompleteTests', 'incompleteTestSeconds', 'difficulty', 'blindMode', 'tags',
        'keySpacing', 'keyDuration', 'keyOverlap', 'lastKeyToEnd', 'startToFirstKey',
        'consistency', 'wpmConsistency', 'keyConsistency', 'funbox', 'bailedOut',
        'chartData', 'testDuration', 'afkDuration', 'stopOnLetter', 'uid', 'hash'
    ];

    // Handle Set Now
    btnNow.addEventListener('click', () => {
        timestampInput.value = Date.now();
    });

    // Handle JSON file upload
    jsonFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                loadPayloadData(data);
            } catch (err) {
                showError('Invalid JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    // Handle pasted JSON
    loadPastedJsonBtn.addEventListener('click', () => {
        const jsonText = jsonPasteInput.value.trim();
        if (!jsonText) {
            showError('Please paste JSON data first');
            return;
        }

        try {
            const data = JSON.parse(jsonText);
            loadPayloadData(data);
        } catch (err) {
            showError('Invalid JSON: ' + err.message);
        }
    });

    /**
     * Unified function to load payload data from any source
     * Supports multiple formats:
     * - Generator output: {result: {...}}
     * - Direct result object: {wpm: ..., keySpacing: [...], ...}
     * - Wrapped payload: {payload: {result: {...}}}
     */
    function loadPayloadData(data) {
        let result;

        // Handle different formats
        if (data.result) {
            // Generator format: {result: {...}}
            result = data.result;
        } else if (data.payload && data.payload.result) {
            // Wrapped format: {payload: {result: {...}}}
            result = data.payload.result;
        } else if (data.wpm !== undefined && data.keySpacing !== undefined) {
            // Direct result object
            result = data;
        } else {
            showError('Unrecognized JSON format. Expected "result" object or direct payload.');
            return;
        }

        populateForm(result);
    }

    let currentPayload = {};

    function showError(message) {
        missingFieldsMsg.style.display = 'block';
        missingFieldsMsg.textContent = message;
        successMsg.style.display = 'none';
    }

    function showSuccess(message) {
        successMsg.style.display = 'block';
        successMsg.textContent = message;
        missingFieldsMsg.style.display = 'none';
    }

    function populateForm(data) {
        currentPayload = Object.assign({}, data);
        const missing = [];
        const populated = [];

        expectedFields.forEach(field => {
            if (data[field] === undefined) {
                missing.push(field);
                return;
            }

            const el = document.getElementById(field);
            if (!el) return;

            const val = data[field];

            if (el.type === 'checkbox') {
                el.checked = Boolean(val);
            } else if (['charStats', 'keySpacing', 'keyDuration'].includes(field)) {
                el.value = Array.isArray(val) ? val.join(',') : val;
            } else if (['incompleteTests', 'tags', 'funbox', 'chartData'].includes(field)) {
                el.value = typeof val === 'object' ? JSON.stringify(val) : val;
            } else {
                el.value = val;
            }

            populated.push(field);
        });

        if (missing.length > 0) {
            // Check if missing fields are optional or have defaults
            const criticalMissing = missing.filter(f =>
                !['hash', 'timestamp', 'uid'].includes(f)
            );

            if (criticalMissing.length > 0) {
                showError(`Missing fields (please fill manually): ${criticalMissing.join(', ')}`);
            } else {
                showSuccess(`✅ Loaded ${populated.length} fields. Note: ${missing.join(', ')} will be auto-generated or need manual input.`);
            }
        } else {
            showSuccess(`✅ Successfully loaded all ${populated.length} fields from JSON!`);
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (autoTimestamp.checked) {
            timestampInput.value = Date.now();
        }

        const payload = Object.assign({}, currentPayload);

        try {
            // Numbers
            const numFields = [
                'wpm', 'rawWpm', 'charTotal', 'acc', 'timestamp', 'restartCount',
                'incompleteTestSeconds', 'keyOverlap', 'lastKeyToEnd', 'startToFirstKey',
                'consistency', 'wpmConsistency', 'keyConsistency', 'testDuration', 'afkDuration'
            ];
            numFields.forEach(f => payload[f] = Number(document.getElementById(f).value));

            // Strings
            const strFields = ['mode', 'mode2', 'language', 'difficulty', 'uid', 'hash'];
            strFields.forEach(f => payload[f] = document.getElementById(f).value);

            // Booleans
            const boolFields = ['punctuation', 'numbers', 'lazyMode', 'blindMode', 'bailedOut', 'stopOnLetter'];
            boolFields.forEach(f => payload[f] = document.getElementById(f).checked);

            // Arrays (comma separated)
            payload.charStats = document.getElementById('charStats').value.split(',').map(n => parseInt(n.trim(), 10));
            payload.keySpacing = document.getElementById('keySpacing').value.split(',').map(n => parseFloat(n.trim()));
            payload.keyDuration = document.getElementById('keyDuration').value.split(',').map(n => parseFloat(n.trim()));

            // JSON Objects / Arrays
            payload.incompleteTests = JSON.parse(document.getElementById('incompleteTests').value || '[]');
            payload.tags = JSON.parse(document.getElementById('tags').value || '[]');
            payload.funbox = JSON.parse(document.getElementById('funbox').value || '[]');
            payload.chartData = JSON.parse(document.getElementById('chartData').value || '{}');

            // Handle Hash Generation
            const autoHash = document.getElementById('autoHash');
            if (autoHash && autoHash.checked) {
                delete payload.hash; // Must remove hash field before generating hash
                const generatedHash = objectHash(payload);
                payload.hash = generatedHash;
                document.getElementById('hash').value = generatedHash; // Update UI
            } else {
                payload.hash = document.getElementById('hash').value;
            }

            const token = document.getElementById('token').value.trim();

            const requestBody = {
                token: token,
                payload: payload
            };

            responseContainer.style.display = 'block';
            responseBox.textContent = 'Sending request...';

            const res = await fetch('proxy.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            let resData;
            try {
                resData = await res.json();
            } catch (e) {
                resData = await res.text();
            }

            responseBox.textContent = JSON.stringify(resData, null, 2);

        } catch (err) {
            responseContainer.style.display = 'block';
            responseBox.textContent = 'Error building payload: ' + err.message + '\nCheck JSON formatting for arrays/objects.';
        }
    });

    // Initialize with current timestamp
    timestampInput.value = Date.now();
});