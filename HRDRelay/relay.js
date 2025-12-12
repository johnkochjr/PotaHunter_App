/**
 * HRD Relay Server
 *
 * This relay accepts HTTP requests from the PotaHunter app
 * and forwards commands to Ham Radio Deluxe via TCP.
 *
 * HRD Protocol v5:
 * - 16-byte header: size (4), magic1 (4), magic2 (4), checksum (4)
 * - Payload: UTF-16LE encoded command + NUL terminator
 * - Optional "[0] " context prefix
 *
 * Usage: node relay.js [http-port] [hrd-port]
 * Default: node relay.js 7810 7809
 */

const http = require('http');
const net = require('net');
const dgram = require('dgram');

// Configuration
const HTTP_PORT = parseInt(process.argv[2]) || 7810;
const HRD_HOST = '127.0.0.1';
const HRD_PORT = parseInt(process.argv[3]) || 7809;
const HRD_LOGBOOK_PORT = 2333;  // HRD Logbook UDP9/ADIF port (like WSJT-X)

// HRD Protocol constants
const MAGIC1 = 0x1234ABCD
const MAGIC2 = 0xABCD1234;

// Build HRD v5 protocol frame
function buildHRDFrame(command, prependContext = false) {
  // Build payload: optional "[0] " prefix, then command, then NUL; UTF-16LE encoding
  const payloadText = (prependContext ? '[0] ' + command : command) + '\x00';
  const payload = Buffer.from(payloadText, 'utf16le');

  // Header: size (total frame), magic1, magic2, checksum (0)
  const size = 16 + payload.length;
  const header = Buffer.alloc(16);
  header.writeUInt32LE(size, 0);
  header.writeUInt32LE(MAGIC1 >>> 0, 4);  // >>> 0 ensures unsigned
  header.writeUInt32LE(MAGIC2 >>> 0, 8);
  header.writeUInt32LE(0, 12);  // checksum = 0

  return Buffer.concat([header, payload]);
}

// Parse HRD v5 response
function parseHRDResponse(buffer) {
  if (buffer.length < 16) {
    return { error: 'Response too short', data: null };
  }

  const size = buffer.readUInt32LE(0);
  const magic1 = buffer.readUInt32LE(4);
  const magic2 = buffer.readUInt32LE(8);
  // const checksum = buffer.readUInt32LE(12);

  // Verify magic numbers
  if ((magic1 >>> 0) !== (MAGIC1 >>> 0) || (magic2 >>> 0) !== (MAGIC2 >>> 0)) {
    return { error: 'Magic mismatch', data: null };
  }

  if (buffer.length < size) {
    return { error: 'Incomplete response', data: null };
  }

  // Extract payload (after 16-byte header)
  const payload = buffer.slice(16, size);
  let text = payload.toString('utf16le');

  // Trim at first NUL
  const nulIndex = text.indexOf('\x00');
  if (nulIndex >= 0) {
    text = text.substring(0, nulIndex);
  }

  return { error: null, data: text };
}

// Read complete HRD response (header + payload) from socket
function readHRDResponse(socket, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    let timeoutHandle;

    const onData = (data) => {
      buffer = Buffer.concat([buffer, data]);

      // Need at least 16 bytes for header
      if (buffer.length >= 16) {
        const expectedSize = buffer.readUInt32LE(0);
        console.log(`[HRD] Buffer: ${buffer.length} bytes, expected total: ${expectedSize}`);

        // Check if we have the complete response
        if (buffer.length >= expectedSize) {
          cleanup();
          resolve(buffer.slice(0, expectedSize));
        }
      }
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    const onClose = () => {
      cleanup();
      if (buffer.length >= 16) {
        const expectedSize = buffer.readUInt32LE(0);
        if (buffer.length >= expectedSize) {
          resolve(buffer.slice(0, expectedSize));
          return;
        }
      }
      reject(new Error('Connection closed before receiving all data'));
    };

    const cleanup = () => {
      clearTimeout(timeoutHandle);
      socket.removeListener('data', onData);
      socket.removeListener('error', onError);
      socket.removeListener('close', onClose);
    };

    timeoutHandle = setTimeout(() => {
      cleanup();
      console.log(`[HRD] Timeout with ${buffer.length} bytes in buffer`);
      reject(new Error('Read timeout'));
    }, timeout);

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
}

// Build ADIF record for HRD Logbook
function buildADIFRecord(qsoData) {
  const {
    callsign,
    frequency,  // in kHz
    mode,
    rstSent,
    rstReceived,
    comment,
    parkReference,
    myCallsign,
  } = qsoData;

  // Get current UTC time
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');  // YYYYMMDD
  // TIME_ON needs to be HHMMSS format (6 digits)
  const hours = now.getUTCHours().toString().padStart(2, '0');
  const minutes = now.getUTCMinutes().toString().padStart(2, '0');
  const seconds = now.getUTCSeconds().toString().padStart(2, '0');
  const timeStr = hours + minutes + seconds;

  // Convert frequency from kHz to MHz for ADIF
  const freqMHz = (parseFloat(frequency) / 1000).toFixed(6);

  // Build ADIF fields
  let adif = '';

  const addField = (name, value) => {
    if (value) {
      adif += `<${name}:${value.length}>${value}`;
    }
  };

  addField('CALL', callsign);
  addField('QSO_DATE', dateStr);
  addField('TIME_ON', timeStr);
  addField('TIME_OFF', timeStr);  // Same as TIME_ON for quick QSOs
  addField('FREQ', freqMHz);
  addField('MODE', mode);
  addField('RST_SENT', rstSent);
  addField('RST_RCVD', rstReceived);

  // Add station callsign (operator)
  if (myCallsign) {
    addField('STATION_CALLSIGN', myCallsign);
    addField('OPERATOR', myCallsign);
  }

  // Add POTA reference as SIG_INFO
  if (parkReference) {
    addField('SIG', 'POTA');
    addField('SIG_INFO', parkReference);
  }

  // Add comment
  if (comment) {
    addField('COMMENT', comment);
  }

  // End of record
  adif += '<EOR>';

  return adif;
}

// Send QSO log to HRD Logbook via UDP
function sendToHRDLogbook(adifRecord) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const message = Buffer.from(adifRecord, 'utf8');

    console.log(`[Logbook] Sending ADIF: ${adifRecord}`);

    client.send(message, HRD_LOGBOOK_PORT, HRD_HOST, (err) => {
      client.close();
      if (err) {
        console.error(`[Logbook] Error: ${err.message}`);
        reject(err);
      } else {
        console.log(`[Logbook] ADIF sent successfully`);
        resolve();
      }
    });
  });
}

// Send command to HRD and get response
async function sendToHRD(command, prependContext = false) {
  return new Promise(async (resolve, reject) => {
    const client = new net.Socket();

    client.connect(HRD_PORT, HRD_HOST, async () => {
      try {
        console.log(`[HRD] Connected, sending: ${command}`);

        // Build and send frame
        const frame = buildHRDFrame(command, prependContext);
        console.log(`[HRD] Frame hex: ${frame.toString('hex')}`);
        console.log(`[HRD] Frame size: ${frame.length} bytes`);
        client.write(frame);

        // Read complete response (header + payload in one buffer)
        const response = await readHRDResponse(client);
        console.log(`[HRD] Response hex: ${response.toString('hex')}`);

        // Parse header
        const replySize = response.readUInt32LE(0);
        const magic1 = response.readUInt32LE(4);
        const magic2 = response.readUInt32LE(8);
        console.log(`[HRD] Reply size: ${replySize}, magic1: 0x${magic1.toString(16)}, magic2: 0x${magic2.toString(16)}`);

        // Verify magic
        if ((magic1 >>> 0) !== (MAGIC1 >>> 0) || (magic2 >>> 0) !== (MAGIC2 >>> 0)) {
          client.destroy();
          reject(new Error('Bad HRD header (magic mismatch)'));
          return;
        }

        // Extract payload (after 16-byte header)
        const payload = response.subarray(16);

        // Decode response
        let text = payload.toString('utf16le');
        const nulIndex = text.indexOf('\x00');
        if (nulIndex >= 0) {
          text = text.substring(0, nulIndex);
        }

        console.log(`[HRD] Response: ${text}`);
        client.destroy();
        resolve(text);

      } catch (err) {
        client.destroy();
        reject(err);
      }
    });

    client.on('error', (err) => {
      console.error(`[HRD] Connection error: ${err.message}`);
      reject(err);
    });
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers for browser/app access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', hrdPort: HRD_PORT }));
    return;
  }

  // Test HRD connection
  if (req.url === '/test') {
    try {
      const response = await sendToHRD('get frequency');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Connected to HRD',
        frequency: response
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: `Cannot connect to HRD: ${err.message}`
      }));
    }
    return;
  }

  // Set frequency endpoint: POST /frequency { frequency: Hz, mode: "USB" }
  if (req.url === '/frequency' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { frequency, mode } = data;

        console.log(`[Request] Set frequency: ${frequency} Hz, mode: ${mode}`);

        const results = [];

        // Set frequency
        if (frequency) {
          const freqResponse = await sendToHRD(`set frequency-hz ${frequency}`);
          results.push({ command: 'frequency', response: freqResponse });
        }

        // Set mode
        if (mode) {
          const modeResponse = await sendToHRD(`set mode ${mode}`);
          results.push({ command: 'mode', response: modeResponse });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Tuned to ${(frequency / 1000000).toFixed(6)} MHz ${mode}`,
          results
        }));

      } catch (err) {
        console.error(`[Error] ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: err.message
        }));
      }
    });
    return;
  }

  // Log QSO endpoint: POST /log { callsign, frequency, mode, rstSent, rstReceived, comment, parkReference }
  if (req.url === '/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const qsoData = JSON.parse(body);

        console.log(`[Request] Log QSO: ${qsoData.callsign} on ${qsoData.frequency} kHz ${qsoData.mode}`);

        // Build ADIF record
        const adifRecord = buildADIFRecord(qsoData);

        // Send to HRD Logbook
        await sendToHRDLogbook(adifRecord);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `QSO logged: ${qsoData.callsign}`,
          adif: adifRecord
        }));

      } catch (err) {
        console.error(`[Error] ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: err.message
        }));
      }
    });
    return;
  }

  // Raw command endpoint: POST /command { command: "get frequency" }
  if (req.url === '/command' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const response = await sendToHRD(data.command, data.prependContext || false);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, response }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(HTTP_PORT, () => {
  console.log('='.repeat(50));
  console.log('  HRD Relay Server (Protocol v5)');
  console.log('='.repeat(50));
  console.log(`  HTTP listening on: http://localhost:${HTTP_PORT}`);
  console.log(`  HRD TCP target:    ${HRD_HOST}:${HRD_PORT}`);
  console.log('');
  console.log('  Endpoints:');
  console.log(`    GET  /health    - Check relay status`);
  console.log(`    GET  /test      - Test HRD connection`);
  console.log(`    POST /frequency - Set freq/mode {frequency, mode}`);
  console.log(`    POST /log       - Log QSO to HRD Logbook (ADIF/UDP)`);
  console.log(`    POST /command   - Raw HRD command {command}`);
  console.log('='.repeat(50));
});
