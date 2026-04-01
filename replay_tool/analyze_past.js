const fs = require('fs');
const lines = fs.readFileSync('./past-result.txt', 'utf8').split('\n').filter(l => l.trim().length > 0);
lines.forEach((l, i) => {
    const r = JSON.parse(l).result;
    console.log(`Test ${i}: Spacing len: ${r.keySpacing.length}, Duration len: ${r.keyDuration.length}, CharTotal: ${r.charTotal}, WPM: ${r.wpm}, chars: ${r.charStats.join(',')}, acc: ${r.acc}`);
    console.log(`Time sum: ${r.keySpacing.reduce((a, b) => a + b)}`);
    console.log(`chartData WPM len: ${r.chartData.wpm.length}`);
});