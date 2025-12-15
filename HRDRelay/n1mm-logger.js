const dgram = require('dgram');

/**
 * N1MM Logger+ UDP Client
 * Sends contactreplace and contactdelete messages to N1MM Logger+
 * Protocol: XML over UDP on port 12060
 */
class N1MMLogger {
  constructor(host = 'localhost', port = 12060) {
    this.host = host;
    this.port = port;
    this.client = dgram.createSocket('udp4');
    
    this.client.on('error', (err) => {
      console.error('[N1MM] UDP client error:', err);
    });
  }

  /**
   * Build N1MM Logger+ contactreplace XML message
   * @param {Object} qso - QSO data
   * @returns {string} XML message
   */
  buildContactAddXML(qso) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
    
    // N1MM expects ISO-8601 format: YYYYMMDDTHHMMSS
    const qsoDate = timestamp.substring(0, 8); // YYYYMMDD
    const qsoTime = timestamp.substring(9, 15); // HHMMSS
    
    // Convert mode to N1MM format
    const modeMap = {
      'USB': 'SSB',
      'LSB': 'SSB',
      'FM': 'FM',
      'AM': 'AM',
      'CW': 'CW',
      'RTTY': 'RTTY',
      'PSK31': 'PSK',
      'FT8': 'DIGI',
      'FT4': 'DIGI',
    };
    
    const n1mmMode = modeMap[qso.mode] || qso.mode;
    
    // Build XML structure for contactreplace
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<contactreplace>
  <timestamp>${timestamp}</timestamp>
  <mycall>${qso.myCall || ''}</mycall>
  <band>${this.convertFreqToBand(qso.frequency)}</band>
  <rxfreq>${qso.frequency}</rxfreq>
  <txfreq>${qso.frequency}</txfreq>
  <operator>${qso.operator || qso.myCall || ''}</operator>
  <mode>${n1mmMode}</mode>
  <call>${qso.theirCall}</call>
  <countryprefix></countryprefix>
  <wpxprefix></wpxprefix>
  <stationprefix></stationprefix>
  <continent></continent>
  <snt>${qso.rstSent || '59'}</snt>
  <sntnr>${qso.serialSent || '001'}</sntnr>
  <rcv>${qso.rstReceived || '59'}</rcv>
  <rcvnr>${qso.serialReceived || '001'}</rcvnr>
  <gridsquare>${qso.gridSquare || ''}</gridsquare>
  <exchange1>${qso.park || ''}</exchange1>
  <section></section>
  <comment>${qso.comment || ''}</comment>
  <qth></qth>
  <name>${qso.name || ''}</name>
  <power></power>
  <misctext></misctext>
  <zone></zone>
  <prec></prec>
  <ck></ck>
  <ismultiplier1>0</ismultiplier1>
  <ismultiplier2>0</ismultiplier2>
  <ismultiplier3>0</ismultiplier3>
  <points>0</points>
  <radionr>1</radionr>
  <run1run2>1</run1run2>
  <ContactID>${this.generateContactID()}</ContactID>
  <StationName>${qso.station || 'POTA'}</StationName>
  <ID>${this.generateContactID()}</ID>
  <IsOriginal>True</IsOriginal>
  <NetBiosName>${require('os').hostname()}</NetBiosName>
  <IsRunQSO>1</IsRunQSO>
  <App>POTA Relay</App>
</contactreplace>`;
    
    return xml;
  }

  /**
   * Build N1MM Logger+ contactdelete XML message
   * @param {string} callsign - Callsign to delete
   * @returns {string} XML message
   */
  buildContactDeleteXML(callsign) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<contactdelete>
  <timestamp>${timestamp}</timestamp>
  <call>${callsign}</call>
  <StationName>POTA</StationName>
  <App>POTA Relay</App>
</contactdelete>`;
    
    return xml;
  }

  /**
   * Convert frequency in Hz to band name
   * @param {number} frequency - Frequency in Hz
   * @returns {string} Band name (e.g., '20m')
   */
  convertFreqToBand(frequency) {
    const freqMHz = frequency / 1000000;
    
    if (freqMHz >= 1.8 && freqMHz <= 2.0) return '160m';
    if (freqMHz >= 3.5 && freqMHz <= 4.0) return '80m';
    if (freqMHz >= 5.3 && freqMHz <= 5.4) return '60m';
    if (freqMHz >= 7.0 && freqMHz <= 7.3) return '40m';
    if (freqMHz >= 10.1 && freqMHz <= 10.15) return '30m';
    if (freqMHz >= 14.0 && freqMHz <= 14.35) return '20m';
    if (freqMHz >= 18.068 && freqMHz <= 18.168) return '17m';
    if (freqMHz >= 21.0 && freqMHz <= 21.45) return '15m';
    if (freqMHz >= 24.89 && freqMHz <= 24.99) return '12m';
    if (freqMHz >= 28.0 && freqMHz <= 29.7) return '10m';
    if (freqMHz >= 50.0 && freqMHz <= 54.0) return '6m';
    if (freqMHz >= 144.0 && freqMHz <= 148.0) return '2m';
    if (freqMHz >= 222.0 && freqMHz <= 225.0) return '1.25m';
    if (freqMHz >= 420.0 && freqMHz <= 450.0) return '70cm';
    
    return 'OOB'; // Out of band
  }

  /**
   * Generate unique contact ID
   * @returns {string} Unique ID
   */
  generateContactID() {
    return `POTA-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Send contact to N1MM Logger+
   * @param {Object} qso - QSO data
   * @returns {Promise<Object>} Result with success status
   */
  sendContact(qso) {
    return new Promise((resolve, reject) => {
      try {
        const xml = this.buildContactAddXML(qso);
        const buffer = Buffer.from(xml, 'utf8');
        
        this.client.send(buffer, 0, buffer.length, this.port, this.host, (err) => {
          if (err) {
            console.error('[N1MM] Failed to send contact:', err);
            reject({ success: false, error: err.message });
          } else {
            console.log('[N1MM] Contact sent:', qso.theirCall);
            resolve({ success: true });
          }
        });
      } catch (error) {
        console.error('[N1MM] Error building contact XML:', error);
        reject({ success: false, error: error.message });
      }
    });
  }

  /**
   * Delete contact from N1MM Logger+
   * @param {string} callsign - Callsign to delete
   * @returns {Promise<Object>} Result with success status
   */
  deleteContact(callsign) {
    return new Promise((resolve, reject) => {
      try {
        const xml = this.buildContactDeleteXML(callsign);
        const buffer = Buffer.from(xml, 'utf8');
        
        this.client.send(buffer, 0, buffer.length, this.port, this.host, (err) => {
          if (err) {
            console.error('[N1MM] Failed to delete contact:', err);
            reject({ success: false, error: err.message });
          } else {
            console.log('[N1MM] Contact deleted:', callsign);
            resolve({ success: true });
          }
        });
      } catch (error) {
        console.error('[N1MM] Error building delete XML:', error);
        reject({ success: false, error: error.message });
      }
    });
  }

  /**
   * Test connection to N1MM Logger+
   * Note: N1MM is UDP-based, so this just sends a test contact
   * @returns {Promise<Object>} Result with success status
   */
  test() {
    const testQSO = {
      myCall: 'TEST',
      theirCall: 'TEST',
      frequency: 14250000, // 20m
      mode: 'SSB',
      rstSent: '59',
      rstReceived: '59',
      comment: 'POTA Relay Connection Test',
    };
    
    return this.sendContact(testQSO);
  }

  /**
   * Close the UDP client
   */
  close() {
    if (this.client) {
      this.client.close();
      console.log('[N1MM] UDP client closed');
    }
  }
}

module.exports = N1MMLogger;
