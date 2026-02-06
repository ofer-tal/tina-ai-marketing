/**
 * CLI script to generate self-signed certificate for localhost
 */
import { getCertificatePaths } from './generate-cert.js';

try {
  const paths = getCertificatePaths();
  console.log('\nCertificate generated successfully!');
  console.log('Files created:');
  console.log('  Certificate: certs/localhost.crt');
  console.log('  Key: certs/localhost.key');
} catch (error) {
  console.error('Failed to generate certificate:', error);
  process.exit(1);
}
