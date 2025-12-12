/**
 * Debug script to see what HRD sends/receives
 */

const net = require('net');

const HRD_HOST = '127.0.0.1';
const HRD_PORT = 7809;

// Try different message formats
const testFormats = [
  // Format 1: Plain text with \r
  { name: 'Plain text + CR', data: Buffer.from('Get Frequency\r') },

  // Format 2: Plain text with \r\n
  { name: 'Plain text + CRLF', data: Buffer.from('Get Frequency\r\n') },

  // Format 3: Length-prefixed UTF-16LE
  { name: 'Length-prefix UTF16LE', data: (() => {
    const text = Buffer.from('Get Frequency', 'utf16le');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(text.length, 0);
    return Buffer.concat([len, text]);
  })() },

  // Format 4: Just the context message that HRD might expect
  { name: 'Context init', data: Buffer.from('HRD\r') },
];

let currentTest = 0;

function runTest() {
  if (currentTest >= testFormats.length) {
    console.log('\nAll tests complete');
    return;
  }

  const test = testFormats[currentTest];
  console.log(`\n========== Test ${currentTest + 1}: ${test.name} ==========`);
  console.log('Sending hex:', test.data.toString('hex'));
  console.log('Sending raw:', test.data.toString());

  const client = new net.Socket();
  let received = false;

  client.connect(HRD_PORT, HRD_HOST, () => {
    console.log('Connected, sending data...');
    client.write(test.data);
  });

  client.on('data', (data) => {
    received = true;
    console.log('\n--- Received response ---');
    console.log('Length:', data.length, 'bytes');
    console.log('Hex:', data.toString('hex'));
    console.log('Raw bytes:', [...data].map(b => b.toString(16).padStart(2, '0')).join(' '));
    console.log('UTF8:', JSON.stringify(data.toString('utf8')));
    console.log('UTF16LE:', JSON.stringify(data.toString('utf16le')));

    // Try to parse as length-prefixed
    if (data.length >= 4) {
      const len = data.readUInt32LE(0);
      console.log('First 4 bytes as UInt32LE (length?):', len);
      if (len > 0 && len < 10000 && data.length >= 4 + len) {
        console.log('Payload (UTF16LE):', JSON.stringify(data.slice(4, 4 + len).toString('utf16le')));
        console.log('Payload (UTF8):', JSON.stringify(data.slice(4, 4 + len).toString('utf8')));
      }
    }
    console.log('-------------------------');

    client.destroy();
  });

  client.on('error', (err) => {
    console.error('Error:', err.message);
  });

  client.on('close', () => {
    console.log('Connection closed');
    if (!received) {
      console.log('No response received');
    }
    currentTest++;
    setTimeout(runTest, 1000);
  });

  // Timeout for this test
  setTimeout(() => {
    if (!received) {
      console.log('Timeout - no response after 3 seconds');
      client.destroy();
    }
  }, 3000);
}

runTest();
