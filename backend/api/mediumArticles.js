/**
 * Medium Articles API Routes
 * CRUD operations for Medium article management
 */

import express from 'express';
const router = express.Router();
import mediumArticleGenerator from '../services/mediumArticleGenerator.js';
import MarketingMediumArticle from '../models/MarketingMediumArticle.js';

/**
 * POST /api/medium-articles/outline
 * Generate Medium article outline
 */
router.post('/outline', async (req, res) => {
  try {
    const { topic, targetAudience, tone, keywords } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    const config = {
      topic,
      targetAudience: targetAudience || 'General',
      tone: tone || 'Informative',
      keywords: keywords || []
    };

    const outline = await mediumArticleGenerator.generateOutline(config);

    res.json({
      success: true,
      data: outline
    });
  } catch (error) {
    console.error('Error generating outline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/medium-articles/generate
 * Generate Medium article content from outline
 */
router.post('/generate', async (req, res) => {
  try {
    const { outline, topic, tone, targetAudience } = req.body;

    if (!outline || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Outline and topic are required'
      });
    }

    const config = { topic, tone, targetAudience };
    const content = await mediumArticleGenerator.generateContent(outline, config);

    res.json({
      success: true,
      data: { content }
    });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/medium-articles/complete
 * Generate complete Medium article (outline + content + save)
 */
router.post('/complete', async (req, res) => {
  try {
    const { topic, targetAudience, tone, keywords } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    const config = {
      topic,
      targetAudience: targetAudience || 'General',
      tone: tone || 'Informative',
      keywords: keywords || []
    };

    // Generate complete article
    const article = await mediumArticleGenerator.generateCompleteArticle(config);

    // Save to database
    const savedArticle = new MarketingMediumArticle({
      ...article,
      seo: mediumArticleGenerator.generateMediumSEO(article)
    });

    await savedArticle.save();

    res.json({
      success: true,
      data: savedArticle
    });
  } catch (error) {
    console.error('Error generating complete article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/medium-articles
 * List all Medium articles with filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status, tag, search, limit = 50, skip = 0 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (tag) query['metadata.tags'] = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const articles = await MarketingMediumArticle
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await MarketingMediumArticle.countDocuments(query);

    res.json({
      success: true,
      data: {
        articles,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/medium-articles/:id
 * Get specific Medium article
 */
router.get('/:id', async (req, res) => {
  try {
    const article = await MarketingMediumArticle.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/medium-articles/:id
 * Update Medium article
 */
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = new Date();

    // Update SEO if title or content changed
    if (updates.title || updates.content) {
      const current = await MarketingMediumArticle.findById(req.params.id);
      if (current) {
        const merged = { ...current.toObject(), ...updates };
        updates.seo = mediumArticleGenerator.generateMediumSEO(merged);
      }
    }

    const article = await MarketingMediumArticle.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/medium-articles/:id
 * Delete Medium article
 */
router.delete('/:id', async (req, res) => {
  try {
    const article = await MarketingMediumArticle.findByIdAndDelete(req.params.id);

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/medium-articles/:id/export
 * Export Medium article (markdown/html)
 */
router.post('/:id/export', async (req, res) => {
  try {
    const { format = 'markdown' } = req.body;
    const article = await MarketingMediumArticle.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    let content;
    let contentType;
    let filename;

    if (format === 'markdown') {
      content = article.content;
      contentType = 'text/markdown';
      filename = `${article.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    } else if (format === 'html') {
      // Convert markdown to basic HTML
      content = convertMarkdownToHtml(article.content);
      contentType = 'text/html';
      filename = `${article.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    } else {
      return res.status(400).json({ success: false, error: 'Invalid format' });
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    res.send(content);
  } catch (error) {
    console.error('Error exporting article:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/medium-articles/:id/publish
 * Mark article as ready for Medium publishing
 */
router.post('/:id/publish', async (req, res) => {
  try {
    const article = await MarketingMediumArticle.findByIdAndUpdate(
      req.params.id,
      {
        status: 'ready',
        publishedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    res.json({
      success: true,
      data: article,
      message: 'Article marked as ready for publishing to Medium'
    });
  } catch (error) {
    console.error('Error marking article as published:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/medium-articles/stats/summary
 * Get Medium article statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await MarketingMediumArticle.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
          ready: { $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] } },
          published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          totalWords: { $sum: '$wordCount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || { total: 0, draft: 0, review: 0, ready: 0, published: 0, totalWords: 0 }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/medium-articles/cache/clear
 * Clear generator cache
 */
router.post('/cache/clear', (req, res) => {
  try {
    const result = mediumArticleGenerator.clearCache();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper: Convert markdown to basic HTML
 */
function convertMarkdownToHtml(markdown) {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Bullet points
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return html;
}

export default router;
