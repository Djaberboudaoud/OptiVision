const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, 'public');
let glbFiles = [];

walkDir(targetDir, function(filePath) {
  if (filePath.endsWith('.glb')) {
    glbFiles.push(filePath);
  }
});

console.log(`Found ${glbFiles.length} GLB models in public/ to compress...`);

for (const inputPath of glbFiles) {
    const outputPath = inputPath + '.temp.glb';
    
    console.log(`Compressing ${path.basename(inputPath)}...`);
    try {
        execSync(`npx -y gltf-pipeline -i "${inputPath}" -o "${outputPath}" -d`, { stdio: 'inherit' });
        
        const originalSize = fs.statSync(inputPath).size;
        const newSize = fs.statSync(outputPath).size;
        
        if (newSize < originalSize) {
            fs.copyFileSync(outputPath, inputPath);
            console.log(`Successfully compressed ${path.basename(inputPath)}: ${(originalSize/1024/1024).toFixed(2)}MB -> ${(newSize/1024/1024).toFixed(2)}MB`);
        } else {
            console.log(`Compression didn't help for ${path.basename(inputPath)}, keeping original`);
        }
        
        fs.unlinkSync(outputPath);
    } catch (e) {
        console.error(`Failed to compress ${path.basename(inputPath)}:`, e.message);
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    }
}

console.log('All done for public directory!');
