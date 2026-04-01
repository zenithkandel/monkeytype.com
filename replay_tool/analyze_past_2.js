const fs = require('fs');
const lines = fs.readFileSync('./past-result.txt', 'utf8').split('\n').filter(l => l.trim().length > 0);
lines.forEach((l, i) => {
    try {
        if(!l.endsWith('}')) {
          // Attempt to fix broken json
          let fixed = l.substring(0, l.lastIndexOf(']')) + ']}"}}';
          try {
             JSON.parse(fixed); // test
             l = fixed;
          } catch(e) {}
        }
        const obj = JSON.parse(l);
        if(!obj || !obj.result) return;
        const r = obj.result;
        console.log(`\n--- Test ${i} ---`);
        console.log(`WPM: ${r.wpm}, rawWpm: ${r.rawWpm}, charTotal: ${r.charTotal}`);
        console.log(`charStats: [${r.charStats.join(', ')}]`);
        console.log(`acc: ${r.acc}`);
        console.log(`keySpacing len: ${r.keySpacing?.length}, keyDuration len: ${r.keyDuration?.length}`);
        if(r.keySpacing) console.log(`Time sum (spacing): ${r.keySpacing.reduce((a,b)=>a+b).toFixed(2)}`);
        console.log(`consistency: ${r.consistency}, wpmCons: ${r.wpmConsistency}, keyCons: ${r.keyConsistency}`);
    } catch(e) {
        console.error(`Failed parsing line ${i}: ${e.message}`);
    }
});