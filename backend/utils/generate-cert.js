/**
 * Self-Signed Certificate Generator for Local Development
 *
 * Generates an SSL certificate for localhost to support OAuth flows
 * that require HTTPS redirect URIs (Facebook/Instagram, etc.)
 */

import fs from 'fs';
import path from 'path';
import selfsigned from 'selfsigned';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CERT_DIR = path.join(__dirname, '..', '..', 'certs');
const CERT_FILE = path.join(CERT_DIR, 'localhost.crt');
const KEY_FILE = path.join(CERT_DIR, 'localhost.key');

/**
 * Generate a self-signed certificate for localhost
 */
export async function generateSelfSignedCert() {
  // Ensure certs directory exists
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }

  // Check if certificate already exists and is valid
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    const certExists = fs.existsSync(CERT_FILE);
    const keyExists = fs.existsSync(KEY_FILE);

    if (certExists && keyExists) {
      // Verify the cert is for localhost
      const certContent = fs.readFileSync(CERT_FILE, 'utf-8');
      if (certContent.includes('localhost')) {
        return {
          cert: CERT_FILE,
          key: KEY_FILE,
          cached: true
        };
      }
    }
  }

  // Generate new certificate using selfsigned package (async in v5.x)
  const attrs = [{ name: 'commonName', value: 'localhost' }];

  const pems = await selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'basicConstraints',
        cA: false,
        critical: true
      },
      {
        name: 'keyUsage',
        keyEncipherment: true,
        digitalSignature: true,
        critical: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },     // DNS name
          { type: 2, value: '*.localhost' },   // Wildcard DNS
          { type: 7, ip: '127.0.0.1' },        // IP address
          { type: 7, ip: '::1' }               // IPv6
        ]
      }
    ]
  });

  // Write certificate and key to files
  fs.writeFileSync(CERT_FILE, pems.cert);
  fs.writeFileSync(KEY_FILE, pems.private);

  return {
    cert: CERT_FILE,
    key: KEY_FILE,
    cached: false
  };
}

/**
 * Get certificate paths (generating if needed)
 */
export async function getCertificatePaths() {
  const result = await generateSelfSignedCert();

  if (result.cached) {
    console.log('Using existing self-signed certificate for localhost');
  } else {
    console.log('Generated new self-signed certificate for localhost');
    console.log('  Certificate:', result.cert);
    console.log('  Key:', result.key);
    console.log('');
    console.log('⚠️  Your browser will show a security warning for https://localhost.');
    console.log('   This is normal for self-signed certificates.');
    console.log('   Click "Advanced" → "Proceed to localhost" to continue.');
  }

  return {
    cert: fs.readFileSync(result.cert, 'utf-8'),
    key: fs.readFileSync(result.key, 'utf-8')
  };
}

// If run directly, generate the certificate
// Check if this is the main module being run
if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  (async () => {
    try {
      const paths = await getCertificatePaths();
      console.log('\nCertificate generated successfully!');
      console.log('Add this certificate to your browser\'s trusted certificates if needed:');
      console.log(`  ${CERT_FILE}`);
    } catch (error) {
      console.error('Failed to generate certificate:', error);
      process.exit(1);
    }
  })();
}

export default generateSelfSignedCert;
