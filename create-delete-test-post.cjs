const axios = require('axios');
const mongoose = require('mongoose');

async function createTestPost() {
  const timestamp = Date.now();
  const response = await axios.post('http://localhost:3001/api/content/posts/create', {
    platform: 'tiktok',
    contentType: 'image',
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'DELETE_TEST Story',
    storyCategory: 'Contemporary',
    caption: 'DELETE_TEST_318 - Unique identifier for deletion test',
    hashtags: ['#deleteTest318', '#feature318'],
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  if (response.data && response.data.success && response.data.data) {
    console.log('Created post ID:', response.data.data._id);
    console.log('Title:', response.data.data.title);
  }
}

createTestPost().catch(console.error);
