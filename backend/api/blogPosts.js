/**
 * Blog Posts API Routes
 * Handles blog post generation and management
 */

import express from 'express';
import blogPostGenerator from '../services/blogPostGenerator.js';
import { MongoClient, ObjectId } from 'mongodb';

const router = express.Router();

// MongoDB connection
let db;
async function getDatabase() {
  if (!db) {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db();
  }
  return db;
}

/**
 * POST /api/blog-posts/outline
 * Generate blog post outline
 */
router.post('/outline', async (req, res) => {
  try {
    const { topic, tone, targetAudience, keywords } = req.body;

    // Validate required fields
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    const result = await blogPostGenerator.generateOutline(
      topic,
      tone || 'professional',
      targetAudience || 'general',
      keywords || []
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in POST /api/blog-posts/outline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/blog-posts/generate
 * Generate full blog post content
 */
router.post('/generate', async (req, res) => {
  try {
    const { topic, outline, tone, seoKeywords } = req.body;

    // Validate required fields
    if (!topic || !outline) {
      return res.status(400).json({
        success: false,
        error: 'Topic and outline are required'
      });
    }

    const result = await blogPostGenerator.generateContent(
      topic,
      outline,
      tone || 'professional',
      seoKeywords || []
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in POST /api/blog-posts/generate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/blog-posts/complete
 * Generate complete blog post (outline + content)
 */
router.post('/complete', async (req, res) => {
  try {
    const { topic, tone, targetAudience, keywords, includeSEO, targetLength } = req.body;

    // Validate required fields
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    const result = await blogPostGenerator.generateCompletePost(topic, {
      tone: tone || 'professional',
      targetAudience: targetAudience || 'general',
      keywords: keywords || [],
      includeSEO: includeSEO !== false,
      targetLength: targetLength || 1000
    });

    if (result.success) {
      // Save to database
      const database = await getDatabase();
      const collection = database.collection('marketing_blog_posts');

      const blogPost = {
        topic: result.topic,
        tone: result.tone,
        targetAudience: result.targetAudience,
        outline: result.outline,
        content: result.content,
        wordCount: result.wordCount,
        estimatedReadTime: result.estimatedReadTime,
        seoMetadata: result.seoMetadata,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertResult = await collection.insertOne(blogPost);

      res.json({
        ...result,
        id: insertResult.insertedId.toString(),
        saved: true
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in POST /api/blog-posts/complete:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/blog-posts
 * Get all blog posts
 */
router.get('/', async (req, res) => {
  try {
    const database = await getDatabase();
    const collection = database.collection('marketing_blog_posts');

    const { status, limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const posts = await collection
      .find(query)
      .sort({ [sortBy]: parseInt(sortOrder) })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();

    const total = await collection.countDocuments(query);

    res.json({
      success: true,
      posts,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Error in GET /api/blog-posts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/blog-posts/:id
 * Get a specific blog post
 */
router.get('/:id', async (req, res) => {
  try {
    const database = await getDatabase();
    const collection = database.collection('marketing_blog_posts');

    const post = await collection.findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error in GET /api/blog-posts/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/blog-posts/:id
 * Update a blog post
 */
router.put('/:id', async (req, res) => {
  try {
    const database = await getDatabase();
    const collection = database.collection('marketing_blog_posts');

    const { topic, content, outline, seoMetadata, status } = req.body;

    const updateData = {
      updatedAt: new Date()
    };

    if (topic !== undefined) updateData.topic = topic;
    if (content !== undefined) updateData.content = content;
    if (outline !== undefined) updateData.outline = outline;
    if (seoMetadata !== undefined) updateData.seoMetadata = seoMetadata;
    if (status !== undefined) updateData.status = status;

    // Recalculate word count and read time if content changed
    if (content !== undefined) {
      updateData.wordCount = content.split(/\s+/).length;
      updateData.estimatedReadTime = Math.ceil(content.split(/\s+/).length / 200);
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    const updatedPost = await collection.findOne({
      _id: new ObjectId(req.params.id)
    });

    res.json({
      success: true,
      post: updatedPost
    });
  } catch (error) {
    console.error('Error in PUT /api/blog-posts/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/blog-posts/:id
 * Delete a blog post
 */
router.delete('/:id', async (req, res) => {
  try {
    const database = await getDatabase();
    const collection = database.collection('marketing_blog_posts');

    const result = await collection.deleteOne({
      _id: new ObjectId(req.params.id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/blog-posts/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/blog-posts/:id/export
 * Export blog post in different formats
 */
router.post('/:id/export', async (req, res) => {
  try {
    const { format } = req.body; // markdown, html, pdf

    const database = await getDatabase();
    const collection = database.collection('marketing_blog_posts');

    const post = await collection.findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    let exportedContent;

    switch (format) {
      case 'markdown':
        exportedContent = {
          format: 'markdown',
          content: post.content,
          filename: `${post.seoMetadata?.slug || post.topic.replace(/\s+/g, '-')}.md`
        };
        break;

      case 'html':
        exportedContent = {
          format: 'html',
          content: convertMarkdownToHTML(post.content),
          filename: `${post.seoMetadata?.slug || post.topic.replace(/\s+/g, '-')}.html`
        };
        break;

      case 'pdf':
        // PDF generation would require additional libraries
        exportedContent = {
          format: 'pdf',
          content: 'PDF generation not yet implemented',
          filename: `${post.seoMetadata?.slug || post.topic.replace(/\s+/g, '-')}.pdf`
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Supported: markdown, html'
        });
    }

    res.json({
      success: true,
      ...exportedContent
    });
  } catch (error) {
    console.error('Error in POST /api/blog-posts/:id/export:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/blog-posts/stats/summary
 * Get blog post statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const database = await getDatabase();
    const collection = database.collection('marketing_blog_posts');

    const total = await collection.countDocuments();
    const draft = await collection.countDocuments({ status: 'draft' });
    const review = await collection.countDocuments({ status: 'review' });
    const published = await collection.countDocuments({ status: 'published' });

    const totalWords = await collection
      .aggregate([
        { $group: { _id: null, total: { $sum: '$wordCount' } } }
      ])
      .toArray();

    res.json({
      success: true,
      stats: {
        total,
        draft,
        review,
        published,
        totalWords: totalWords[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error in GET /api/blog-posts/stats/summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to convert markdown to HTML (simplified)
function convertMarkdownToHTML(markdown) {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  return html;
}

export default router;
