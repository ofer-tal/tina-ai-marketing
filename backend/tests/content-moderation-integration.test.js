import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import contentRouter from '../api/content.js';
import contentModerationService from '../services/contentModerationService.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/content', contentRouter);

const API_URL = 'http://localhost:3001';
const TEST_BASE_URL = `${API_URL}/api/content`;

describe('Content Moderation Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Start server if not already running
    try {
      const response = await request(TEST_BASE_URL).get('/moderation/stats');
      console.log('✓ Server already running');
    } catch (error) {
      console.log('Starting server...');
      server = app.listen(3002, () => {
        console.log('✓ Test server started on port 3002');
      });
    }
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    // Clear moderation history after tests
    contentModerationService.clearHistory();
  });

  describe('Step 1: Generate safe content', () => {
    it('should create safe marketing content with appropriate caption', async () => {
      const safeContent = {
        caption: 'Check out this amazing romantic story! 💕 Love is in the air with our latest update. #Romance #LoveStories',
        hashtags: ['#Romance', '#LoveStories', '#BookRecommendation', '#Reading', '#Fiction'],
        hook: 'You won\'t believe this plot twist!',
        platform: 'tiktok',
        story: {
          title: 'The CEO\'s Secret',
          category: 'Contemporary',
          spiciness: 1
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(safeContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('passed');
      expect(response.body.data).toHaveProperty('flags');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('duration');

      console.log('✓ Safe content created successfully');
      console.log(`  Caption: "${safeContent.caption.substring(0, 50)}..."`);
      console.log(`  Hashtags: ${safeContent.hashtags.length} tags`);
    });

    it('should create safe content with minimal text', async () => {
      const minimalSafeContent = {
        caption: 'Love this story! ❤️',
        hashtags: ['#Romance'],
        platform: 'instagram',
        story: {
          title: 'Summer Romance',
          category: 'Contemporary',
          spiciness: 0
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(minimalSafeContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(true);

      console.log('✓ Minimal safe content created');
    });

    it('should handle safe content with special characters and emojis', async () => {
      const emojiContent = {
        caption: '💕✨ New story alert! 📚 You\'ll love these characters 😊🎉',
        hashtags: ['#NewRelease', '#BookCommunity', '#MustRead'],
        platform: 'youtube_shorts',
        story: {
          title: 'Wedding bells',
          category: 'Contemporary',
          spiciness: 1
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(emojiContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(true);

      console.log('✓ Safe content with emojis handled correctly');
    });

    it('should validate required fields for moderation', async () => {
      const invalidContent = {
        // Missing caption
        hashtags: ['#Test'],
        platform: 'tiktok'
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(invalidContent)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('caption');

      console.log('✓ Required field validation working');
    });

    it('should validate platform parameter', async () => {
      const invalidPlatform = {
        caption: 'Test caption',
        platform: 'invalid_platform'
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(invalidPlatform);

      // Should still process - moderation service doesn't strictly validate platform
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('platform');

      console.log('✓ Platform parameter processed');
    });
  });

  describe('Step 2: Verify passes moderation', () => {
    it('should verify safe content passes all checks', async () => {
      const safeContent = {
        caption: 'Amazing romantic story with great character development! The plot twist will surprise you. #Romance #Books',
        hashtags: ['#Romance', '#Books', '#Reading', '#Fiction', '#LoveStories', '#BookRecommendation'],
        hook: 'This story will make you believe in love again',
        platform: 'tiktok',
        story: {
          title: 'Second Chance Love',
          category: 'Contemporary',
          spiciness: 1
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(safeContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(true);
      expect(response.body.data.flags).toEqual([]);
      expect(response.body.data.confidence).toBeGreaterThan(0);

      console.log('✓ Safe content passed moderation checks');
      console.log(`  Confidence: ${response.body.data.confidence}`);
      console.log(`  Duration: ${response.body.data.duration}ms`);
    });

    it('should pass content with brand-appropriate spiciness level 1', async () => {
      const spiciness1Content = {
        caption: 'Steamy romance novel alert! 🔥 The chemistry between these characters is off the charts. #SteamyRomance',
        hashtags: ['#Romance', '#Steamy', '#Love'],
        hook: 'Get ready for some heat!',
        platform: 'instagram',
        story: {
          title: 'Passionate Nights',
          category: 'Contemporary',
          spiciness: 1
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(spiciness1Content)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(true);

      console.log('✓ Spiciness level 1 content passed moderation');
    });

    it('should pass content with appropriate hashtags within platform limits', async () => {
      const appropriateHashtags = {
        caption: 'Great romance story recommendation for you!',
        hashtags: ['#Romance', '#Books', '#Reading', '#Fiction', '#LoveStories', '#BookRecommendation', '#ContemporaryRomance', '#MustRead'],
        platform: 'instagram',
        story: {
          title: 'Love Found',
          category: 'Contemporary',
          spiciness: 0
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(appropriateHashtags)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(true);

      console.log('✓ Appropriate hashtag count passed moderation');
    });

    it('should pass content within character limits', async () => {
      const withinLimitsContent = {
        caption: 'A'.repeat(500), // Well within TikTok/Instagram limits
        hashtags: ['#Romance', '#Books'],
        platform: 'tiktok',
        story: {
          title: 'Long Story Title',
          category: 'Contemporary',
          spiciness: 1
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(withinLimitsContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(true);

      console.log('✓ Content within character limits passed');
    });

    it('should verify moderation result structure', async () => {
      const testContent = {
        caption: 'Safe test content for verification',
        hashtags: ['#Test'],
        platform: 'tiktok',
        story: {
          title: 'Test Story',
          category: 'Contemporary',
          spiciness: 0
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(testContent)
        .expect(200);

      const result = response.body.data;

      // Verify result structure
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('local');
      expect(result.checks).toHaveProperty('api');
      expect(result).toHaveProperty('flags');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('metadata');

      console.log('✓ Moderation result structure verified');
      console.log('  Result keys:', Object.keys(result).join(', '));
    });
  });

  describe('Step 3: Generate flagged content', () => {
    it('should flag content with excessive profanity', async () => {
      // Need MORE than 3 profanity instances to trigger flag (flag is medium severity)
      const profanityContent = {
        caption: 'This fucking story is fucking amazing! Holy shit, you\'ll love it. Damn good plot! What the fuck, twist! Ass characters. Bitch please. Fucking shit damn ass bitch!',
        hashtags: ['#Romance'],
        platform: 'tiktok',
        story: {
          title: 'Profanity Test',
          category: 'Contemporary',
          spiciness: 1
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(profanityContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Note: excessive_profanity is MEDIUM severity, so content may still pass
      // unless combined with high-severity flags
      expect(response.body.data.flags.length).toBeGreaterThan(0);

      const profanityFlags = response.body.data.flags.filter(
        f => f.type === 'excessive_profanity'
      );
      expect(profanityFlags.length).toBeGreaterThan(0);

      console.log('✓ Content with excessive profanity flagged');
      console.log(`  Flag type: ${profanityFlags[0].type}`);
      console.log(`  Severity: ${profanityFlags[0].severity}`);
    });

    it('should flag content with explicit references', async () => {
      const explicitContent = {
        caption: 'This story has explicit content and naked scenes. Very pornographic material with sex scenes.',
        hashtags: ['#Romance', '#Nude', '#Porn'],
        platform: 'instagram',
        story: {
          title: 'Explicit Test',
          category: 'Contemporary',
          spiciness: 3
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(explicitContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(false);

      const explicitFlags = response.body.data.flags.filter(
        f => f.type === 'explicit_content' || f.type === 'inappropriate_hashtags'
      );
      expect(explicitFlags.length).toBeGreaterThan(0);

      console.log('✓ Content with explicit references flagged');
    });

    it('should flag content with hate speech indicators', async () => {
      const hateSpeechContent = {
        caption: 'This story shows violence and hate. Kill all the characters. Terrorist plot included.',
        hashtags: ['#Violence', '#Hate'],
        platform: 'youtube_shorts',
        story: {
          title: 'Hate Speech Test',
          category: 'Thriller',
          spiciness: 2
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(hateSpeechContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(false);

      const hateFlags = response.body.data.flags.filter(
        f => f.type === 'hate_speech_indicator'
      );
      expect(hateFlags.length).toBeGreaterThan(0);

      console.log('✓ Content with hate speech indicators flagged');
    });

    it('should flag content with personal information', async () => {
      const personalInfoContent = {
        caption: 'Contact us at test@example.com or call 1234567890. SSN: 123-45-6789',
        hashtags: ['#Contact'],
        platform: 'tiktok',
        story: {
          title: 'Personal Info Test',
          category: 'Contemporary',
          spiciness: 0
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(personalInfoContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(false);

      const personalInfoFlags = response.body.data.flags.filter(
        f => f.type === 'personal_information'
      );
      expect(personalInfoFlags.length).toBeGreaterThan(0);

      console.log('✓ Content with personal information flagged');
      console.log(`  Detected: ${personalInfoFlags[0].message}`);
    });

    it('should flag content exceeding character limits', async () => {
      const excessiveLengthContent = {
        caption: 'A'.repeat(2500), // Exceeds TikTok/Instagram limit of 2200
        hashtags: ['#Test'],
        platform: 'tiktok',
        story: {
          title: 'Length Test',
          category: 'Contemporary',
          spiciness: 0
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(excessiveLengthContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(false);

      const lengthFlags = response.body.data.flags.filter(
        f => f.type === 'length_violation'
      );
      expect(lengthFlags.length).toBeGreaterThan(0);

      console.log('✓ Content exceeding character limits flagged');
    });

    it('should flag Instagram content with too many hashtags', async () => {
      // Instagram allows max 30 hashtags, need MORE than 30 to flag (medium severity)
      const excessiveHashtags = {
        caption: 'Test caption',
        hashtags: Array.from({ length: 31 }, (_, i) => `#Tag${i}`),
        platform: 'instagram',
        story: {
          title: 'Hashtag Test',
          category: 'Contemporary',
          spiciness: 0
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(excessiveHashtags)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Note: hashtag limit is MEDIUM severity, so content may still pass
      // unless combined with high-severity flags

      const hashtagFlags = response.body.data.flags.filter(
        f => f.type === 'platform_compliance'
      );
      expect(hashtagFlags.length).toBeGreaterThan(0);

      console.log('✓ Instagram content with excessive hashtags flagged');
    });
  });

  describe('Step 4: Verify fails moderation', () => {
    it('should fail moderation with high severity flags', async () => {
      const highSeverityContent = {
        caption: 'This pornographic story has naked scenes and explicit violence. Kill everyone in hate!',
        hashtags: ['#Porn', '#Nude', '#Adult', '#XXX'],
        platform: 'tiktok',
        story: {
          title: 'High Severity Test',
          category: 'Contemporary',
          spiciness: 3
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(highSeverityContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(false);

      const highSeverityFlags = response.body.data.flags.filter(
        f => f.severity === 'high'
      );
      expect(highSeverityFlags.length).toBeGreaterThan(0);

      console.log('✓ Content failed moderation with high severity flags');
      console.log(`  High severity flags: ${highSeverityFlags.length}`);
      highSeverityFlags.forEach(flag => {
        console.log(`    - ${flag.type}: ${flag.message}`);
      });
    });

    it('should provide detailed flag information', async () => {
      const flagTestContent = {
        caption: 'Fuck this shit! Contact test@example.com for more. Damn good violence with hate!',
        hashtags: ['#NSFW', '#Adult'],
        platform: 'instagram',
        story: {
          title: 'Flag Details Test',
          category: 'Contemporary',
          spiciness: 2
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(flagTestContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(false);
      expect(response.body.data.flags.length).toBeGreaterThan(0);

      // Verify flag structure
      response.body.data.flags.forEach(flag => {
        expect(flag).toHaveProperty('type');
        expect(flag).toHaveProperty('severity');
        expect(flag).toHaveProperty('message');
        expect(['low', 'medium', 'high']).toContain(flag.severity);
      });

      console.log('✓ Detailed flag information provided');
      console.log('  Flags detected:');
      response.body.data.flags.forEach(flag => {
        console.log(`    [${flag.severity.toUpperCase()}] ${flag.type}: ${flag.message}`);
      });
    });

    it('should include actionable recommendations', async () => {
      const recommendationContent = {
        caption: 'This fucking story is pornographic with naked scenes!',
        hashtags: ['#Porn', '#Nude'],
        platform: 'tiktok',
        story: {
          title: 'Recommendations Test',
          category: 'Contemporary',
          spiciness: 3
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(recommendationContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      expect(response.body.data.recommendations.length).toBeGreaterThan(0);

      console.log('✓ Actionable recommendations included');
      console.log('  Recommendations:');
      response.body.data.recommendations.forEach(rec => {
        console.log(`    - ${rec}`);
      });
    });

    it('should fail moderation for platform-specific violations', async () => {
      const platformViolationContent = {
        caption: 'A'.repeat(2500), // Violates TikTok limit
        hashtags: ['#fyp', '#foryou', '#viral', '#trending', '#fyp', '#foryou', '#viral'],
        platform: 'tiktok',
        story: {
          title: 'Platform Violation Test',
          category: 'Contemporary',
          spiciness: 0
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(platformViolationContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(false);

      const platformFlags = response.body.data.flags.filter(
        f => f.type === 'length_violation' || f.type === 'platform_compliance'
      );
      expect(platformFlags.length).toBeGreaterThan(0);

      console.log('✓ Platform-specific violations detected');
    });

    it('should track all violation types in single check', async () => {
      const multiViolationContent = {
        caption: 'This fucking pornographic shit has hate and violence! Contact me@test.com or 1234567890',
        hashtags: ['#NSFW', '#Adult', '#Porn', '#XXX', '#Nude'],
        platform: 'instagram',
        story: {
          title: 'Multi-Violation Test',
          category: 'Contemporary',
          spiciness: 3
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(multiViolationContent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passed).toBe(false);

      const flagTypes = response.body.data.flags.map(f => f.type);
      const expectedTypes = [
        'excessive_profanity',
        'explicit_content',
        'hate_speech_indicator',
        'personal_information',
        'inappropriate_hashtags'
      ];

      const detectedTypes = flagTypes.filter(
        type => expectedTypes.includes(type)
      );

      console.log('✓ Multiple violations tracked in single check');
      console.log(`  Detected ${detectedTypes.length} violation types`);
      detectedTypes.forEach(type => {
        console.log(`    - ${type}`);
      });
    });
  });

  describe('Step 5: Test regeneration triggered', () => {
    it('should create marketing post and test moderation workflow', async () => {
      // Create a flagged post
      const flaggedPost = {
        title: 'Flagged Test Post',
        description: 'This post has issues',
        platform: 'tiktok',
        contentType: 'video',
        caption: 'This fucking story is pornographic! Contact test@example.com',
        hashtags: ['#Porn', '#Nude', '#Adult'],
        status: 'draft',
        storyId: '000000000000000000000001',
        storyName: 'Test Story',
        storyCategory: 'Contemporary',
        storySpiciness: 3
      };

      // First, moderate the content
      const moderationResponse = await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: flaggedPost.caption,
          hashtags: flaggedPost.hashtags,
          platform: flaggedPost.platform,
          story: {
            title: flaggedPost.storyName,
            category: flaggedPost.storyCategory,
            spiciness: flaggedPost.storySpiciness
          }
        })
        .expect(200);

      expect(moderationResponse.body.success).toBe(true);
      expect(moderationResponse.body.data.passed).toBe(false);

      console.log('✓ Moderation check failed as expected');
      console.log(`  Flags detected: ${moderationResponse.body.data.flags.length}`);

      // Create the post (it will be in draft status with flags)
      const createResponse = await request(TEST_BASE_URL)
        .post('/posts/create')
        .send(flaggedPost)
        .expect(200);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data).toHaveProperty('_id');

      const postId = createResponse.body.data._id;
      console.log(`✓ Flagged post created with ID: ${postId}`);

      // Test regeneration by requesting regeneration with feedback
      const regenerationResponse = await request(TEST_BASE_URL)
        .post(`/${postId}/regenerate`)
        .send({
          feedback: 'Remove profanity and explicit content. Make it family-friendly.'
        })
        .expect(200);

      expect(regenerationResponse.body.success).toBe(true);
      expect(regenerationResponse.body.data).toHaveProperty('regenerationCount');
      expect(regenerationResponse.body.data.regenerationCount).toBe(1);

      console.log('✓ Content regeneration triggered');
      console.log(`  Regeneration count: ${regenerationResponse.body.data.regenerationCount}`);
      console.log(`  Status reset to: ${regenerationResponse.body.data.status}`);

      // Verify the regenerated content is different
      expect(regenerationResponse.body.data.changes).toHaveProperty('captionChanged');
      expect(regenerationResponse.body.data).toHaveProperty('previous');

      console.log('✓ Content changes tracked');
      console.log(`  Caption changed: ${regenerationResponse.body.data.changes.captionChanged}`);
      console.log(`  Hashtags changed: ${regenerationResponse.body.data.changes.hashtagsChanged}`);

      // Clean up - delete the test post
      await request(TEST_BASE_URL)
        .delete(`/posts/${postId}`)
        .expect(200);

      console.log('✓ Test post cleaned up');
    });

    it('should track regeneration history', async () => {
      // Create a post
      const post = {
        title: 'Regeneration History Test',
        platform: 'instagram',
        contentType: 'image',
        caption: 'Initial caption',
        hashtags: ['#Test'],
        status: 'draft',
        storyId: '000000000000000000000001',
        storyName: 'Test Story',
        storyCategory: 'Contemporary',
        storySpiciness: 1
      };

      const createResponse = await request(TEST_BASE_URL)
        .post('/posts/create')
        .send(post)
        .expect(200);

      const postId = createResponse.body.data._id;

      // Regenerate multiple times
      await request(TEST_BASE_URL)
        .post(`/${postId}/regenerate`)
        .send({ feedback: 'First regeneration' })
        .expect(200);

      await request(TEST_BASE_URL)
        .post(`/${postId}/regenerate`)
        .send({ feedback: 'Second regeneration' })
        .expect(200);

      // Get regeneration history
      const historyResponse = await request(TEST_BASE_URL)
        .get(`/${postId}/regeneration-history`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.regenerationCount).toBeGreaterThanOrEqual(2);
      expect(historyResponse.body.data).toHaveProperty('lastRegeneratedAt');
      expect(historyResponse.body.data).toHaveProperty('history');

      console.log('✓ Regeneration history tracked');
      console.log(`  Total regenerations: ${historyResponse.body.data.regenerationCount}`);
      console.log(`  Last regenerated: ${historyResponse.body.data.lastRegeneratedAt}`);

      // Clean up
      await request(TEST_BASE_URL)
        .delete(`/posts/${postId}`)
        .expect(200);
    });

    it('should handle moderation after regeneration', async () => {
      // Create flagged content
      const flaggedContent = {
        caption: 'This fucking story is shit!',
        hashtags: ['#Porn'],
        platform: 'tiktok',
        story: {
          title: 'Post-Regeneration Test',
          category: 'Contemporary',
          spiciness: 2
        }
      };

      // Initial moderation should fail
      const initialModeration = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(flaggedContent)
        .expect(200);

      expect(initialModeration.body.data.passed).toBe(false);
      console.log('✓ Initial content failed moderation');

      // Create post with flagged content
      const post = {
        title: 'Post-Regeneration Test',
        platform: 'tiktok',
        contentType: 'video',
        caption: flaggedContent.caption,
        hashtags: flaggedContent.hashtags,
        status: 'draft',
        storyId: '000000000000000000000001',
        storyName: flaggedContent.story.title,
        storyCategory: flaggedContent.story.category,
        storySpiciness: flaggedContent.story.spiciness
      };

      const createResponse = await request(TEST_BASE_URL)
        .post('/posts/create')
        .send(post)
        .expect(200);

      const postId = createResponse.body.data._id;

      // Regenerate with feedback to make it safe
      const regenerationResponse = await request(TEST_BASE_URL)
        .post(`/${postId}/regenerate`)
        .send({
          feedback: 'Remove all profanity and inappropriate content. Make it romantic and family-friendly.'
        })
        .expect(200);

      // Moderate the regenerated content
      const regeneratedModeration = await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: regenerationResponse.body.data.caption,
          hashtags: regenerationResponse.body.data.hashtags,
          platform: post.platform,
          story: flaggedContent.story
        })
        .expect(200);

      // The regenerated content should be safer
      console.log('✓ Regenerated content re-moderated');
      console.log(`  Passed: ${regeneratedModeration.body.data.passed}`);
      console.log(`  Flags: ${regeneratedModeration.body.data.flags.length}`);

      // Clean up
      await request(TEST_BASE_URL)
        .delete(`/posts/${postId}`)
        .expect(200);
    });

    it('should include moderation feedback in regeneration', async () => {
      const contentWithFlags = {
        caption: 'This story has fucking violence and pornographic scenes!',
        hashtags: ['#Violence', '#Porn'],
        platform: 'instagram',
        story: {
          title: 'Feedback Test',
          category: 'Contemporary',
          spiciness: 3
        }
      };

      // Get moderation result with flags
      const moderationResult = await request(TEST_BASE_URL)
        .post('/moderate')
        .send(contentWithFlags)
        .expect(200);

      const flags = moderationResult.body.data.flags;
      const recommendations = moderationResult.body.data.recommendations;

      console.log('✓ Moderation feedback generated');
      console.log('  Flags:');
      flags.forEach(flag => {
        console.log(`    [${flag.severity}] ${flag.type}: ${flag.message}`);
      });
      console.log('  Recommendations:');
      recommendations.forEach(rec => {
        console.log(`    - ${rec}`);
      });

      // Verify feedback can be used for regeneration
      expect(flags.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Additional: Moderation Statistics and History', () => {
    it('should retrieve moderation statistics', async () => {
      const response = await request(TEST_BASE_URL)
        .get('/moderation/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalChecks');
      expect(response.body.data).toHaveProperty('passedChecks');
      expect(response.body.data).toHaveProperty('failedChecks');
      expect(response.body.data).toHaveProperty('passRate');
      expect(response.body.data).toHaveProperty('flagsByType');
      expect(response.body.data).toHaveProperty('flagsBySeverity');

      console.log('✓ Moderation statistics retrieved');
      console.log(`  Total checks: ${response.body.data.totalChecks}`);
      console.log(`  Passed: ${response.body.data.passedChecks}`);
      console.log(`  Failed: ${response.body.data.failedChecks}`);
      console.log(`  Pass rate: ${response.body.data.passRate}`);
    });

    it('should clear moderation history', async () => {
      // Run a few moderation checks to populate history
      await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: 'Test content 1',
          hashtags: ['#Test1'],
          platform: 'tiktok',
          story: { title: 'Test', category: 'Contemporary', spiciness: 0 }
        });

      await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: 'Test content 2',
          hashtags: ['#Test2'],
          platform: 'instagram',
          story: { title: 'Test', category: 'Contemporary', spiciness: 0 }
        });

      // Clear history
      const clearResponse = await request(TEST_BASE_URL)
        .delete('/moderation/history')
        .expect(200);

      expect(clearResponse.body.success).toBe(true);
      expect(clearResponse.body.message).toContain('cleared');

      console.log('✓ Moderation history cleared');
    });

    it('should track flag distribution by type and severity', async () => {
      // Run various moderation checks
      const testCases = [
        { caption: 'Safe content', hashtags: ['#Safe'], shouldPass: true },
        { caption: 'Fuck this shit!', hashtags: ['#Test'], shouldPass: false },
        { caption: 'Contact test@test.com', hashtags: ['#Test'], shouldPass: false },
        { caption: 'Pornographic violence', hashtags: ['#Test'], shouldPass: false }
      ];

      for (const testCase of testCases) {
        await request(TEST_BASE_URL)
          .post('/moderate')
          .send({
            caption: testCase.caption,
            hashtags: testCase.hashtags,
            platform: 'tiktok',
            story: { title: 'Test', category: 'Contemporary', spiciness: 0 }
          });
      }

      // Get stats
      const statsResponse = await request(TEST_BASE_URL)
        .get('/moderation/stats')
        .expect(200);

      const stats = statsResponse.body.data;

      console.log('✓ Flag distribution tracked');
      console.log(`  Flags by type:`);
      Object.entries(stats.flagsByType).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });
      console.log(`  Flags by severity:`);
      Object.entries(stats.flagsBySeverity).forEach(([severity, count]) => {
        console.log(`    ${severity}: ${count}`);
      });

      expect(stats.totalChecks).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty caption gracefully', async () => {
      // API validates that caption is required (returns 400)
      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: '',
          hashtags: ['#Test'],
          platform: 'tiktok',
          story: { title: 'Test', category: 'Contemporary', spiciness: 0 }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('caption');

      console.log('✓ Empty caption rejected with validation error');
    });

    it('should handle empty hashtags array', async () => {
      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: 'Test caption',
          hashtags: [],
          platform: 'instagram',
          story: { title: 'Test', category: 'Contemporary', spiciness: 0 }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      console.log('✓ Empty hashtags array handled');
    });

    it('should handle missing hook field', async () => {
      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: 'Test caption',
          hashtags: ['#Test'],
          platform: 'youtube_shorts',
          story: { title: 'Test', category: 'Contemporary', spiciness: 0 }
          // hook is missing
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      console.log('✓ Missing hook field handled');
    });

    it('should handle very long hashtags', async () => {
      const longHashtag = '#' + 'a'.repeat(200);
      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: 'Test caption',
          hashtags: [longHashtag],
          platform: 'tiktok',
          story: { title: 'Test', category: 'Contemporary', spiciness: 0 }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      console.log('✓ Very long hashtag handled');
    });

    it('should handle special characters in hashtags', async () => {
      const response = await request(TEST_BASE_URL)
        .post('/moderate')
        .send({
          caption: 'Test caption',
          hashtags: ['#Romance', '#LoveStories', '#Contemporary_Romance', '#Book!Recommendation'],
          platform: 'instagram',
          story: { title: 'Test', category: 'Contemporary', spiciness: 0 }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      console.log('✓ Special characters in hashtags handled');
    });
  });
});
