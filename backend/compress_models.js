const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'glasses_models');

const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'));

console.log(`Found ${files.length} models to compress with Draco...`);

for (const file of files) {
    const inputPath = path.join(modelsDir, file);
    const outputPath = path.join(modelsDir, 'compressed_' + file);
    
    console.log(`Compressing ${file}...`);
    try {
        // -d enables Draco compression, --draco.compressionLevel 7 is default and good
        execSync(`npx -y gltf-pipeline -i "${inputPath}" -o "${outputPath}" -d`, { stdio: 'inherit' });
        
        // Calculate size difference
        const originalSize = fs.statSync(inputPath).size;
        const newSize = fs.statSync(outputPath).size;
        
        if (newSize < originalSize) {
            // Replace original with compressed version
            fs.copyFileSync(outputPath, inputPath);
            console.log(`Successfully compressed ${file}: ${(originalSize/1024/1024).toFixed(2)}MB -> ${(newSize/1024/1024).toFixed(2)}MB`);
        } else {
            console.log(`Compression didn't help for ${file}, keeping original`);
        }
        
        // Clean up temp file
        fs.unlinkSync(outputPath);
    } catch (e) {
        console.error(`Failed to compress ${file}:`, e.message);
    }
}

console.log('All done!');
