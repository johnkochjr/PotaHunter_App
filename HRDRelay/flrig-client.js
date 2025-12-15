/**
 * FLRIG XML-RPC Client
 * Communicates with FLRIG using XML-RPC protocol
 */

class FLRIGClient {
  constructor(host = '127.0.0.1', port = 12345) {
    this.host = host;
    this.port = port;
    this.url = `http://${host}:${port}/RPC2`;
  }

  // Build XML-RPC request
  buildXMLRPC(method, params = []) {
    let paramsXML = '';
    params.forEach(param => {
      if (typeof param === 'number') {
        paramsXML += `<param><value><double>${param}</double></value></param>`;
      } else {
        paramsXML += `<param><value><string>${param}</string></value></param>`;
      }
    });

    return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>${paramsXML}</params>
</methodCall>`;
  }

  // Parse XML-RPC response
  parseXMLRPC(xml) {
    // Simple regex parsing for basic responses
    const valueMatch = xml.match(/<value>(?:<[^>]+>)?([^<]+)/);
    if (valueMatch) {
      return valueMatch[1];
    }
    return null;
  }

  // Send XML-RPC request
  async sendRequest(method, params = []) {
    const http = require('http');
    const xmlBody = this.buildXMLRPC(method, params);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/RPC2',
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(xmlBody)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = this.parseXMLRPC(data);
            resolve(result);
          } catch (err) {
            reject(new Error(`Failed to parse FLRIG response: ${err.message}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`FLRIG connection error: ${err.message}`));
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('FLRIG connection timeout'));
      });

      req.write(xmlBody);
      req.end();
    });
  }

  // Get current frequency
  async getFrequency() {
    const freq = await this.sendRequest('rig.get_vfo');
    return parseFloat(freq);
  }

  // Set frequency (in Hz)
  async setFrequency(freqHz) {
    await this.sendRequest('rig.set_vfo', [freqHz]);
  }

  // Get current mode
  async getMode() {
    return await this.sendRequest('rig.get_mode');
  }

  // Set mode
  async setMode(mode) {
    await this.sendRequest('rig.set_mode', [mode]);
  }

  // Test connection
  async test() {
    const freq = await this.getFrequency();
    const mode = await this.getMode();
    return {
      success: true,
      message: `FLRIG connected: ${(freq / 1000000).toFixed(6)} MHz ${mode}`,
      frequency: freq,
      mode: mode
    };
  }
}

module.exports = FLRIGClient;
