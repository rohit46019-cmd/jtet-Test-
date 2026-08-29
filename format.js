const fs = require('fs');
const content = fs.readFileSync('components/FileUpload.tsx', 'utf8');
// just write it back as is to see if it fixes line endings, or use prettier
