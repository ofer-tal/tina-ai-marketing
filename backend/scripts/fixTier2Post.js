/**
 * Script to update tier_2 post with a script
 * Uses direct MongoDB update to bypass Mongoose validation for legacy data
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables from project root .env
dotenv.config();

const POST_ID = '69869434a3e02414895aab83';
const SCRIPT = `Okay so I just finished reading this story and I literally... I can't even. It's about Vivian who finds this secret section in the library and she discovers Father Michael has this whole other side to him. And the tension between them? The stolen glances in church? The secret notes? I was blushing so hard. If you're into that forbidden, slightly wrong-but-it-feels-so-right kind of romance... you need to read Whispers Among the Pages on Blush. Like, immediately.`;

async function updatePost() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(mongoUri);

    console.log('Connected to MongoDB');

    // Get the database and collection directly (bypass Mongoose model)
    const db = mongoose.connection.db;
    const collection = db.collection('marketing_posts');

    // Check current state
    const currentPost = await collection.findOne({ _id: new mongoose.Types.ObjectId(POST_ID) });

    if (!currentPost) {
      console.log('Post not found');
      process.exit(1);
    }

    console.log('Found post:', currentPost.title);
    console.log('Current tierParameters type:', typeof currentPost.tierParameters);
    console.log('Current tierParameters:', JSON.stringify(currentPost.tierParameters, null, 2));
    console.log('');

    // Clear old tierParameters and set new plain string values
    // Using direct MongoDB update to bypass Mongoose validation
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(POST_ID) },
      {
        $set: {
          'tierParameters.script': SCRIPT,
          'tierParameters.scriptPreview': SCRIPT.substring(0, 200)
        },
        $unset: {
          // Remove any old nested object entries that might exist
          'tierParameters.avatarId': '',
          'tierParameters.avatarName': ''
        }
      }
    );

    console.log('Update result:', result);
    console.log('Matched:', result.matchedCount, 'Modified:', result.modifiedCount);
    console.log('');

    // Verify the update
    const updatedPost = await collection.findOne({ _id: new mongoose.Types.ObjectId(POST_ID) });
    console.log('Verified tierParameters after update:');
    console.log(JSON.stringify(updatedPost.tierParameters, null, 2));

    await mongoose.disconnect();
    console.log('');
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePost();
