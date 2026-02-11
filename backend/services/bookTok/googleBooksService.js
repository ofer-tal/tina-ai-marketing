/**
 * Google Books API Service
 *
 * Free API for book data (no API key required for basic usage)
 * Replaces Goodreads API which is deprecated
 *
 * API Docs: https://developers.google.com/books/docs/v1/using
 * Free tier: 1,000 requests per day (no key required)
 *
 * NOTE: Daily quota can be exhausted. Service will return empty results when quota exceeded.
 */

import { getLogger } from '../../utils/logger.js';
import MarketingBook from '../../models/MarketingBook.js';

const logger = getLogger('services', 'booktok-google-books');

const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY; // Optional

// Romance-related genres for filtering
const ROMANCE_GENRES = [
  'Fiction / Romance',
  'Fiction / Contemporary',
  'Fiction / Historical',
  'Fiction / Fantasy',
  'Romance',
  'Love Stories'
];

class GoogleBooksService {
  constructor(config = {}) {
    this.isRunning = false;
    this.lastRunTime = null;
    this.booksCollected = 0;

    logger.info('Google Books Service initialized', {
      hasApiKey: !!GOOGLE_BOOKS_API_KEY
    });
  }

  /**
   * Make a GET request to Google Books API
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint) {
    const url = `${GOOGLE_BOOKS_BASE_URL}${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn(`Google Books API rate limit exceeded (429)`);
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw new Error(`Google Books API returned ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for books by query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of book data
   */
  async searchBooks(query, options = {}) {
    const {
      maxResults = 20,
      langRestrict = 'en',
      printType = 'books'
    } = options;

    try {
      logger.debug(`Searching Google Books for: ${query}`, {
        hasApiKey: !!GOOGLE_BOOKS_API_KEY,
        apiKeyPrefix: GOOGLE_BOOKS_API_KEY ? GOOGLE_BOOKS_API_KEY.substring(0, 10) + '...' : 'none'
      });

      // Build query string manually since BaseApiClient doesn't handle params
      const queryParams = new URLSearchParams({
        q: query,
        maxResults: Math.min(maxResults, 40).toString(), // API max is 40
        langRestrict,
        printType
      });

      // Add API key if available (higher quota)
      if (GOOGLE_BOOKS_API_KEY) {
        queryParams.append('key', GOOGLE_BOOKS_API_KEY);
      }

      const response = await this.get(`/volumes?${queryParams.toString()}`);

      // Google Books API returns data directly (not wrapped in 'data' property)
      if (response.items) {
        const books = response.items.map(item => this.normalizeGoogleBook(item));

        // Store books in database
        for (const book of books) {
          await this.storeBook(book);
        }

        logger.debug(`Found ${books.length} books for query: ${query}`);
        return books;
      }

      return [];

    } catch (error) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        logger.warn('Google Books API quota exceeded - returning empty results');
        return [];
      }
      logger.error('Error searching Google Books', {
        error: error.message,
        query
      });
      return [];
    }
  }

  /**
   * Get trending romance books
   * @param {number} limit - Maximum books to fetch
   * @returns {Promise<Array>} Array of trending romance books
   */
  async fetchTrendingRomanceBooks(limit = 50) {
    if (this.isRunning) {
      logger.warn('Google Books fetch already in progress');
      return [];
    }

    this.isRunning = true;
    const startTime = Date.now();
    const allBooks = [];

    try {
      logger.info('Fetching trending romance books from Google Books', { limit });

      // Known popular romance authors to search for
      // Google Books search by author is more reliable than general romance searches
      const romanceAuthors = [
        'Colleen Hoover',
        'Emily Henry',
        'Rebecca Yarros',
        'Ali Hazelwood',
        'TJ Klune',
        'Lucy Score',
        'Ana Huang',
        'Christina Lauren',
        'Emily Wilde',
        'Harley Laroux'
      ];

      const booksPerAuthor = Math.ceil(limit / romanceAuthors.length);

      // Search for each author and collect their books
      for (const author of romanceAuthors) {
        const query = `inauthor:"${author}"`;

        const books = await this.searchBooks(query, {
          maxResults: booksPerAuthor,
          orderBy: 'relevance'
        });

        allBooks.push(...books);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      this.booksCollected = allBooks.length;
      this.lastRunTime = new Date();

      const duration = Date.now() - startTime;
      logger.info('Google Books romance collection completed', {
        booksCollected: allBooks.length,
        duration: `${duration}ms`
      });

      return allBooks;

    } catch (error) {
      logger.error('Error in fetchTrendingRomanceBooks', {
        error: error.message,
        stack: error.stack
      });
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get detailed information about a specific book
   * @param {string} volumeId - Google Books volume ID
   * @returns {Promise<Object|null>} Book details
   */
  async fetchBookDetails(volumeId) {
    try {
      logger.debug(`Fetching book details for volume ID: ${volumeId}`);

      // Build query string for API key
      let url = `/volumes/${volumeId}`;
      if (GOOGLE_BOOKS_API_KEY) {
        url += `?key=${encodeURIComponent(GOOGLE_BOOKS_API_KEY)}`;
      }

      const response = await this.get(url);

      // Google Books API returns data directly
      if (response) {
        const book = this.normalizeGoogleBook(response);
        await this.storeBook(book);
        return book;
      }

      return null;

    } catch (error) {
      logger.error(`Error fetching book details for ${volumeId}`, {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Normalize Google Books API response to our format
   * @param {Object} volume - Google Books volume
   * @returns {Object} Normalized book data
   */
  normalizeGoogleBook(volume) {
    const info = volume.volumeInfo || {};
    const saleInfo = volume.saleInfo || {};

    // Extract industry identifiers
    const isbn10 = info.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier;
    const isbn13 = info.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier;

    return {
      title: info.title || 'Unknown',
      author: info.authors?.join(', ') || 'Unknown',
      goodreadsId: isbn13 || isbn10, // Use ISBN as ID
      isbn10,
      isbn13,
      googleBooksId: volume.id,
      coverImageUrl: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null,
      publishedDate: info.publishedDate,
      pageCount: info.pageCount,
      genre: info.categories?.find(cat =>
        ROMANCE_GENRES.some(rg => cat.toLowerCase().includes(rg.toLowerCase()))
      ) || info.categories?.[0] || 'romance',
      subgenre: info.categories?.slice(1) || [],
      description: info.description || '',
      language: info.language,
      averageRating: info.averageRating,
      ratingsCount: info.ratingsCount,
      previewLink: info.previewLink,
      infoLink: info.infoLink,
      buyLink: saleInfo.buyLink,
      listPrice: saleInfo.listPrice?.amount,
      currencyCode: saleInfo.listPrice?.currencyCode
    };
  }

  /**
   * Store book in database
   * @param {Object} bookData - Book data to store
   * @returns {Promise<Object>} Stored book
   */
  async storeBook(bookData) {
    try {
      // Check if book already exists by ISBN or Google Books ID
      const existing = await MarketingBook.findOne({
        $or: [
          { goodreadsId: bookData.isbn13 || bookData.isbn10 },
          { googleBooksId: bookData.googleBooksId },
          { title: bookData.title, author: bookData.author }
        ]
      });

      if (existing) {
        // Update existing book with fresh data
        existing.coverImageUrl = bookData.coverImageUrl || existing.coverImageUrl;
        existing.averageRating = bookData.averageRating || existing.averageRating;
        existing.ratingsCount = bookData.ratingsCount || existing.ratingsCount;
        existing.description = bookData.description || existing.description;
        existing.lastTrendUpdate = new Date();
        await existing.save();
        return existing;
      }

      // Detect tropes from description
      const tropes = this.detectTropes(bookData.description);

      // Detect spice level from description and ratings
      const spiceLevel = this.detectSpiceLevel(bookData.description);

      // Create new book
      const book = await MarketingBook.create({
        title: bookData.title,
        author: bookData.author,
        goodreadsId: bookData.isbn13 || bookData.isbn10,
        googleBooksId: bookData.googleBooksId,
        isbn10: bookData.isbn10,
        isbn13: bookData.isbn13,
        coverImageUrl: bookData.coverImageUrl,
        publishedDate: bookData.publishedDate ? new Date(bookData.publishedDate) : undefined,
        pageCount: bookData.pageCount,
        genre: bookData.genre || 'romance',
        subgenre: bookData.subgenre,
        description: bookData.description,
        language: bookData.language,
        averageRating: bookData.averageRating,
        ratingsCount: bookData.ratingsCount,
        tropes,
        spiceLevel,
        previewLink: bookData.previewLink,
        infoLink: bookData.infoLink,
        buyLink: bookData.buyLink,
        listPrice: bookData.listPrice,
        active: true,
        currentTrendScore: this.calculateInitialTrendScore(bookData),
        popularityScore: this.calculateInitialPopularityScore(bookData)
      });

      return book;

    } catch (error) {
      logger.error('Error storing book', {
        error: error.message,
        title: bookData.title
      });
      return null;
    }
  }

  /**
   * Detect tropes from book description
   * @param {string} description - Book description
   * @returns {Array<string>} Detected tropes
   */
  detectTropes(description) {
    if (!description) return [];

    const desc = description.toLowerCase();
    const detectedTropes = new Set();

    const tropeKeywords = {
      'enemies to lovers': ['enemies', 'rivals', 'enemy to lover', 'nemeses'],
      'fake dating': ['fake dating', 'fake relationship', 'fake boyfriend', 'fake girlfriend'],
      'friends to lovers': ['friends to lovers', 'best friend', 'friendship'],
      'forced proximity': ['forced proximity', 'trapped', 'stuck together', 'roommates', 'only one bed'],
      'grumpy x sunshine': ['grumpy', 'sunshine', 'grump and sunshine'],
      'age gap': ['age gap', 'older', 'younger'],
      'single dad': ['single dad', 'father', 'single father'],
      'second chance': ['second chance', 'reunion', 'ex'],
      'arranged marriage': ['arranged marriage', 'marriage of convenience', 'contract marriage'],
      'billionaire': ['billionaire', 'millionaire', 'rich', 'ceo'],
      'sports romance': ['sports', 'athlete', 'football', 'hockey', 'baseball'],
      'small town': ['small town', 'rural', 'country'],
      'holiday': ['christmas', 'holiday', 'thanksgiving', 'valentine'],
      'accidental pregnancy': ['accidental pregnancy', 'unexpected', 'baby'],
      'reverse harem': ['reverse harem', 'rh', 'why choose'],
      'love triangle': ['love triangle', 'triangle'],
      'slow burn': ['slow burn'],
      'office romance': ['office', 'work', 'boss', 'coworker'],
      'bodyguard': ['bodyguard', 'protector'],
      'royalty': ['prince', 'princess', 'king', 'queen', 'royal']
    };

    for (const [trope, keywords] of Object.entries(tropeKeywords)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword)) {
          detectedTropes.add(trope);
          break;
        }
      }
    }

    return Array.from(detectedTropes);
  }

  /**
   * Detect spice level from description and keywords
   * @param {string} description - Book description
   * @returns {number} Spice level (0-5)
   */
  detectSpiceLevel(description = '') {
    if (!description) return 2;

    const desc = description.toLowerCase();

    const spiceIndicators = {
      5: ['explicit', 'erotica', 'very steamy', 'scorching', 'explicit sexual'],
      4: ['steamy', 'hot', 'spicy', 'heat level', 'lots of steam'],
      3: ['some steam', 'moderate heat', 'sizzle'],
      2: ['romance', 'love story', 'passion'],
      1: ['sweet', 'clean', 'wholesome', 'kisses'],
      0: ['clean', 'sweet', 'wholesome', 'no spice']
    };

    for (const [level, indicators] of Object.entries(spiceIndicators).sort((a, b) => b[0] - a[0])) {
      for (const indicator of indicators) {
        if (desc.includes(indicator)) {
          return parseInt(level);
        }
      }
    }

    return 2; // Default to mild
  }

  /**
   * Calculate initial trend score
   * @param {Object} bookData - Book data
   * @returns {number} Trend score (0-100)
   */
  calculateInitialTrendScore(bookData) {
    let score = 50; // Base score

    // Rating bonus
    if (bookData.averageRating) {
      score += (bookData.averageRating / 5) * 20;
    }

    // Ratings count bonus
    if (bookData.ratingsCount) {
      score += Math.min(20, Math.log10(bookData.ratingsCount + 1) * 5);
    }

    // Recent publication bonus
    if (bookData.publishedDate) {
      const pubDate = new Date(bookData.publishedDate);
      const daysSince = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 90) score += 10; // Published within 90 days
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate initial popularity score
   * @param {Object} bookData - Book data
   * @returns {number} Popularity score (0-100)
   */
  calculateInitialPopularityScore(bookData) {
    let score = 30; // Base score

    // Ratings count heavily influences popularity
    if (bookData.ratingsCount) {
      score += Math.min(50, Math.log10(bookData.ratingsCount + 1) * 10);
    }

    // Rating quality
    if (bookData.averageRating) {
      score += (bookData.averageRating / 5) * 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      booksCollected: this.booksCollected,
      hasApiKey: !!GOOGLE_BOOKS_API_KEY
    };
  }
}

// Export singleton instance
const googleBooksService = new GoogleBooksService();
export default googleBooksService;
