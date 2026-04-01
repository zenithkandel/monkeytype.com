const fs = require('fs');
let c = fs.readFileSync('payload-generator/generator.js', 'utf8');

const regex = /generateChartWpm[\s\S]*?generateChartErrors[\s\S]*?(?=kogasa)/;
let newFunc = \    generateChartData(keySpacing, startToFirstKey, testDuration, targetAcc) {
        let wpmData = [];
        let burstData = [];
        let errData = [];
        
        let absoluteTimes = [];
        let currentAbs = startToFirstKey;
        absoluteTimes.push(currentAbs);
        for(const gap of keySpacing) {
            currentAbs += gap;
            absoluteTimes.push(currentAbs);
        }
        
        let totalTimeSec = testDuration;
        let numSeconds = Math.ceil(totalTimeSec);
        
        let keysProcessed = 0;
        
        for (let s = 1; s <= numSeconds; s++) {
            let startSec = (s - 1) * 1000;
            let endSec = s * 1000;
            let isLastBucket = (s === numSeconds && totalTimeSec % 1 !== 0);
            
            if(isLastBucket) {
                endSec = totalTimeSec * 1000;
            }
            
            let keysInBucket = 0;
            while(keysProcessed < absoluteTimes.length && absoluteTimes[keysProcessed] <= endSec) {
                keysInBucket++;
                keysProcessed++;
            }
            
            let bucketDuration = isLastBucket ? totalTimeSec - (s - 1) : 1;
            
            let burst = Math.round((keysInBucket / 5) * (60 / bucketDuration));
            burstData.push(burst);
            
            let wpmElapsed = isLastBucket ? totalTimeSec : s;
            let currentWpm = Math.round((keysProcessed / 5) * (60 / wpmElapsed) * 100) / 100;
            wpmData.push(currentWpm);
            
            errData.push(0);
        }
        
        return { wpmData, burstData, errData };
    }\n\n    \;

if(regex.test(c)){
    let newC = c.replace(regex, newFunc);
    fs.writeFileSync('payload-generator/generator.js', newC);
    console.log('Fixed exactly!');
} else {
    console.log('Regex fail');
}

