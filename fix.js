const fs = require('fs');
let c = fs.readFileSync('payload-generator/generator.js', 'utf8');
const p1 = c.indexOf('// Iterative bounded scaling to hit EXACT targetSum');
const p2 = c.indexOf('// Return rounded to 1 decimal place. We must handle the');
if (p1 !== -1 && p2 !== -1) {
    const newCode = `// Iterative bounded scaling to hit EXACT targetSum while preserving bucket bounds!
        let currentSum = gaps.reduce((a, b) => a + b, 0);
        let diff = targetSum - currentSum;
        let attempts = 0;
        
        while (Math.abs(diff) > 0.1 && attempts < 5000) {
            const add = diff > 0;
            const step = diff / gaps.length;
            
            for (let i = 0; i < gaps.length; i++) {
                const oldVal = gaps[i];
                let newVal = oldVal + (Math.abs(step) * (add ? 1 : -1) * (0.8 + Math.random() * 0.4));
                
                if (!add) {
                    if (oldVal >= 300) newVal = Math.max(300.1, newVal); 
                    else if (oldVal >= 80) newVal = Math.max(80.1, newVal); 
                    else newVal = Math.max(20.1, newVal); 
                } else {
                    if (oldVal < 80) newVal = Math.min(79.9, newVal);
                    else if (oldVal < 300) newVal = Math.min(299.9, newVal);
                }
                
                diff -= (newVal - oldVal);
                gaps[i] = newVal;
                if (Math.abs(diff) <= 0.1) break;
            }
            attempts++;
        }

        `;
    fs.writeFileSync('payload-generator/generator.js', c.substring(0, p1) + newCode + c.substring(p2));
    console.log('Fixed!');
} else {
    console.log('Markers not found', p1, p2);
}
