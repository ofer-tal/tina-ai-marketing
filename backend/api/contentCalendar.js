import express from 'express';
import winston from 'winston';
import BlogPost from '../models/BlogPost.js';

const router = express.Router();

// Create logger for content calendar API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-calendar-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/content-calendar-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/content-calendar.log' }),
  ],
});

/**
 * GET /api/content-calendar
 * Get calendar view for specified date range
 * Query params:
 * - start: ISO date string (start of range)
 * - end: ISO date string (end of range)
 * - status: filter by status (optional)
 * - category: filter by category (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { start, end, status, category } = req.query;

    logger.info('Fetching content calendar', { start, end, status, category });

    // Build query
    const query = {};

    // Filter by date range (scheduled or published dates)
    const dateFilter = {};
    if (start) {
      dateFilter.$gte = new Date(start);
    }
    if (end) {
      dateFilter.$lte = new Date(end);
    }

    // Include posts scheduled or published within the date range
    if (Object.keys(dateFilter).length > 0) {
      query.$or = [
        { scheduledPublishAt: dateFilter },
        { publishedAt: dateFilter }
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    const posts = await BlogPost.find(query)
      .sort({ scheduledPublishAt: 1, publishedAt: 1 })
      .lean();

    // Group posts by date for calendar view
    const calendar = {};
    posts.forEach(post => {
      const date = post.scheduledPublishAt
        ? post.scheduledPublishAt.toISOString().split('T')[0]
        : post.publishedAt
          ? post.publishedAt.toISOString().split('T')[0]
          : post.createdAt.toISOString().split('T')[0];

      if (!calendar[date]) {
        calendar[date] = [];
      }

      calendar[date].push({
        id: post._id,
        title: post.title,
        status: post.status,
        category: post.category,
        contentType: post.contentType,
        scheduledPublishAt: post.scheduledPublishAt,
        publishedAt: post.publishedAt,
        seoScore: post.seoScore,
        wordCount: post.wordCount,
        readTime: post.readTime,
        slug: post.slug
      });
    });

    res.json({
      success: true,
      data: {
        calendar,
        total: posts.length,
        summary: {
          draft: posts.filter(p => p.status === 'draft').length,
          review: posts.filter(p => p.status === 'review').length,
          scheduled: posts.filter(p => p.status === 'scheduled').length,
          published: posts.filter(p => p.status === 'published').length,
          archived: posts.filter(p => p.status === 'archived').length
        }
      }
    });

  } catch (error) {
    logger.error('Get content calendar API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-calendar/posts
 * Get all blog posts with filters and pagination
 * Query params:
 * - status: filter by status (optional)
 * - category: filter by category (optional)
 * - page: page number (default: 1)
 * - limit: items per page (default: 20)
 * - search: search in title and content (optional)
 * - sortBy: sort field (default: scheduledPublishAt)
 * - sortOrder: asc or desc (default: asc)
 */
router.get('/posts', async (req, res) => {
  try {
    const {
      status,
      category,
      page = 1,
      limit = 20,
      search,
      sortBy = 'scheduledPublishAt',
      sortOrder = 'asc'
    } = req.query;

    logger.info('Fetching blog posts', { status, category, page, limit, search });

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const posts = await BlogPost.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await BlogPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get blog posts API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-calendar/posts/:id
 * Get a single blog post by ID
 */
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Fetching blog post', { id });

    const post = await BlogPost.findById(id).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    logger.error('Get blog post API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content-calendar/posts
 * Create a new blog post
 */
router.post('/posts', async (req, res) => {
  try {
    const postData = req.body;

    logger.info('Creating blog post', { title: postData.title });

    const post = new BlogPost(postData);
    await post.save();

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    logger.error('Create blog post API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/content-calendar/posts/:id
 * Update a blog post
 */
router.put('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating blog post', { id, updates });

    const post = await BlogPost.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    logger.error('Update blog post API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/content-calendar/posts/:id/status
 * Update post status
 */
router.patch('/posts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    logger.info('Updating blog post status', { id, status });

    const updateData = { status };

    // Set timestamps based on status
    if (status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    if (status === 'scheduled') {
      updateData.approvedAt = new Date();
    }

    if (status === 'review' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const post = await BlogPost.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    logger.error('Update status API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/content-calendar/posts/:id
 * Delete a blog post
 */
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Deleting blog post', { id });

    const post = await BlogPost.findByIdAndDelete(id);

    if (!post) {
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
    logger.error('Delete blog post API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-calendar/summary
 * Get summary statistics for the calendar
 */
router.get('/summary', async (req, res) => {
  try {
    logger.info('Fetching content calendar summary');

    const [
      totalCount,
      statusCounts,
      upcomingPosts,
      recentPosts,
      categoryCounts
    ] = await Promise.all([
      // Total count
      BlogPost.countDocuments(),

      // Counts by status
      BlogPost.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Upcoming scheduled posts (next 30 days)
      BlogPost.find({
        status: 'scheduled',
        scheduledPublishAt: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      })
        .sort({ scheduledPublishAt: 1 })
        .limit(5)
        .lean(),

      // Recent posts
      BlogPost.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Counts by category
      BlogPost.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format status counts
    const statusSummary = {};
    statusCounts.forEach(item => {
      statusSummary[item._id || 'none'] = item.count;
    });

    // Format category counts
    const categorySummary = {};
    categoryCounts.forEach(item => {
      categorySummary[item._id || 'uncategorized'] = item.count;
    });

    res.json({
      success: true,
      data: {
        total: totalCount,
        byStatus: statusSummary,
        byCategory: categorySummary,
        upcoming: upcomingPosts,
        recent: recentPosts
      }
    });

  } catch (error) {
    logger.error('Get summary API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-calendar/categories
 * Get all unique categories
 */
router.get('/categories', async (req, res) => {
  try {
    logger.info('Fetching categories');

    const categories = await BlogPost.distinct('category');

    res.json({
      success: true,
      data: categories.filter(c => c) // Remove null/undefined
    });

  } catch (error) {
    logger.error('Get categories API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
