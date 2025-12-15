/**
 * HRD Relay Server Module
 * Extracted from relay.js for use in Electron app
 */

const http = require('http');
const net = require('net');
const dgram = require('dgram');
const EventEmitter = require('events');

// HRD Protocol constants
const MAGIC1 = 0x1234ABCD;
const MAGIC2 = 0xABCD1234;

class RelayServer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      httpPort: config.httpPort || 7810,
      hrdHost: config.hrdHost || '127.0.0.1',
      hrdPort: config.hrdPort || 7809,
      hrdLogbookPort: config.hrdLogbookPort || 2333,
    };
    
    this.httpServer = null;
    this.isRunning = false;
    this.stats = {
      requestCount: 0,
      errorCount: 0,
      lastRequest: null,
      startTime: null,
    };
  }

  // Build HRD v5 protocol frame
  buildHRDFrame(command, prependContext = false) {
    const payloadText = (prependContext ? '[0] ' + command : command) + '\x00';
    const payload = Buffer.from(payloadText, 'utf16le');

    const size = 16 + payload.length;
    const header = Buffer.alloc(16);
    header.writeUInt32LE(size, 0);
    header.writeUInt32LE(MAGIC1 >>> 0, 4);
    header.writeUInt32LE(MAGIC2 >>> 0, 8);
    header.writeUInt32LE(0, 12);

    return Buffer.concat([header, payload]);
  }

  // Parse HRD v5 response
  parseHRDResponse(buffer) {
    if (buffer.length < 16) {
      return { error: 'Response too short', data: null };
    }

    const size = buffer.readUInt32LE(0);
    const magic1 = buffer.readUInt32LE(4);
    const magic2 = buffer.readUInt32LE(8);

    if ((magic1 >>> 0) !== (MAGIC1 >>> 0) || (magic2 >>> 0) !== (MAGIC2 >>> 0)) {
      return { error: 'Magic mismatch', data: null };
    }

    if (buffer.length < size) {
      return { error: 'Incomplete response', data: null };
    }

    const payload = buffer.slice(16, size);
    let text = payload.toString('utf16le');

    const nulIndex = text.indexOf('\x00');
    if (nulIndex >= 0) {
      text = text.substring(0, nulIndex);
    }

    return { error: null, data: text };
  }

  // Read complete HRD response
  readHRDResponse(socket, timeout = 5000) {
    return new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);
      let timeoutHandle;

      const onData = (data) => {
        buffer = Buffer.concat([buffer, data]);

        if (buffer.length >= 16) {
          const expectedSize = buffer.readUInt32LE(0);

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

      const onTimeout = () => {
        cleanup();
        reject(new Error('HRD response timeout'));
      };

      const cleanup = () => {
        socket.removeListener('data', onData);
        socket.removeListener('error', onError);
        if (timeoutHandle) clearTimeout(timeoutHandle);
      };

      socket.on('data', onData);
      socket.on('error', onError);
      timeoutHandle = setTimeout(onTimeout, timeout);
    });
  }

  // Send command to HRD
  async sendHRDCommand(command, prependContext = false) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();

      socket.connect(this.config.hrdPort, this.config.hrdHost, () => {
        const frame = this.buildHRDFrame(command, prependContext);
        socket.write(frame);
      });

      this.readHRDResponse(socket)
        .then(responseBuffer => {
          socket.end();
          const result = this.parseHRDResponse(responseBuffer);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.data);
          }
        })
        .catch(err => {
          socket.destroy();
          reject(err);
        });

      socket.on('error', (err) => {
        reject(err);
      });
    });
  }

  // Handle HTTP requests
  handleRequest(req, res) {
    this.stats.requestCount++;
    this.stats.lastRequest = new Date().toISOString();

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Test endpoint
    if (req.url === '/test' && req.method === 'GET') {
      this.handleTestRequest(req, res);
      return;
    }

    // Frequency endpoint
    if (req.url === '/frequency' && req.method === 'POST') {
      this.handleFrequencyRequest(req, res);
      return;
    }

    // Log endpoint
    if (req.url === '/log' && req.method === 'POST') {
      this.handleLogRequest(req, res);
      return;
    }

    // Status endpoint
    if (req.url === '/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        running: this.isRunning,
        stats: this.stats,
        config: this.config,
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Endpoint not found' }));
  }

  async handleTestRequest(req, res) {
    this.emit('log', { type: 'info', message: 'Test connection request' });

    try {
      const frequency = await this.sendHRDCommand('get frequency');
      this.emit('log', { type: 'success', message: `HRD responding, frequency: ${frequency}` });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'HRD connected',
        frequency: frequency,
      }));
    } catch (err) {
      this.stats.errorCount++;
      this.emit('log', { type: 'error', message: `HRD connection failed: ${err.message}` });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: `HRD error: ${err.message}`,
      }));
    }
  }

  async handleFrequencyRequest(req, res) {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { frequency, mode } = JSON.parse(body);
        
        this.emit('log', { 
          type: 'info', 
          message: `Setting frequency: ${frequency} Hz, mode: ${mode}` 
        });

        await this.sendHRDCommand(`set frequency-hz ${frequency}`);
        await this.sendHRDCommand(`set mode ${mode}`);

        this.emit('log', { 
          type: 'success', 
          message: `Tuned to ${(frequency / 1000000).toFixed(6)} MHz ${mode}` 
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Tuned to ${(frequency / 1000000).toFixed(6)} MHz ${mode}`,
        }));
      } catch (err) {
        this.stats.errorCount++;
        this.emit('log', { type: 'error', message: `Frequency set failed: ${err.message}` });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: `Error: ${err.message}`,
        }));
      }
    });
  }

  async handleLogRequest(req, res) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const qsoData = JSON.parse(body);
        
        this.emit('log', { 
          type: 'info', 
          message: `Logging QSO: ${qsoData.callsign} on ${qsoData.band}` 
        });

        const adifString = this.buildADIFString(qsoData);
        const udpClient = dgram.createSocket('udp4');
        const message = Buffer.from(adifString, 'utf8');

        udpClient.send(message, this.config.hrdLogbookPort, this.config.hrdHost, (err) => {
          udpClient.close();

          if (err) {
            this.stats.errorCount++;
            this.emit('log', { type: 'error', message: `Log failed: ${err.message}` });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `UDP error: ${err.message}`,
            }));
          } else {
            this.emit('log', { 
              type: 'success', 
              message: `QSO logged: ${qsoData.callsign}` 
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'QSO logged to HRD',
            }));
          }
        });
      } catch (err) {
        this.stats.errorCount++;
        this.emit('log', { type: 'error', message: `Log parse failed: ${err.message}` });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: `Error: ${err.message}`,
        }));
      }
    });
  }

  buildADIFString(qso) {
    const fields = [];
    
    fields.push(`<call:${qso.callsign.length}>${qso.callsign}`);
    fields.push(`<qso_date:8>${qso.qso_date}`);
    fields.push(`<time_on:6>${qso.time_on}`);
    fields.push(`<band:${qso.band.length}>${qso.band}`);
    fields.push(`<mode:${qso.mode.length}>${qso.mode}`);
    fields.push(`<freq:${qso.frequency.length}>${qso.frequency}`);
    fields.push(`<rst_sent:${qso.rst_sent.length}>${qso.rst_sent}`);
    fields.push(`<rst_rcvd:${qso.rst_rcvd.length}>${qso.rst_rcvd}`);
    
    if (qso.my_sig && qso.my_sig_info) {
      fields.push(`<my_sig:${qso.my_sig.length}>${qso.my_sig}`);
      fields.push(`<my_sig_info:${qso.my_sig_info.length}>${qso.my_sig_info}`);
    }
    
    if (qso.sig && qso.sig_info) {
      fields.push(`<sig:${qso.sig.length}>${qso.sig}`);
      fields.push(`<sig_info:${qso.sig_info.length}>${qso.sig_info}`);
    }
    
    if (qso.comment) {
      fields.push(`<comment:${qso.comment.length}>${qso.comment}`);
    }
    
    fields.push('<eor>');
    
    return fields.join('');
  }

  // Start server
  start() {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        reject(new Error('Server already running'));
        return;
      }

      this.httpServer = http.createServer((req, res) => this.handleRequest(req, res));

      this.httpServer.listen(this.config.httpPort, () => {
        this.isRunning = true;
        this.stats.startTime = new Date().toISOString();
        this.emit('log', { 
          type: 'success', 
          message: `Server started on port ${this.config.httpPort}` 
        });
        this.emit('started');
        resolve();
      });

      this.httpServer.on('error', (err) => {
        this.emit('log', { type: 'error', message: `Server error: ${err.message}` });
        reject(err);
      });
    });
  }

  // Stop server
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.isRunning) {
        reject(new Error('Server not running'));
        return;
      }

      this.httpServer.close(() => {
        this.isRunning = false;
        this.emit('log', { type: 'info', message: 'Server stopped' });
        this.emit('stopped');
        resolve();
      });
    });
  }

  // Update configuration
  updateConfig(newConfig) {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      return this.stop().then(() => {
        this.config = { ...this.config, ...newConfig };
        return this.start();
      });
    } else {
      this.config = { ...this.config, ...newConfig };
      return Promise.resolve();
    }
  }
}

module.exports = RelayServer;
