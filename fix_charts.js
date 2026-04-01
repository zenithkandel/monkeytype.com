const fs = require('fs');
let c = fs.readFileSync('payload-generator/generator.js', 'utf8');

c = c.replace(/generateChartWpm\([\s\S]*?generateChartBurst\([\s\S]*?generateChartErrors\([\s\S]*?return errors;\n    }/, `
    generateChartData(keySpacing, startToFirstKey, testDuration, targetAcc) {
        const wpmData = [];
        const burstData = [];
        const errData = [];
        const numSeconds = Math.ceil(testDuration);
        
        let currentTime = startToFirstKey;
        let spacingIndex = 0;
        let totalKeys = 0;
        
        for (let s = 1; s <= numSeconds; s++) {
            let targetTime = s * 1000;
            let keysThisSec = 0;
            
            // The first key itself (if we are in the first second and it falls under targetTime)
            if (s === 1 && currentTime <= targetTime) {
                keysThisSec++;
                totalKeys++;
            }
            
            while (spacingIndex < keySpacing.length && (currentTime + keySpacing[spacingIndex]) <= targetTime) {
                currentTime += keySpacing[spacingIndex];
                keysThisSec++;
                totalKeys++;
                spacingIndex++;
            }
            
            // Advance time if we didn't process any keys to avoid getting stuck (meaning pause crosses a second boundary)
            // But we don't actually advance currentTime here, we just let targetTime move to the next second boundary
            
            burstData.push(Math.round((keysThisSec / 5) * 60));
            errData.push(0); // assuming 100% acc for now as in current generator
            
            let wpm = (totalKeys / 5) * (60 / s);
            wpmData.push(Math.round(wpm * 100) / 100);
        }
        
        // At the very end of the test (if the test ended precisely but there are leftover fractional times)
        // Ensure the last WPM entry strictly matches the absolute exact WPM
        if (wpmData.length > 0) {
            let finalTime = (startToFirstKey + keySpacing.reduce((a,b)=>a+b,0)) / 1000;
            // If the total test duration is exact, the last data point becomes normalized
            wpmData[wpmData.length - 1] = Math.round(((totalKeys / 5) * (60 / testDuration)) * 100) / 100;
            
            // Adjust last burst if last second is partial (e.g. 15s exact means s=15 is whole. But if it was 15.4s, etc)
            let timescale = 1 / (testDuration % 1 === 0 ? 1 : testDuration % 1);
            burstData[burstData.length - 1] = Math.round(burstData[burstData.length - 1] * timescale);
        }

        return { wpmData, burstData, errData };
    }`);

c = c.replace(/const chartWpm = this\.generateChartWpm\(targetWpm, testDuration\);\s*const chartBurst = this\.generateChartBurst\(targetWpm, testDuration\);\s*const chartErr = this\.generateChartErrors\(testDuration, targetAcc\);/, `
        const { wpmData: chartWpm, burstData: chartBurst, errData: chartErr } = this.generateChartData(keySpacing, startToFirstKey, testDuration, targetAcc);
`);

fs.writeFileSync('payload-generator/generator.js', c);
console.log('Fixed charts!');
