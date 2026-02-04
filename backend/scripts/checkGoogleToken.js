/**
 * Check Google token in database
 */
import configService from '../services/config.js';
import mongoose from 'mongoose';

const MONGODB_URI = configService.get('MONGODB_URI');

async function checkGoogleToken() {
  await mongoose.connect(MONGODB_URI);

  const tokens = mongoose.connection.db.collection('marketing_auth_tokens');

  const googleToken = await tokens.findOne({ platform: 'google', isActive: true });

  if (googleToken) {
    console.log('=== ACTIVE GOOGLE TOKEN FOUND ===');
    console.log('Has accessToken:', !!googleToken.accessToken);
    console.log('Has refreshToken:', !!googleToken.refreshToken);
    console.log('ExpiresAt:', googleToken.expiresAt);
    console.log('CreatedAt:', googleToken.createdAt);
    console.log('LastRefreshedAt:', googleToken.lastRefreshedAt);
    console.log('Is expired:', googleToken.expiresAt && new Date() >= new Date(googleToken.expiresAt));
  } else {
    console.log('=== NO ACTIVE GOOGLE TOKEN FOUND ===');
  }

  // Also check for any google tokens (including inactive)
  const allGoogleTokens = await tokens.find({ platform: 'google' }).toArray();
  console.log(`\nTotal Google tokens in DB: ${allGoogleTokens.length}`);
  allGoogleTokens.forEach((t, i) => {
    console.log(`  Token ${i + 1}: isActive=${t.isActive}, hasRefreshToken=${!!t.refreshToken}, createdAt=${t.createdAt}`);
  });

  await mongoose.disconnect();
}

checkGoogleToken().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
