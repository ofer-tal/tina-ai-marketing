/**
 * Test script for Feature #50: Context Window Management
 *
 * This script simulates a long conversation to verify:
 * 1. Conversations under 20 messages work normally
 * 2. Conversations over 30 messages trigger summarization
 * 3. AI maintains coherence after summarization
 * 4. No context loss errors occur
 */

import http from 'http';

const API_BASE = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Test messages that cover different topics
const testMessages = [
  "What is our current MRR?",
  "Tell me about our content strategy",
  "How are our ads performing?",
  "What about ASO keywords?",
  "Show me revenue trends",
  "What content performs best?",
  "Should we pause the ads?",
  "How are our keyword rankings?",
  "What's the subscriber growth?",
  "Which posts got the most views?",
  "What's our budget utilization?",
  "Any declining keywords?",
  "Show me the MRR trend again",
  "What about engagement rates?",
  "Can we optimize spend?",
  "Which categories work best?",
  "What's the CAC for ads?",
  "Should we reallocate budget?",
  "How's organic growth?",
  "What are the top priorities?",
  "Test message 21: revenue check",
  "Test message 22: content review",
  "Test message 23: budget status",
  "Test message 24: ASO update",
  "Test message 25: strategy check",
  "Test message 26: growth metrics",
  "Test message 27: performance review",
  "Test message 28: recommendations summary",
  "Test message 29: action items",
  "Test message 30: final check before summary",
  "Test message 31: THIS SHOULD TRIGGER SUMMARY",
  "Test message 32: verify context maintained"
];

async function runContextWindowTest() {
  console.log('=== Feature #50: Context Window Management Test ===\n');

  let conversationId = null;
  let summaryCreated = false;
  let summaryCreatedAt = null;

  console.log(`Sending ${testMessages.length} messages to test context window management...\n`);

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    const messageNum = i + 1;

    try {
      const requestData = { message };
      if (conversationId) {
        requestData.conversationId = conversationId;
      }

      const response = await makeRequest('/api/chat/message', requestData);

      if (response.success && response.conversationId) {
        conversationId = response.conversationId;

        // Check for context info
        if (response.contextInfo) {
          const { summaryCreated, messageCount, summarizedMessages, remainingMessages, summaryPoints } = response.contextInfo;

          if (summaryCreated) {
            if (!summaryCreatedAt) {
              summaryCreatedAt = messageNum;
              console.log(`✅ SUMMARY CREATED at message ${messageNum}!`);
              console.log(`   - Summarized ${summarizedMessages} messages`);
              console.log(`   - Kept ${remainingMessages} recent messages`);
              console.log(`   - Created ${summaryPoints} summary points\n`);
            }
          } else if (messageNum % 5 === 0) {
            console.log(`Message ${messageNum}: ${messageCount} messages in context (no summary yet)`);
          }
        }

        // Verify response is coherent
        if (response.response && response.response.content) {
          const content = response.response.content;
          const hasError = content.toLowerCase().includes('error') || content.toLowerCase().includes('sorry');

          if (hasError) {
            console.log(`⚠️  Warning: Message ${messageNum} response may indicate an issue`);
          }
        }
      } else {
        console.log(`❌ Error at message ${messageNum}:`, response);
      }
    } catch (error) {
      console.log(`❌ Exception at message ${messageNum}:`, error.message);
    }

    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=== Test Results ===');
  console.log(`Total messages sent: ${testMessages.length}`);
  console.log(`Summary created: ${summaryCreated ? '✅ YES' : '❌ NO'}`);
  console.log(`Summary created at: ${summaryCreatedAt || 'N/A'}`);
  console.log(`Final conversation ID: ${conversationId || 'N/A'}`);

  if (summaryCreatedAt) {
    console.log(`\n✅ SUCCESS: Context window management is working!`);
    console.log(`   Summary was created at message ${summaryCreatedAt} (expected around 30-31)`);
  } else if (testMessages.length < 30) {
    console.log(`\n⚠️  WARNING: Sent ${testMessages.length} messages but need 30+ to trigger summary`);
  } else {
    console.log(`\n❌ FAILURE: Summary should have been created by now`);
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
runContextWindowTest().catch(console.error);
