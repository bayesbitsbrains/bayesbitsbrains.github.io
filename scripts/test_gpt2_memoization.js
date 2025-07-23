// Test script to verify GPT2CompressionWidget memoization works correctly

const fs = require('fs');
const path = require('path');

console.log('Testing GPT2CompressionWidget Memoization');
console.log('=========================================');

// Check if the memoized data file exists
const dataPath = path.join(__dirname, '../public/data/compression_visualization/default.json');
if (!fs.existsSync(dataPath)) {
    console.error('❌ Memoized data file not found at:', dataPath);
    process.exit(1);
}

// Load and validate the memoized data
let memoizedData;
try {
    memoizedData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log('✅ Memoized data file loaded successfully');
} catch (error) {
    console.error('❌ Failed to parse memoized data:', error);
    process.exit(1);
}

// Validate data structure
const requiredFields = ['original_text', 'tokens', 'steps', 'total_bits', 'original_bits', 'compression_ratio', 'success'];
for (const field of requiredFields) {
    if (!(field in memoizedData)) {
        console.error(`❌ Missing required field: ${field}`);
        process.exit(1);
    }
}
console.log('✅ All required fields present');

// Check the default text matches
const expectedText = "Language models can compress text by predicting the next token";
if (memoizedData.original_text !== expectedText) {
    console.error(`❌ Text mismatch. Expected: "${expectedText}", Got: "${memoizedData.original_text}"`);
    process.exit(1);
}
console.log('✅ Default text matches expected value');

// Validate steps structure
if (!Array.isArray(memoizedData.steps) || memoizedData.steps.length === 0) {
    console.error('❌ Steps should be a non-empty array');
    process.exit(1);
}

// Check first step structure
const firstStep = memoizedData.steps[0];
const requiredStepFields = ['step_number', 'token', 'token_id', 'context_tokens', 'top_predictions', 'actual_probability', 'shannon_code_length'];
for (const field of requiredStepFields) {
    if (!(field in firstStep)) {
        console.error(`❌ Missing required step field: ${field}`);
        process.exit(1);
    }
}
console.log('✅ Step structure is valid');

// Summary
console.log('\nMemoization Summary:');
console.log('===================');
console.log(`Text: "${memoizedData.original_text}"`);
console.log(`Tokens: ${memoizedData.tokens.length}`);
console.log(`Steps: ${memoizedData.steps.length}`);
console.log(`Total bits: ${memoizedData.total_bits}`);
console.log(`Original bits: ${memoizedData.original_bits}`);
console.log(`Compression ratio: ${memoizedData.compression_ratio.toFixed(3)}`);
console.log(`Success: ${memoizedData.success}`);

console.log('\nHow memoization works in GPT2CompressionWidget:');
console.log('================================================');
console.log('1. When widget loads, it fetches /data/compression_visualization/default.json');
console.log('2. When user clicks RUN with the default text, memoized results are loaded instantly');
console.log('3. For any other text, the HuggingFace API is called');
console.log('4. Users see no difference - memoization is completely transparent');

console.log('\n✅ GPT2CompressionWidget memoization test completed successfully!');