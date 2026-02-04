import express from 'express';
import { getLogger } from '../../utils/logger.js';
import TinaReflection from '../../models/TinaReflection.js';

const router = express.Router();
const logger = getLogger('api', 'tina-reflections');

/**
 * GET /api/tina/reflections
 * List reflections
 */
router.get('/', async (req, res) => {
  try {
    const { year, status, limit = 12 } = req.query;

    const query = {};
    if (year) query.year = parseInt(year);
    if (status && status !== 'all') query.status = status;

    const reflections = await TinaReflection.find(query)
      .sort({ weekOf: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: reflections
    });

  } catch (error) {
    logger.error('Error fetching reflections', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tina/reflections/current
 * Get current week's reflection
 */
router.get('/current', async (req, res) => {
  try {
    const reflection = await TinaReflection.getCurrentWeek();

    res.json({
      success: true,
      data: reflection
    });

  } catch (error) {
    logger.error('Error fetching current reflection', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tina/reflections/stats
 * Get reflection statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      byYear: {},
      bySentiment: {},
      byStatus: {},
      total: 0,
      thisYear: 0
    };

    const currentYear = new Date().getFullYear();

    // Get by year
    const byYear = await TinaReflection.aggregate([
      { $group: { _id: '$year', count: { $sum: 1 } } }
    ]);
    byYear.forEach(item => {
      stats.byYear[item._id] = item.count;
    });

    // Get by sentiment
    const bySentiment = await TinaReflection.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } }
    ]);
    bySentiment.forEach(item => {
      stats.bySentiment[item._id] = item.count;
    });

    // Get by status
    const byStatus = await TinaReflection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    byStatus.forEach(item => {
      stats.byStatus[item._id] = item.count;
    });

    stats.total = await TinaReflection.countDocuments();
    stats.thisYear = await TinaReflection.countDocuments({ year: currentYear });

    // Get average overall score
    const avgScore = await TinaReflection.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
    ]);
    stats.avgOverallScore = avgScore[0]?.avgScore || 50;

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching reflection stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tina/reflections/trends
 * Get sentiment trends over time
 */
router.get('/trends', async (req, res) => {
  try {
    const { year, limit = 12 } = req.query;

    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const reflections = await TinaReflection.getSentimentTrends(currentYear, parseInt(limit));

    const trends = reflections.map(r => ({
      weekNumber: r.weekNumber,
      weekOf: r.weekOf,
      sentiment: r.sentiment,
      overallScore: r.overallScore,
      winsCount: r.winsCount,
      lossesCount: r.lossesCount
    }));

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    logger.error('Error fetching reflection trends', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tina/reflections/:id
 * Get single reflection
 */
router.get('/:id', async (req, res) => {
  try {
    const reflection = await TinaReflection.findOne({
      $or: [{ _id: req.params.id }, { reflectionId: req.params.id }]
    });

    if (!reflection) {
      return res.status(404).json({
        success: false,
        error: 'Reflection not found'
      });
    }

    res.json({
      success: true,
      data: reflection
    });

  } catch (error) {
    logger.error('Error fetching reflection', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tina/reflections
 * Create a new reflection
 */
router.post('/', async (req, res) => {
  try {
    const {
      weekOf,
      sections,
      metrics,
      sentiment,
      overallScore,
      improvementAreas,
      continueDoing,
      stopDoing,
      startDoing,
      nextWeekPriorities,
      summary
    } = req.body;

    const reflection = new TinaReflection({
      weekOf: weekOf ? new Date(weekOf) : new Date(),
      sections: sections || [],
      metrics: metrics || [],
      sentiment: sentiment || 'neutral',
      overallScore: overallScore || 50,
      improvementAreas: improvementAreas || [],
      continueDoing: continueDoing || [],
      stopDoing: stopDoing || [],
      startDoing: startDoing || [],
      nextWeekPriorities: nextWeekPriorities || [],
      summary: summary || '',
      status: 'draft'
    });

    await reflection.save();

    logger.info('Reflection created', { reflectionId: reflection.reflectionId });

    res.status(201).json({
      success: true,
      data: reflection
    });

  } catch (error) {
    logger.error('Error creating reflection', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tina/reflections/:id/complete
 * Mark reflection as completed
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const reflection = await TinaReflection.findOne({
      $or: [{ _id: req.params.id }, { reflectionId: req.params.id }]
    });

    if (!reflection) {
      return res.status(404).json({
        success: false,
        error: 'Reflection not found'
      });
    }

    await reflection.complete();

    logger.info('Reflection completed', { reflectionId: reflection.reflectionId });

    res.json({
      success: true,
      data: reflection
    });

  } catch (error) {
    logger.error('Error completing reflection', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tina/reflections/:id/add-section
 * Add a section to a reflection
 */
router.post('/:id/add-section', async (req, res) => {
  try {
    const { title, content, category, relatedIds } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'title and content are required'
      });
    }

    const reflection = await TinaReflection.findOne({
      $or: [{ _id: req.params.id }, { reflectionId: req.params.id }]
    });

    if (!reflection) {
      return res.status(404).json({
        success: false,
        error: 'Reflection not found'
      });
    }

    await reflection.addSection(title, content, category, relatedIds || []);

    logger.info('Section added to reflection', { reflectionId: reflection.reflectionId, title });

    res.json({
      success: true,
      data: reflection
    });

  } catch (error) {
    logger.error('Error adding section to reflection', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/tina/reflections/:id
 * Update a reflection
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      sections,
      metrics,
      sentiment,
      overallScore,
      improvementAreas,
      continueDoing,
      stopDoing,
      startDoing,
      nextWeekPriorities,
      summary
    } = req.body;

    const reflection = await TinaReflection.findOne({
      $or: [{ _id: req.params.id }, { reflectionId: req.params.id }]
    });

    if (!reflection) {
      return res.status(404).json({
        success: false,
        error: 'Reflection not found'
      });
    }

    if (sections) reflection.sections = sections;
    if (metrics) reflection.metrics = metrics;
    if (sentiment) reflection.sentiment = sentiment;
    if (overallScore !== undefined) reflection.overallScore = overallScore;
    if (improvementAreas) reflection.improvementAreas = improvementAreas;
    if (continueDoing) reflection.continueDoing = continueDoing;
    if (stopDoing) reflection.stopDoing = stopDoing;
    if (startDoing) reflection.startDoing = startDoing;
    if (nextWeekPriorities) reflection.nextWeekPriorities = nextWeekPriorities;
    if (summary !== undefined) reflection.summary = summary;

    await reflection.save();

    logger.info('Reflection updated', { reflectionId: reflection.reflectionId });

    res.json({
      success: true,
      data: reflection
    });

  } catch (error) {
    logger.error('Error updating reflection', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
