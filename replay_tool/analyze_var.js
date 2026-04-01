const fs = require('fs');
const txt = fs.readFileSync('./past-result.txt', 'utf8');
const lines = txt.split('\n').filter(l => l.trim().length > 0);

function stdDev(array) { const meanValue = array.reduce((a, b) => a + b, 0) / array.length; return Math.sqrt(array.map(x => Math.pow(x - meanValue, 2)).reduce((a, b) => a + b) / array.length); }
function mean(array) { return array.reduce((a, b) => a + b, 0) / array.length; }

for (let i = 0; i < lines.length; i++) {
    const matchObj = lines[i].match(/"keySpacing":\[(.*?)\]/);
    if (!matchObj) continue;
    const ks = matchObj[1].split(',').map(Number).filter(n => !isNaN(n));

    const covK = stdDev(ks) / mean(ks);
    console.log(`Test ${i} keySpacing Mean: ${mean(ks).toFixed(2)}, StdDev: ${stdDev(ks).toFixed(2)}, COV: ${covK.toFixed(3)}`);
}
