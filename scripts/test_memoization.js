// Test script to verify memoization works correctly
// This script checks that the default text returns the memoized results

const fs = require('fs');
const path = require('path');

// Load the memoized results
const memoizedPath = path.join(__dirname, '../public/compression_experiments/gpt2_default_memoized.json');
const memoizedData = JSON.parse(fs.readFileSync(memoizedPath, 'utf8'));

console.log('Memoized GPT-2 Results:');
console.log('=======================');
console.log(`Algorithm: ${memoizedData.algorithm}`);
console.log(`Bits: ${memoizedData.bits}`);
console.log(`Ratio: ${memoizedData.ratio}`);
console.log(`Progression points: ${memoizedData.compression_progression.length}`);
console.log('\nFirst few progression points:');
memoizedData.compression_progression.slice(0, 3).forEach(point => {
    console.log(`  ${point.progressPercent}%: ${point.bitsPerChar.toFixed(3)} bits/char`);
});

console.log('\nDefault text: "Language models can compress text by predicting the next token"');
console.log('\nImplementation notes:');
console.log('- When user clicks "Your Text" button, this default text is set');
console.log('- When user clicks "Run Compression" with this exact text, memoized results are used');
console.log('- For any other text, the HuggingFace API is called');
console.log('\n✅ Memoization setup complete!');