/**
 * Press Releases API Routes
 */

import express from 'express';
import pressReleaseGenerator from '../services/pressReleaseGenerator.js';
import MarketingPressRelease from '../models/MarketingPressRelease.js';

const router = express.Router();

/**
 * POST /api/press-releases/outline
 * Generate press release outline
 */
router.post('/outline', async (req, res) => {
  try {
    const { updates, tone } = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Updates object is required',
        details: 'Please provide the updates to announce in the press release'
      });
    }

    const outline = await pressReleaseGenerator.generateOutline(updates, tone);

    res.json({
      success: true,
      data: outline
    });
  } catch (error) {
    console.error('Error generating press release outline:', error);
    res.status(500).json({
      error: 'Failed to generate press release outline',
      details: error.message
    });
  }
});

/**
 * POST /api/press-releases/generate
 * Generate press release content from outline
 */
router.post('/generate', async (req, res) => {
  try {
    const { outline, updates, tone } = req.body;

    if (!outline) {
      return res.status(400).json({
        error: 'Outline is required',
        details: 'Please provide the outline to generate content from'
      });
    }

    const content = await pressReleaseGenerator.generateContent(outline, updates, tone);

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error generating press release content:', error);
    res.status(500).json({
      error: 'Failed to generate press release content',
      details: error.message
    });
  }
});

/**
 * POST /api/press-releases/complete
 * Generate complete press release and save to database
 */
router.post('/complete', async (req, res) => {
  try {
    const { updates, tone, companyInfo } = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Updates object is required',
        details: 'Please provide the updates to announce in the press release'
      });
    }

    const pressRelease = await pressReleaseGenerator.generateCompleteRelease(
      updates,
      tone || 'professional',
      companyInfo || {}
    );

    // Save to database
    const savedRelease = await MarketingPressRelease.create({
      headline: pressRelease.headline,
      dateline: pressRelease.dateline,
      leadParagraph: pressRelease.leadParagraph,
      bodyParagraphs: pressRelease.bodyParagraphs,
      quotes: pressRelease.quotes,
      callToAction: pressRelease.callToAction,
      boilerplate: pressRelease.boilerplate,
      aboutSection: pressRelease.aboutSection,
      mediaContact: pressRelease.mediaContact,
      companyInfo: pressRelease.companyInfo,
      updates: updates,
      tone: tone || 'professional',
      wordCount: pressReleaseGenerator.getWordCount(pressRelease),
      readingTime: pressReleaseGenerator.getReadingTime(
        pressReleaseGenerator.getWordCount(pressRelease)
      ),
      status: 'draft',
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      data: {
        ...pressRelease,
        _id: savedRelease._id,
        id: savedRelease._id
      }
    });
  } catch (error) {
    console.error('Error generating complete press release:', error);
    res.status(500).json({
      error: 'Failed to generate complete press release',
      details: error.message
    });
  }
});

/**
 * GET /api/press-releases
 * Get all press releases with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status, limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const pressReleases = await MarketingPressRelease.find(filter)
      .sort({ [sortBy]: parseInt(sortOrder) })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await MarketingPressRelease.countDocuments(filter);

    res.json({
      success: true,
      data: pressReleases,
      meta: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    console.error('Error fetching press releases:', error);
    res.status(500).json({
      error: 'Failed to fetch press releases',
      details: error.message
    });
  }
});

/**
 * GET /api/press-releases/:id
 * Get specific press release
 */
router.get('/:id', async (req, res) => {
  try {
    const pressRelease = await MarketingPressRelease.findById(req.params.id);

    if (!pressRelease) {
      return res.status(404).json({
        error: 'Press release not found',
        details: `No press release found with ID: ${req.params.id}`
      });
    }

    res.json({
      success: true,
      data: pressRelease
    });
  } catch (error) {
    console.error('Error fetching press release:', error);
    res.status(500).json({
      error: 'Failed to fetch press release',
      details: error.message
    });
  }
});

/**
 * PUT /api/press-releases/:id
 * Update press release
 */
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;

    updates.updatedAt = new Date();

    // Recalculate word count if content changed
    if (updates.headline || updates.leadParagraph || updates.bodyParagraphs) {
      const existing = await MarketingPressRelease.findById(req.params.id);
      const content = {
        headline: updates.headline || existing.headline,
        leadParagraph: updates.leadParagraph || existing.leadParagraph,
        bodyParagraphs: updates.bodyParagraphs || existing.bodyParagraphs,
        boilerplate: updates.boilerplate || existing.boilerplate
      };
      updates.wordCount = pressReleaseGenerator.getWordCount(content);
      updates.readingTime = pressReleaseGenerator.getReadingTime(updates.wordCount);
    }

    const pressRelease = await MarketingPressRelease.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!pressRelease) {
      return res.status(404).json({
        error: 'Press release not found',
        details: `No press release found with ID: ${req.params.id}`
      });
    }

    res.json({
      success: true,
      data: pressRelease
    });
  } catch (error) {
    console.error('Error updating press release:', error);
    res.status(500).json({
      error: 'Failed to update press release',
      details: error.message
    });
  }
});

/**
 * DELETE /api/press-releases/:id
 * Delete press release
 */
router.delete('/:id', async (req, res) => {
  try {
    const pressRelease = await MarketingPressRelease.findByIdAndDelete(req.params.id);

    if (!pressRelease) {
      return res.status(404).json({
        error: 'Press release not found',
        details: `No press release found with ID: ${req.params.id}`
      });
    }

    res.json({
      success: true,
      message: 'Press release deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error('Error deleting press release:', error);
    res.status(500).json({
      error: 'Failed to delete press release',
      details: error.message
    });
  }
});

/**
 * POST /api/press-releases/:id/export
 * Export press release
 */
router.post('/:id/export', async (req, res) => {
  try {
    const { format = 'txt' } = req.body;

    const pressRelease = await MarketingPressRelease.findById(req.params.id);

    if (!pressRelease) {
      return res.status(404).json({
        error: 'Press release not found',
        details: `No press release found with ID: ${req.params.id}`
      });
    }

    let content = '';
    let contentType = 'text/plain';
    let filename = `press-release-${pressRelease._id}`;

    if (format === 'txt') {
      content = pressReleaseGenerator.formatAsText(pressRelease);
      contentType = 'text/plain';
      filename += '.txt';
    } else if (format === 'html') {
      content = pressReleaseGenerator.formatAsHTML(pressRelease);
      contentType = 'text/html';
      filename += '.html';
    } else if (format === 'md') {
      content = pressReleaseGenerator.formatAsMarkdown(pressRelease);
      contentType = 'text/markdown';
      filename += '.md';
    }

    res.json({
      success: true,
      data: {
        content,
        contentType,
        filename
      }
    });
  } catch (error) {
    console.error('Error exporting press release:', error);
    res.status(500).json({
      error: 'Failed to export press release',
      details: error.message
    });
  }
});

/**
 * POST /api/press-releases/:id/publish
 * Mark press release as ready for distribution
 */
router.post('/:id/publish', async (req, res) => {
  try {
    const pressRelease = await MarketingPressRelease.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'ready',
          readyForDistribution: true,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!pressRelease) {
      return res.status(404).json({
        error: 'Press release not found',
        details: `No press release found with ID: ${req.params.id}`
      });
    }

    res.json({
      success: true,
      message: 'Press release marked as ready for distribution',
      data: pressRelease
    });
  } catch (error) {
    console.error('Error marking press release as ready:', error);
    res.status(500).json({
      error: 'Failed to mark press release as ready',
      details: error.message
    });
  }
});

/**
 * GET /api/press-releases/stats/summary
 * Get press release statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await MarketingPressRelease.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          ready: {
            $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] }
          },
          distributed: {
            $sum: { $cond: [{ $eq: ['$status', 'distributed'] }, 1, 0] }
          },
          totalWords: { $sum: '$wordCount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        draft: 0,
        ready: 0,
        distributed: 0,
        totalWords: 0
      }
    });
  } catch (error) {
    console.error('Error fetching press release stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

export default router;
