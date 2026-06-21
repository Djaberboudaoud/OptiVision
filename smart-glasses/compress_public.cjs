const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findGlbFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findGlbFiles(fullPath, results);
    } else if (entry.name.endsWith('.glb') && !entry.name.includes('.temp.')) {
      results.push(fullPath);
    }
  }
  return results;
}

const publicDir = path.join(__dirname, 'public');
const glbFiles = findGlbFiles(publicDir);

console.log(`Found ${glbFiles.length} GLB models to compress with Draco...`);
console.log('');

let totalOriginal = 0;
let totalCompressed = 0;
let compressed = 0;
let skipped = 0;
let failed = 0;

for (const inputPath of glbFiles) {
  const originalSize = fs.statSync(inputPath).size;
  const sizeMB = (originalSize / 1024 / 1024).toFixed(2);
  const relPath = path.relative(publicDir, inputPath);
  
  // Skip files that are already small (likely already compressed)
  if (originalSize < 500 * 1024) { // under 500KB — probably already compressed
    console.log(`SKIP ${relPath} (${sizeMB}MB — already small)`);
    skipped++;
    totalOriginal += originalSize;
    totalCompressed += originalSize;
    continue;
  }

  const tempPath = inputPath + '.draco.glb';
  
  console.log(`Compressing ${relPath} (${sizeMB}MB)...`);
  try {
    execSync(`npx -y gltf-pipeline -i "${inputPath}" -o "${tempPath}" -d`, {
      stdio: 'pipe',
      timeout: 60000, // 60s timeout per file
    });
    
    const newSize = fs.statSync(tempPath).size;
    const newSizeMB = (newSize / 1024 / 1024).toFixed(2);
    
    if (newSize < originalSize) {
      fs.copyFileSync(tempPath, inputPath);
      const reduction = ((1 - newSize / originalSize) * 100).toFixed(0);
      console.log(`  ✓ ${sizeMB}MB → ${newSizeMB}MB (${reduction}% smaller)`);
      totalOriginal += originalSize;
      totalCompressed += newSize;
      compressed++;
    } else {
      console.log(`  — No improvement, keeping original`);
      totalOriginal += originalSize;
      totalCompressed += originalSize;
      skipped++;
    }
    
    // Clean up temp file
    try { fs.unlinkSync(tempPath); } catch(e) {}
  } catch (e) {
    console.log(`  ✗ FAILED: ${e.message}`);
    try { fs.unlinkSync(tempPath); } catch(e2) {}
    totalOriginal += originalSize;
    totalCompressed += originalSize;
    failed++;
  }
}

console.log('');
console.log('═══════════════════════════════════════');
console.log(`Total: ${glbFiles.length} files`);
console.log(`  Compressed: ${compressed}`);
console.log(`  Skipped:    ${skipped}`);
console.log(`  Failed:     ${failed}`);
console.log(`  Before: ${(totalOriginal / 1024 / 1024).toFixed(1)}MB`);
console.log(`  After:  ${(totalCompressed / 1024 / 1024).toFixed(1)}MB`);
console.log(`  Saved:  ${((totalOriginal - totalCompressed) / 1024 / 1024).toFixed(1)}MB (${((1 - totalCompressed / totalOriginal) * 100).toFixed(0)}%)`);
console.log('═══════════════════════════════════════');
console.log('Done!');
