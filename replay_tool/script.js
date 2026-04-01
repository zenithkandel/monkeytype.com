document.addEventListener('DOMContentLoaded', () => {
    const jsonFileInput = document.getElementById('jsonFile');
    const missingFieldsMsg = document.getElementById('missingFieldsMsg');
    const form = document.getElementById('replayForm');
    const btnNow = document.getElementById('btnNow');
    const autoTimestamp = document.getElementById('autoTimestamp');
    const timestampInput = document.getElementById('timestamp');
    const responseContainer = document.getElementById('responseContainer');
    const responseBox = document.getElementById('responseBox');

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

    // Handle JSON Load
    jsonFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                const result = data.result || data; // Handle if wrapped in 'result'
                populateForm(result);
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    });

    let currentPayload = {};

    function populateForm(data) {
        currentPayload = Object.assign({}, data);
        const missing = [];

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
        });

        if (missing.length > 0) {
            missingFieldsMsg.style.display = 'block';
            missingFieldsMsg.textContent = `Missing fields in JSON (please fill manually): ${missing.join(', ')}`;
        } else {
            missingFieldsMsg.style.display = 'none';
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