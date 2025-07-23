// Script to fetch GPT-2 compression step-by-step data for GPT2CompressionWidget default text
// This generates the detailed memoized results with step-by-step token analysis

const { EventSource } = require('eventsource');
const fs = require('fs');
const path = require('path');

const DEFAULT_TEXT = "Language models can compress text by predicting the next token";
const API_URL = "https://vaclavrozhon-probabilistic-lenses-widgets.hf.space";

async function callGPT2CompressionAPI(text) {
    const sessionHash = Math.random().toString(36).substring(2, 12);
    
    try {
        console.log(`Calling GPT-2 compression API for: "${text}"`);
        
        // Join the queue
        const queueResponse = await fetch(
            `${API_URL}/queue/join`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: [text],
                    event_data: null,
                    fn_index: 7,  // GPT2 Compression tab (actual working index from widget)
                    session_hash: sessionHash
                })
            }
        );
        
        if (!queueResponse.ok) {
            throw new Error(`Queue join failed: ${queueResponse.status}`);
        }
        
        // Use EventSource to get results
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(
                `${API_URL}/queue/data?session_hash=${sessionHash}`
            );
            
            const timeout = setTimeout(() => {
                eventSource.close();
                reject(new Error('API processing timeout'));
            }, 60000); // 60 second timeout
              
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.msg === 'process_completed') {
                        clearTimeout(timeout);
                        eventSource.close();
                        
                        console.log('GPT2 API response received');
                        
                        if (data.output && data.output.data) {
                            const resultData = data.output.data[0];
                            
                            // Check if it's already an object or needs parsing
                            let parsedData;
                            if (typeof resultData === 'string') {
                                try {
                                    parsedData = JSON.parse(resultData);
                                } catch (parseError) {
                                    console.error('Failed to parse JSON:', parseError, 'Raw:', resultData);
                                    reject(new Error('Failed to parse response'));
                                    return;
                                }
                            } else {
                                parsedData = resultData;
                            }
                            
                            resolve(parsedData);
                        } else {
                            console.error('No output data in response:', JSON.stringify(data, null, 2));
                            reject(new Error('No output data'));
                        }
                    } else if (data.msg === 'process_errored') {
                        clearTimeout(timeout);
                        eventSource.close();
                        console.error('API processing error:', JSON.stringify(data, null, 2));
                        reject(new Error('API processing error'));
                    }
                } catch (e) {
                    // Continue listening for more events
                }
            };
            
            eventSource.onerror = (error) => {
                clearTimeout(timeout);
                eventSource.close();
                reject(new Error('EventSource error'));
            };
        });
    } catch (err) {
        console.error('API call failed:', err);
        throw new Error(`Failed to connect to compression API: ${err}`);
    }
}

// Main execution
(async () => {
    try {
        console.log(`Fetching GPT-2 compression data for: "${DEFAULT_TEXT}"`);
        console.log(`Text length: ${DEFAULT_TEXT.length} characters`);
        
        const result = await callGPT2CompressionAPI(DEFAULT_TEXT);
        
        if (result && result.success) {
            // Save to the correct location for GPT2CompressionWidget
            const outputPath = path.join(__dirname, '../public/data/compression_visualization/default.json');
            
            // Ensure directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
            
            console.log(`\nResults saved to: ${outputPath}`);
            console.log(`Original text: "${result.original_text}"`);
            console.log(`Tokens: ${result.tokens.length}`);
            console.log(`Steps: ${result.steps.length}`);
            console.log(`Total bits: ${result.total_bits}`);
            console.log(`Original bits: ${result.original_bits}`);
            console.log(`Compression ratio: ${result.compression_ratio.toFixed(3)}`);
            
            console.log('\n✅ GPT2CompressionWidget memoization data updated!');
        } else {
            console.error('API returned unsuccessful result:', result);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();