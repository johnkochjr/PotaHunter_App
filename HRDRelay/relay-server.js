/**
 * POTA Relay Server Module
 * Supports HRD, FLRIG, and logging-only modes
 */

const http = require('http');
const net = require('net');
const dgram = require('dgram');
const EventEmitter = require('events');
const FLRIGClient = require('./flrig-client');
const N1MMLogger = require('./n1mm-logger');

// HRD Protocol constants
const MAGIC1 = 0x1234ABCD;
const MAGIC2 = 0xABCD1234;

class RelayServer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      httpPort: config.httpPort || 7810,
      radioControl: config.radioControl || 'none',
      hrdHost: config.hrdHost || '127.0.0.1',
      hrdPort: config.hrdPort || 7809,
      loggingMode: config.loggingMode || 'none',
      hrdLogHost: config.hrdLogHost || '127.0.0.1',
      hrdLogbookPort: config.hrdLogbookPort || 2333,
      n1mmHost: config.n1mmHost || '127.0.0.1',
      n1mmPort: config.n1mmPort || 12060,
      flrigHost: config.flrigHost || '127.0.0.1',
      flrigPort: config.flrigPort || 12345,
    };
    
    this.httpServer = null;
    this.isRunning = false;
    this.flrigClient = null;
    this.n1mmLogger = null;
    
    // Initialize FLRIG client if needed
    if (this.config.radioControl === 'flrig') {
      this.flrigClient = new FLRIGClient(this.config.flrigHost, this.config.flrigPort);
    }
    
    // Initialize N1MM logger if needed
    if (this.config.loggingMode === 'n1mm') {
      this.n1mmLogger = new N1MMLogger(this.config.n1mmHost, this.config.n1mmPort);
    }
    
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
      if (this.config.radioControl === 'none') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Logging only mode - no radio control configured',
        }));
        return;
      }

      if (this.config.radioControl === 'hrd') {
        const frequency = await this.sendHRDCommand('get frequency');
        this.emit('log', { type: 'success', message: `HRD responding, frequency: ${frequency}` });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'HRD connected',
          frequency: frequency,
        }));
        return;
      }

      if (this.config.radioControl === 'flrig') {
        const result = await this.testFLRIGConnection();
        this.emit('log', { type: 'success', message: result.message });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      throw new Error('Unknown radio control mode');
    } catch (err) {
      this.stats.errorCount++;
      this.emit('log', { type: 'error', message: `Connection failed: ${err.message}` });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: `Error: ${err.message}`,
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

        if (this.config.radioControl === 'none') {
          this.emit('log', { 
            type: 'info', 
            message: 'Logging only mode - radio control skipped' 
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `Logged: ${(frequency / 1000000).toFixed(6)} MHz ${mode} (no radio control)`,
          }));
          return;
        }

        if (this.config.radioControl === 'hrd') {
          await this.sendHRDCommand(`set frequency-hz ${frequency}`);
          await this.sendHRDCommand(`set mode ${mode}`);

          this.emit('log', { 
            type: 'success', 
            message: `HRD tuned to ${(frequency / 1000000).toFixed(6)} MHz ${mode}` 
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `Tuned to ${(frequency / 1000000).toFixed(6)} MHz ${mode}`,
          }));
          return;
        }

        if (this.config.radioControl === 'flrig') {
          await this.flrigClient.setFrequency(frequency);
          await this.flrigClient.setMode(mode);

          this.emit('log', { 
            type: 'success', 
            message: `FLRIG tuned to ${(frequency / 1000000).toFixed(6)} MHz ${mode}` 
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `Tuned to ${(frequency / 1000000).toFixed(6)} MHz ${mode}`,
          }));
          return;
        }

        throw new Error('Unknown radio control mode');
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

        // Route to appropriate logging backend
        if (this.config.loggingMode === 'none') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Logging disabled',
          }));
          return;
        }

        if (this.config.loggingMode === 'hrd') {
          // HRD Logbook UDP logging
          const adifString = this.buildADIFString(qsoData);
          const udpClient = dgram.createSocket('udp4');
          const message = Buffer.from(adifString, 'utf8');

          udpClient.send(message, this.config.hrdLogbookPort, this.config.hrdLogHost, (err) => {
            udpClient.close();

            if (err) {
              this.stats.errorCount++;
              this.emit('log', { type: 'error', message: `HRD Log failed: ${err.message}` });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                message: `HRD UDP error: ${err.message}`,
              }));
            } else {
              this.emit('log', { 
                type: 'success', 
                message: `QSO logged to HRD: ${qsoData.callsign}` 
              });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: 'QSO logged to HRD Logbook',
              }));
            }
          });
          return;
        }

        if (this.config.loggingMode === 'n1mm') {
          // N1MM Logger+ UDP logging
          if (!this.n1mmLogger) {
            this.n1mmLogger = new N1MMLogger(this.config.n1mmHost, this.config.n1mmPort);
          }

          // Convert qsoData to N1MM format
          const n1mmQSO = {
            myCall: qsoData.my_call || '',
            theirCall: qsoData.callsign,
            frequency: parseFloat(qsoData.frequency) * 1000000, // MHz to Hz
            mode: qsoData.mode,
            rstSent: qsoData.rst_sent,
            rstReceived: qsoData.rst_rcvd,
            park: qsoData.sig_info || '',
            gridSquare: qsoData.gridsquare || '',
            name: qsoData.name || '',
            comment: qsoData.comment || '',
            operator: qsoData.operator || qsoData.my_call || '',
            station: qsoData.station_callsign || '',
          };

          try {
            await this.n1mmLogger.sendContact(n1mmQSO);
            
            this.emit('log', { 
              type: 'success', 
              message: `QSO logged to N1MM: ${qsoData.callsign}` 
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'QSO logged to N1MM Logger+',
            }));
          } catch (err) {
            this.stats.errorCount++;
            this.emit('log', { type: 'error', message: `N1MM Log failed: ${err.message}` });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `N1MM error: ${err.message}`,
            }));
          }
          return;
        }

        throw new Error('Unknown logging mode');
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
        
        // Reinitialize FLRIG client if radio control changed to flrig
        if (this.config.radioControl === 'flrig') {
          this.flrigClient = new FLRIGClient(this.config.flrigHost, this.config.flrigPort);
        } else {
          this.flrigClient = null;
        }
        
        // Reinitialize N1MM logger if logging mode changed to n1mm
        if (this.config.loggingMode === 'n1mm') {
          this.n1mmLogger = new N1MMLogger(this.config.n1mmHost, this.config.n1mmPort);
        } else if (this.n1mmLogger) {
          this.n1mmLogger.close();
          this.n1mmLogger = null;
        }
        
        return this.start();
      });
    } else {
      this.config = { ...this.config, ...newConfig };
      
      // Reinitialize FLRIG client if radio control changed to flrig
      if (this.config.radioControl === 'flrig') {
        this.flrigClient = new FLRIGClient(this.config.flrigHost, this.config.flrigPort);
      } else {
        this.flrigClient = null;
      }
      
      // Reinitialize N1MM logger if logging mode changed to n1mm
      if (this.config.loggingMode === 'n1mm') {
        this.n1mmLogger = new N1MMLogger(this.config.n1mmHost, this.config.n1mmPort);
      } else if (this.n1mmLogger) {
        this.n1mmLogger.close();
        this.n1mmLogger = null;
      }
      
      return Promise.resolve();
    }
  }
  
  // Test FLRIG connection
  async testFLRIGConnection() {
    if (!this.flrigClient) {
      this.flrigClient = new FLRIGClient(this.config.flrigHost, this.config.flrigPort);
    }
    return await this.flrigClient.test();
  }
}

module.exports = RelayServer;
