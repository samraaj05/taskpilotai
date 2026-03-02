const { execSync } = require('child_process');
const fs = require('fs');
try {
    execSync('git push origin main');
    fs.writeFileSync('error.log', 'SUCCESS');
} catch (e) {
    let errStr = e.stderr ? e.stderr.toString() : e.message;
    fs.writeFileSync('error.log', errStr);
}
