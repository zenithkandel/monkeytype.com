const fs = require('fs');
let c = fs.readFileSync('payload-generator/generator.js', 'utf8');

c = c.replace(
'if (wpmData.length > 0) wpmData[wpmData.length - 1] = Math.round((charStats[0] / 5) * (60 / testDuration) * 100) / 100;',
'if (wpmData.length > 0) { wpmData[wpmData.length - 1] = Math.round((charStats[0] / 5) * (60 / testDuration) * 100) / 100; console.log("DEBUG WPM:", wpmData[wpmData.length - 1]); }'
);

fs.writeFileSync('payload-generator/generator.js', c);
