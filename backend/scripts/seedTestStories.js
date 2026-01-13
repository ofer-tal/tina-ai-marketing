import mongoose from 'mongoose';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

async function seedTestStories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    const db = mongoose.connection.db;
    const storiesCollection = db.collection('stories');

    // Check if stories already exist
    const existingCount = await storiesCollection.countDocuments({ userId: null });
    logger.info(`Found ${existingCount} existing system stories`);

    // Create test stories
    const testStories = [
      {
        userId: null,
        title: "Forbidden Desires",
        description: "A steamy romance between a CEO and his assistant",
        category: "Contemporary",
        spiciness: 1,
        status: "ready",
        chapters: [
          {
            chapterNumber: 1,
            title: "The Meeting",
            content: "Sarah walked into the boardroom, her heart racing...",
            createdAt: new Date()
          }
        ],
        coverPrompt: "Professional office setting, romantic tension",
        tags: ["romance", "contemporary", "ceo"],
        views: 1250,
        likes: 85,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        publishedAt: new Date('2025-01-01')
      },
      {
        userId: null,
        title: "Moonlit Vows",
        description: "A historical romance set in Victorian England",
        category: "Historical",
        spiciness: 2,
        status: "ready",
        chapters: [
          {
            chapterNumber: 1,
            title: "The Ball",
            content: "Lady Eleanor stepped into the grand ballroom...",
            createdAt: new Date()
          }
        ],
        coverPrompt: "Victorian ballroom, elegant couple dancing",
        tags: ["historical", "victorian", "romance"],
        views: 2100,
        likes: 156,
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
        publishedAt: new Date('2025-01-02')
      },
      {
        userId: null,
        title: "Passionate Storms",
        description: "A billionaire romance with high drama",
        category: "Billionaire",
        spiciness: 2,
        status: "ready",
        chapters: [
          {
            chapterNumber: 1,
            title: "The Encounter",
            content: "Alexandra's car broke down in the rain...",
            createdAt: new Date()
          }
        ],
        coverPrompt: "Luxury car in rain, handsome stranger",
        tags: ["billionaire", "drama", "contemporary"],
        views: 980,
        likes: 67,
        createdAt: new Date('2025-01-03'),
        updatedAt: new Date('2025-01-03'),
        publishedAt: new Date('2025-01-03')
      },
      {
        userId: null,
        title: "Whispers in the Dark",
        description: "A paranormal romance with a vampire twist",
        category: "Paranormal",
        spiciness: 1,
        status: "ready",
        chapters: [
          {
            chapterNumber: 1,
            title: "The Castle",
            content: "The ancient castle loomed against the night sky...",
            createdAt: new Date()
          }
        ],
        coverPrompt: "Gothic castle, moonlight, mysterious figure",
        tags: ["paranormal", "vampire", "gothic"],
        views: 1567,
        likes: 112,
        createdAt: new Date('2025-01-04'),
        updatedAt: new Date('2025-01-04'),
        publishedAt: new Date('2025-01-04')
      },
      {
        userId: null,
        title: "Midnight Confessions",
        description: "A contemporary romance with secrets",
        category: "Contemporary",
        spiciness: 3,
        status: "ready",
        chapters: [
          {
            chapterNumber: 1,
            title: "Secrets",
            content: "Emma had a secret she couldn't tell anyone...",
            createdAt: new Date()
          }
        ],
        coverPrompt: "Midnight cityscape, intimate moment",
        tags: ["contemporary", "drama", "secret"],
        views: 750,
        likes: 45,
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date('2025-01-05'),
        publishedAt: new Date('2025-01-05')
      },
      {
        userId: null,
        title: "This story should be excluded",
        description: "LGBTQ+ romance story",
        category: "LGBTQ+",
        spiciness: 1,
        status: "ready",
        chapters: [
          {
            chapterNumber: 1,
            title: "Beginning",
            content: "The story begins...",
            createdAt: new Date()
          }
        ],
        tags: ["lgbtq+", "romance"],
        views: 500,
        likes: 30,
        createdAt: new Date('2025-01-06'),
        updatedAt: new Date('2025-01-06'),
        publishedAt: new Date('2025-01-06')
      },
      {
        userId: null,
        title: "User Story - Should be excluded",
        description: "This has a userId and should be excluded",
        category: "Contemporary",
        spiciness: 1,
        status: "ready",
        userId: new mongoose.Types.ObjectId(),
        chapters: [
          {
            chapterNumber: 1,
            title: "Start",
            content: "User generated content...",
            createdAt: new Date()
          }
        ],
        tags: ["contemporary"],
        views: 200,
        likes: 10,
        createdAt: new Date('2025-01-07'),
        updatedAt: new Date('2025-01-07'),
        publishedAt: new Date('2025-01-07')
      },
      {
        userId: null,
        title: "Not Ready Yet",
        description: "This story is not ready yet",
        category: "Contemporary",
        spiciness: 1,
        status: "draft",
        chapters: [],
        tags: ["contemporary"],
        views: 0,
        likes: 0,
        createdAt: new Date('2025-01-08'),
        updatedAt: new Date('2025-01-08')
      }
    ];

    // Insert test stories
    const result = await storiesCollection.insertMany(testStories);
    logger.info(`Inserted ${result.length} test stories`);

    // Log summary
    const summary = {
      total: result.length,
      byStatus: {
        ready: testStories.filter(s => s.status === 'ready').length,
        draft: testStories.filter(s => s.status === 'draft').length
      },
      byCategory: {}
    };

    testStories.forEach(story => {
      summary.byCategory[story.category] = (summary.byCategory[story.category] || 0) + 1;
    });

    logger.info('Seed summary:', JSON.stringify(summary, null, 2));

    logger.info('✅ Test stories seeded successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Error seeding test stories:', error);
    process.exit(1);
  }
}

// Run the seed function
seedTestStories();
