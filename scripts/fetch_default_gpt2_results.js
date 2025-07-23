// Script to fetch GPT-2 compression results for the default text from HuggingFace API
// This will generate the memoized results we need

const { EventSource } = require('eventsource');
const DEFAULT_TEXT = "Language models can compress text by predicting the next token";

async function callGPT2Compression(text) {
    try {
        console.log('Calling GPT-2 API with text:', text);
        
        const sessionHash = Math.random().toString(36).substring(2);
        
        // Join the queue
        const queueResponse = await fetch(
            'https://vaclavrozhon-probabilistic-lenses-widgets.hf.space/queue/join',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: [text],
                    event_data: null,
                    fn_index: 0,        // Compression Analysis tab (first interface)
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
                `https://vaclavrozhon-probabilistic-lenses-widgets.hf.space/queue/data?session_hash=${sessionHash}`
            );
            
            const timeout = setTimeout(() => {
                eventSource.close();
                reject(new Error('GPT-2 processing timeout'));
            }, 120000);  // 2 minutes timeout
              
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.msg === 'process_completed') {
                        clearTimeout(timeout);
                        eventSource.close();
                        
                        if (data.output && data.output.data) {
                            const compressionData = data.output.data[0];
                            
                            // Parse the result
                            let parsedData;
                            if (typeof compressionData === 'string') {
                                parsedData = JSON.parse(compressionData);
                            } else {
                                parsedData = compressionData;
                            }
                            
                            if (parsedData.error) {
                                reject(new Error(`GPT-2 compression failed: ${parsedData.error}`));
                            } else if (parsedData.algorithm && parsedData.bits && parsedData.ratio) {
                                resolve({
                                    algorithm: parsedData.algorithm,
                                    bits: parsedData.bits,
                                    ratio: parsedData.ratio,
                                    compression_progression: parsedData.compression_progression || []
                                });
                            } else {
                                reject(new Error('Invalid data format'));
                            }
                        } else {
                            reject(new Error('No output data'));
                        }
                    }
                } catch (e) {
                    // Continue listening
                }
            };
            
            eventSource.onerror = () => {
                clearTimeout(timeout);
                eventSource.close();
                reject(new Error('EventSource error'));
            };
        });
        
    } catch (error) {
        console.error('Failed to call GPT-2 API:', error);
        throw error;
    }
}

// Main execution
(async () => {
    console.log(`Fetching GPT-2 compression for default text: "${DEFAULT_TEXT}"`);
    console.log(`Text length: ${DEFAULT_TEXT.length} characters`);
    
    try {
        const result = await callGPT2Compression(DEFAULT_TEXT);
        
        // Save to file
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, '../public/compression_experiments/gpt2_default_memoized.json');
        
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        
        console.log(`\nResults saved to: ${outputPath}`);
        console.log(`Algorithm: ${result.algorithm}`);
        console.log(`Total bits: ${result.bits}`);
        console.log(`Compression ratio: ${result.ratio}`);
        console.log(`Progression data points: ${result.compression_progression.length}`);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();