// Monkeytype All-In-One Application State

// IMPORTANT: Override generator.js's auto-run function to prevent it from
// crashing since it expects UI elements that only exist in its own directory
window.generatePayload = function() {
    console.log("Suppressed generator.js original auto-run function.");
};

// App State
const App = {
  payload: null,
  acAnalyzer: new AnticheatAnalyzer()
};

// DOM Elements
const UI = {};

document.addEventListener('DOMContentLoaded', () => {
  UI.btnGenerate = document.getElementById('btnGenerate');
  UI.btnProceedSend = document.getElementById('btnProceedSend');
  UI.btnSend = document.getElementById('btnSend');
  UI.btnViewPayload = document.getElementById('btnViewPayload');
  
  UI.step2 = document.getElementById('step2');
  UI.step3 = document.getElementById('step3');
  UI.analysisResult = document.getElementById('analysisResult');
  UI.acScore = document.getElementById('acScore');
  UI.payloadOutput = document.getElementById('payloadOutput');
  UI.serverOutput = document.getElementById('serverOutput');

  // Step 1: Generate Payload
  UI.btnGenerate.addEventListener('click', () => {
    const config = {
      targetWpm: parseFloat(document.getElementById('targetWpm').value) || 95,
      testDuration: parseInt(document.getElementById('testDuration').value) || 15,
      mode: 'time',
      targetAcc: parseFloat(document.getElementById('targetAcc').value) || 96,
      language: document.getElementById('targetLang').value || 'english',
      uid: document.getElementById('uid').value || '',
      punctuation: false,
      numbers: false
    };

    // Call generator logic natively
    const generatorInstance = new HumanTypingGenerator();
    const { result } = generatorInstance.generate(config);
    
    // Hash exactly like the real CLI does, mimicking the server
    if (typeof objectHash !== 'undefined') {
        const toHash = { ...result };
        delete toHash.hash;
        result.hash = objectHash(toHash);
    }
    
    App.payload = result;

    // Enable Step 2
    UI.step2.style.opacity = 1;
    UI.step2.style.pointerEvents = 'auto';
    UI.analysisResult.classList.remove('hidden');

    // Run Analysis Against Offline Anticheat
    const analysis = App.acAnalyzer.analyze({ result }); 
    
    // Update DOM
    if (analysis.verdict === 'LIKELY BOT' || analysis.score < 50) {
      UI.acScore.innerHTML = '🚨 FAILED (BOT DETECTED) 🚨';
      UI.acScore.className = 'anticheat-score score-fail';
      UI.btnProceedSend.innerHTML = 'Send Anyway (Insta-Ban Warning) &rarr;';
      UI.btnProceedSend.style.background = '#ca4754';
    } else {
      UI.acScore.innerHTML = `✅ PASSED (${analysis.verdict}) ✅`;
      UI.acScore.className = 'anticheat-score score-pass';
      UI.btnProceedSend.innerHTML = 'Looks Good! Proceed to Sender &rarr;';
      UI.btnProceedSend.style.background = '#e2b714';
    }

    // Load statistics safely mapping the correct object structure
    document.getElementById('av-wpm').innerText = (analysis.stats.wpm || result.wpm).toFixed(2);
    document.getElementById('av-cons').innerText = (analysis.stats.consistency || result.consistency).toFixed(2) + '%';
    document.getElementById('av-cv').innerText = analysis.stats.spacingCV ? analysis.stats.spacingCV.toFixed(3) : 'N/A';
    document.getElementById('av-flags').innerText = analysis.flags ? analysis.flags.length : 0;
    
    UI.payloadOutput.innerText = JSON.stringify(result, null, 2);
    
    // Jump to Step 2
    UI.step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // View Payload Toggle
  UI.btnViewPayload.addEventListener('click', () => {
    const p = UI.payloadOutput;
    const isHidden = p.style.display !== 'block';
    p.style.display = isHidden ? 'block' : 'none';
    UI.btnViewPayload.innerText = isHidden ? 'Hide JSON Payload' : 'Show JSON Payload';
  });

  // Step 2 -> Step 3
  UI.btnProceedSend.addEventListener('click', () => {
    UI.step3.style.opacity = 1;
    UI.step3.style.pointerEvents = 'auto';
    UI.btnSend.disabled = false;
    
    // Jump and focus token
    UI.step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const tokenInput = document.getElementById('tokenInput');
    if(!tokenInput.value) tokenInput.focus();
  });

  // Step 3 (Send Post via proxy.php)
  UI.btnSend.addEventListener('click', async () => {
    if (!App.payload) return alert('No payload available. Please generate first.');
    const token = document.getElementById('tokenInput').value.trim();
    if (!token) return alert('Cannot send without an Authorization bearer token!');

    UI.btnSend.disabled = true;
    UI.btnSend.innerHTML = 'Connecting to Proxy...';

    UI.serverOutput.style.display = 'block';
    UI.serverOutput.className = 'result-box'; // Reset bounds
    UI.serverOutput.innerText = 'Transmitting POST query directly to proxy.php wrapper...';

    try {
      const response = await fetch('../replay_tool/proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, payload: App.payload })
      });
      
      const data = await response.text();
      
      UI.serverOutput.innerHTML = `HTTP Status: <b>${response.status}</b>\n\nResponse:\n${data}`;
      
      if (response.status >= 200 && response.status < 300 && !data.includes('"error"')) {
        UI.serverOutput.classList.add('server-success');
        UI.btnSend.innerHTML = 'Success!';
      } else {
        UI.serverOutput.classList.add('server-error');
        UI.btnSend.innerHTML = 'Rejected!';
      }
    } catch (e) {
      UI.serverOutput.innerText = `Network Error: ${e.message}`;
      UI.serverOutput.classList.add('server-error');
      UI.btnSend.innerHTML = 'Network Error!';
    } finally {
      setTimeout(() => {
        UI.btnSend.disabled = false;
        UI.btnSend.innerHTML = 'Simulate Request to Monkeytype';
      }, 3000);
    }
  });

});
