/**
 * NYTimes + Google Books Bestseller Service
 *
 * Two-step process:
 * 1. Fetch from NYTimes bestseller lists (fiction categories where romance appears)
 * 2. Look up each book on Google Books to:
 *    - Filter for romance books only
 *    - Get romance subgenre categories for breakdown
 *
 * FREE APIs:
 * - NYTimes Books API: 500 requests/day
 * - Google Books API: 1,000 requests/day (no key required)
 *
 * Rate limit: ~120-150 API calls per weekly run (5 lists × ~20 books × ~1.5 for retries)
 */

import BaseApiClient from '../baseApiClient.js';
import { getLogger } from '../../utils/logger.js';
import MarketingBook from '../../models/MarketingBook.js';

const logger = getLogger('services', 'booktok-nytimes');

// NYTimes API configuration
const NYTIMES_API_KEY = process.env.NYTIMES_API_KEY;
const NYTIMES_BASE_URL = 'https://api.nytimes.com/svc/books/v3';

// Google Books API configuration
const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY; // Optional

// Open Library API configuration (free, no API key needed)
const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';

// NYTimes fiction lists that may contain romance bestsellers
const FICTION_LISTS = {
  'hardcover-fiction': 'Hardcover Fiction',
  'trade-fiction-paperback': 'Trade Fiction Paperback',
  'audio-fiction': 'Audio Fiction',
  'mass-market-monthly': 'Mass Market Paperback Monthly',
  'young-adult-paperback-monthly': 'Young Adult Paperback Monthly'
};

// Romance-related categories and subgenres for filtering
// Based on BISAC (Book Industry Standards and Communications) categories
const ROMANCE_CATEGORIES = new Set([
  'Fiction / Romance',
  'Romance',
  'Fiction / Contemporary',
  'Fiction / Historical',
  'Fiction / Fantasy',
  'Fiction / Paranormal',
  'Fiction / Science Fiction',
  'Young Adult Fiction / Romance',
  'Young Adult Fiction / Fantasy',
  'Comics & Graphic Novels / Romance',
  'Fiction / Love & Romance'
]);

// Mapping of Google Books categories to our romance subgenre taxonomy
const SUBGENRE_MAP = {
  'Fiction / Romance': 'Contemporary Romance',
  'Romance': 'Contemporary Romance',
  'Fiction / Contemporary': 'Contemporary Romance',
  'Fiction / Historical': 'Historical Romance',
  'Fiction / Fantasy': 'Fantasy Romance',
  'Fiction / Paranormal': 'Paranormal Romance',
  'Fiction / Science Fiction': 'Sci-Fi Romance',
  'Young Adult Fiction / Romance': 'Young Adult Romance',
  'Young Adult Fiction / Fantasy': 'Young Adult Fantasy Romance',
  'Comics & Graphic Novels / Romance': 'Graphic Novel Romance'
};

/**
 * Check if a Google Books category is romance-related
 */
function isRomanceCategory(category) {
  if (!category) return false;

  const catLower = category.toLowerCase();

  // Direct romance categories
  if (ROMANCE_CATEGORIES.has(category)) return true;

  // Check for romance keywords in category
  const romanceKeywords = ['romance', 'love story', 'erotic'];
  if (romanceKeywords.some(keyword => catLower.includes(keyword))) return true;

  return false;
}

/**
 * Extract subgenre from Open Library subjects and/or Google Books categories and description
 * Open Library has detailed subjects like "Fiction, Romance, Contemporary"
 * Google Books often only has "Fiction"
 */
function extractSubgenre(categories = [], description = '', openLibrarySubjects = []) {
  // First try: Open Library subjects (best source)
  if (openLibrarySubjects && openLibrarySubjects.length > 0) {
    const subjectsLower = openLibrarySubjects.join(' ').toLowerCase();

    // Map Open Library subjects to our subgenres
    const openLibrarySubgenreMap = {
      'contemporary romance': 'Contemporary Romance',
      'contemporary women': 'Contemporary Romance',
      'romance, contemporary': 'Contemporary Romance',
      'historical romance': 'Historical Romance',
      'romance, historical': 'Historical Romance',
      'fantasy romance': 'Fantasy Romance',
      'paranormal romance': 'Paranormal Romance',
      'romantic suspense': 'Romantic Suspense',
      'romance, new adult': 'New Adult Romance',
      'young adult fiction, romance': 'Young Adult Romance',
      'romance, contemporary, life change events': 'Contemporary Romance'
    };

    for (const [subject, subgenre] of Object.entries(openLibrarySubgenreMap)) {
      if (subjectsLower.includes(subject.toLowerCase())) {
        logger.debug(`Subgenre from Open Library: ${subgenre} (matched "${subject}")`);
        return subgenre;
      }
    }
  }

  // Second try: match Google Books categories to our subgenre map
  if (categories && categories.length > 0) {
    for (const cat of categories) {
      if (SUBGENRE_MAP[cat]) {
        return SUBGENRE_MAP[cat];
      }

      // Check for romance keywords in category names
      if (isRomanceCategory(cat)) {
        return cat; // Use the category name as subgenre
      }
    }
  }

  // Third try: analyze description for subgenre indicators
  if (description) {
    const descLower = description.toLowerCase();

    // Subgenre keywords
    const subgenreKeywords = {
      'Contemporary Romance': ['contemporary romance', 'modern setting', 'present day'],
      'Historical Romance': ['historical romance', 'historical fiction', 'victorian', 'regency', 'medieval'],
      'Fantasy Romance': ['fantasy romance', 'magic', 'fantasy world', 'dragon', 'fae', 'sorcery'],
      'Paranormal Romance': ['paranormal romance', 'vampire', 'werewolf', 'shifter', 'ghost', 'supernatural'],
      'Sci-Fi Romance': ['sci-fi romance', 'science fiction romance', 'space', 'future', 'dystopian'],
      'Romantic Suspense': ['romantic suspense', 'thriller', 'mystery romance', 'danger'],
      'Dark Romance': ['dark romance', 'anti-hero', 'morally grey'],
      'Sports Romance': ['sports romance', 'athlete', 'football', 'hockey', 'baseball'],
      'Small Town Romance': ['small town', 'rural'],
      'Holiday Romance': ['christmas', 'holiday'],
      'Young Adult Romance': ['young adult', 'ya', 'teen']
    };

    for (const [subgenre, keywords] of Object.entries(subgenreKeywords)) {
      for (const keyword of keywords) {
        if (descLower.includes(keyword)) {
          return subgenre;
        }
      }
    }
  }

  return 'Contemporary Romance'; // Default fallback for romance books
}

/**
 * Check if book is romance based on Google Books data
 *
 * NOTE: Google Books API categorizes most romance books simply as "Fiction"
 * so we need to rely heavily on description text analysis.
 */
function isRomanceBook(googleBookData, openLibraryData = null) {
  // First check Open Library if available - it has much better subject data
  if (openLibraryData && openLibraryData.subjects) {
    const subjects = openLibraryData.subjects;
    const subjectsLower = subjects.join(' ').toLowerCase();

    // Open Library uses comma-separated subjects like "Fiction, Romance, Contemporary"
    if (subjectsLower.includes('romance')) {
      logger.debug(`✅ ROMANCE by Open Library subjects: ${openLibraryData.title} - [${subjects.slice(0, 2).join(', ')}]`);
      return true;
    }
  }

  if (!googleBookData || !googleBookData.volumeInfo) {
    return false;
  }

  const { categories, description, title } = googleBookData.volumeInfo;

  // Check categories first (some books have specific romance categories)
  if (categories && categories.length > 0) {
    const hasRomanceCategory = categories.some(isRomanceCategory);
    if (hasRomanceCategory) {
      logger.debug(`✅ ROMANCE by category: ${title} - [${categories.join(', ')}]`);
      return true;
    }
  }

  // Fallback: check description for romance indicators
  if (description) {
    const descLower = description.toLowerCase();

    // Primary romance indicators (strong signal)
    const strongRomanceIndicators = [
      'romance novel',
      'bestselling romance author',
      'romantic suspense',
      'contemporary romance',
      'historical romance',
      'paranormal romance',
      'fantasy romance'
    ];

    // Secondary indicators (weaker signal, need multiple)
    const weakRomanceIndicators = [
      'love story',
      'romance',
      'falling in love',
      'passionate',
      'heartwarming romance',
      'swoon',
      'chemistry',
      'tension between'
    ];

    // Check for strong indicators (1 is enough)
    for (const indicator of strongRomanceIndicators) {
      if (descLower.includes(indicator)) {
        logger.debug(`✅ ROMANCE by strong indicator: ${title} - "${indicator}"`);
        return true;
      }
    }

    // Check for weak indicators (need 2+)
    const weakMatchCount = weakRomanceIndicators.filter(indicator => descLower.includes(indicator)).length;
    if (weakMatchCount >= 2) {
      logger.debug(`✅ ROMANCE by weak indicators: ${title} (${weakMatchCount} indicators)`);
      return true;
    }
  }

  logger.debug(`❌ NOT romance: ${title} - categories: [${categories?.join(', ') || 'none'}]`);
  return false;
}

class NyTimesBestsellerService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'NYTimesBestseller',
      baseURL: NYTIMES_BASE_URL,
      timeout: 30000,
      ...config,
    });

    this.isRunning = false;
    this.lastRunTime = null;
    this.romanceBooksFound = 0;

    // Check configuration
    this.isConfigured = !!NYTIMES_API_KEY;

    logger.info('NYTimes + Google Books Bestseller Service initialized', {
      configured: this.isConfigured,
      hasGoogleBooksKey: !!GOOGLE_BOOKS_API_KEY
    });
  }

  /**
   * Fetch NYTimes bestsellers for a specific list
   * @param {string} listName - NYTimes list name
   * @param {string} date - 'current' or YYYY-MM-DD format
   * @returns {Promise<Array>} Array of NYTimes book data
   */
  async fetchNYTimesList(listName, date = 'current') {
    try {
      logger.debug(`Fetching NYTimes list: ${listName}`);

      const dateParam = date === 'current' ? 'current' : `${date}`;
      const url = `/lists/${dateParam}/${listName}.json?api-key=${encodeURIComponent(NYTIMES_API_KEY)}`;

      const response = await this.get(url);

      if (response.results && response.results.books) {
        return response.results.books;
      }

      return [];

    } catch (error) {
      logger.error(`Error fetching NYTimes list ${listName}`, {
        error: error.message,
        status: error.response?.status
      });
      return [];
    }
  }

  /**
   * Look up a book on Google Books by ISBN
   * @param {string} isbn - ISBN10 or ISBN13
   * @returns {Promise<Object|null>} Google Books volume data
   */
  async lookupGoogleBooks(isbn) {
    if (!isbn) {
      logger.debug(`Google Books lookup skipped: no ISBN provided`);
      return null;
    }

    try {
      // Build query string for ISBN lookup
      let url = `q=isbn:${isbn}`;
      if (GOOGLE_BOOKS_API_KEY) {
        url += `&key=${encodeURIComponent(GOOGLE_BOOKS_API_KEY)}`;
      }

      logger.debug(`Google Books ISBN lookup: ${isbn}`);

      const response = await fetch(`${GOOGLE_BOOKS_BASE_URL}/volumes?${url}`);

      if (!response.ok) {
        logger.warn(`Google Books API returned ${response.status} for ISBN ${isbn}`);
        return null;
      }

      const data = await response.json();

      // Google Books API returns data directly
      if (data.items && data.items.length > 0) {
        const book = data.items[0];
        const categories = book.volumeInfo?.categories || [];
        logger.debug(`Google Books found: ${book.volumeInfo?.title} - Categories: ${categories.join(', ')}`);
        return book;
      }

      logger.debug(`Google Books: no results for ISBN ${isbn}`);
      return null;

    } catch (error) {
      logger.error(`Google Books lookup failed for ISBN ${isbn}`, {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Look up a book on Google Books by title and author
   * @param {string} title - Book title
   * @param {string} author - Book author
   * @returns {Promise<Object|null>} Google Books volume data
   */
  async lookupGoogleBooksByTitle(title, author) {
    if (!title) return null;

    try {
      // Build query string for title+author search
      const query = author ? `inauthor:${author}+intitle:${title}` : `intitle:${title}`;
      let url = `q=${encodeURIComponent(query)}&maxResults=1`;
      if (GOOGLE_BOOKS_API_KEY) {
        url += `&key=${encodeURIComponent(GOOGLE_BOOKS_API_KEY)}`;
      }

      logger.debug(`Google Books title lookup: ${title} by ${author}`);

      const response = await fetch(`${GOOGLE_BOOKS_BASE_URL}/volumes?${url}`);

      if (!response.ok) {
        logger.warn(`Google Books API returned ${response.status} for title search`);
        return null;
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const book = data.items[0];
        const categories = book.volumeInfo?.categories || [];
        logger.debug(`Google Books found: ${book.volumeInfo?.title} - Categories: ${categories.join(', ')}`);
        return book;
      }

      logger.debug(`Google Books: no results for "${title}"`);
      return null;

    } catch (error) {
      logger.error(`Google Books title lookup failed for ${title}`, {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Look up a book on Open Library by title and author
   * Open Library has detailed subject/genre information unlike Google Books
   * @param {string} title - Book title
   * @param {string} author - Book author
   * @returns {Promise<Object|null>} Open Library work data
   */
  async lookupOpenLibrary(title, author) {
    if (!title) return null;

    try {
      // Build search query
      const query = author ? `${title} ${author}` : title;
      const url = `${OPEN_LIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=1&fields=key,title,author_name,subject,subjects,type`;

      logger.debug(`Open Library lookup: ${title} by ${author}`);

      const response = await fetch(url);

      if (!response.ok) {
        logger.warn(`Open Library API returned ${response.status}`);
        return null;
      }

      const searchData = await response.json();

      if (searchData.docs && searchData.docs.length > 0) {
        const workKey = searchData.docs[0].key;
        logger.debug(`Open Library found work: ${workKey}`);

        // Fetch full work details to get subjects
        const workUrl = `${OPEN_LIBRARY_BASE_URL}${workKey}.json`;
        const workResponse = await fetch(workUrl);

        if (workResponse.ok) {
          const workData = await workResponse.json();
          logger.debug(`Open Library subjects: ${(workData.subjects || []).slice(0, 3).join(', ')}`);
          return workData;
        }
      }

      logger.debug(`Open Library: no results for "${title}"`);
      return null;

    } catch (error) {
      logger.error(`Open Library lookup failed for ${title}`, {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Fetch and filter romance bestsellers from NYTimes lists
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Results with romance books by subgenre
   */
  async fetchRomanceBestsellers(options = {}) {
    if (this.isRunning) {
      logger.warn('Bestseller fetch already in progress');
      return { success: false, reason: 'already_running' };
    }

    this.isRunning = true;
    this.romanceBooksFound = 0;
    const startTime = Date.now();

    const {
      date = 'current',
      storeResults = true
    } = options;

    const allRomanceBooks = [];
    const subgenreBreakdown = {};
    const listResults = {};

    try {
      logger.info('Starting romance bestseller fetch from NYTimes + Google Books');

      if (!this.isConfigured) {
        logger.warn('NYTimes API not configured');
        return {
          success: false,
          reason: 'not_configured',
          romanceBooks: []
        };
      }

      // Fetch from each NYTimes fiction list
      for (const [listKey, listDisplayName] of Object.entries(FICTION_LISTS)) {
        logger.info(`Processing NYTimes list: ${listDisplayName}`);

        const nytimesBooks = await this.fetchNYTimesList(listKey, date);
        listResults[listKey] = { total: nytimesBooks.length, romance: 0 };

        // Process each book: look up on Google Books, Open Library, and filter for romance
        for (const nytimesBook of nytimesBooks) {
          logger.info(`Processing: ${nytimesBook.title} by ${nytimesBook.author} (ISBN: ${nytimesBook.primary_isbn13 || nytimesBook.primary_isbn10 || 'none'})`);

          // Try Google Books ISBN lookup first
          let googleBook = await this.lookupGoogleBooks(nytimesBook.primary_isbn13 || nytimesBook.primary_isbn10);

          // Fallback to title/author lookup if ISBN fails
          if (!googleBook) {
            logger.info(`  Google Books ISBN lookup failed, trying title/author search...`);
            googleBook = await this.lookupGoogleBooksByTitle(nytimesBook.title, nytimesBook.author);
          }

          // Also try Open Library for better subject/genre data
          let openLibraryData = await this.lookupOpenLibrary(nytimesBook.title, nytimesBook.author);

          if (googleBook || openLibraryData) {
            // Check if this is a romance book (use both data sources)
            if (isRomanceBook(googleBook, openLibraryData)) {
              const subgenre = extractSubgenre(
                googleBook?.volumeInfo?.categories || [],
                googleBook?.volumeInfo?.description || '',
                openLibraryData?.subjects || []
              );
              const romanceBook = this.combineBookData(nytimesBook, googleBook, listKey, subgenre, openLibraryData);

              allRomanceBooks.push(romanceBook);
              listResults[listKey].romance++;

              // Track subgenre breakdown
              if (subgenre) {
                if (!subgenreBreakdown[subgenre]) {
                  subgenreBreakdown[subgenre] = [];
                }
                subgenreBreakdown[subgenre].push(romanceBook);
              }

              // Store in database if requested
              if (storeResults) {
                await this.storeRomanceBestseller(romanceBook);
              }
            }
          }

          // Small delay to be nice to Google Books API
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        logger.info(`List ${listDisplayName}: found ${listResults[listKey].romance} romance books out of ${nytimesBooks.length}`);
      }

      this.romanceBooksFound = allRomanceBooks.length;
      this.lastRunTime = new Date();

      const duration = Date.now() - startTime;

      logger.info('Romance bestseller fetch completed', {
        totalRomanceBooks: allRomanceBooks.length,
        duration: `${duration}ms`,
        subgenres: Object.keys(subgenreBreakdown)
      });

      return {
        success: true,
        romanceBooks: allRomanceBooks,
        subgenreBreakdown,
        listResults,
        totalRomanceBooks: allRomanceBooks.length,
        duration
      };

    } catch (error) {
      logger.error('Error fetching romance bestsellers', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        reason: 'error',
        error: error.message,
        romanceBooks: []
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Combine NYTimes and Google Books data
   */
  combineBookData(nytimesBook, googleBook, sourceList, subgenre, openLibraryData = null) {
    const volumeInfo = googleBook.volumeInfo || {};

    return {
      // NYTimes data
      title: nytimesBook.title,
      author: nytimesBook.author,
      rank: nytimesBook.rank,
      rankLastWeek: nytimesBook.rank_last_week,
      weeksOnList: nytimesBook.weeks_on_list,
      sourceList: sourceList,

      // Identifiers
      isbn10: nytimesBook.primary_isbn10,
      isbn13: nytimesBook.primary_isbn13,
      googleBooksId: googleBook.id,

      // Cover and description
      coverImageUrl: nytimesBook.book_image || volumeInfo.imageLinks?.thumbnail,
      description: nytimesBook.description || volumeInfo.description,

      // Google Books enrichment
      subgenre: subgenre,
      categories: volumeInfo.categories || [],
      publisher: nytimesBook.publisher || volumeInfo.publisher,
      publishedDate: nytimesBook.published_date || volumeInfo.publishedDate,

      // Metrics
      averageRating: volumeInfo.averageRating,
      ratingsCount: volumeInfo.ratingsCount,

      // Links
      amazonUrl: nytimesBook.amazon_product_url,
      previewLink: volumeInfo.previewLink,
      infoLink: volumeInfo.infoLink
    };
  }

  /**
   * Store romance bestseller in database
   */
  async storeRomanceBestseller(bookData) {
    try {
      // Check if exists
      const existing = await MarketingBook.findOne({
        $or: [
          { isbn13: bookData.isbn13 },
          { isbn10: bookData.isbn10 },
          { googleBooksId: bookData.googleBooksId },
          { title: bookData.title, author: bookData.author }
        ]
      });

      if (existing) {
        // Update existing
        existing.coverImageUrl = bookData.coverImageUrl || existing.coverImageUrl;
        existing.description = bookData.description || existing.description;
        existing.averageRating = bookData.averageRating || existing.averageRating;
        existing.ratingsCount = bookData.ratingsCount || existing.ratingsCount;
        existing.categories = bookData.categories || existing.categories;
        existing.subgenre = bookData.subgenre || existing.subgenre;
        existing.publisher = bookData.publisher || existing.publisher;

        // Update popularity score based on NYTimes ranking
        if (bookData.rank) {
          existing.popularityScore = Math.max(
            existing.popularityScore || 0,
            100 - (bookData.rank - 1) * 5
          );
        }

        // Track source lists
        if (!existing.sourceLists) existing.sourceLists = [];
        if (!existing.sourceLists.includes(bookData.sourceList)) {
          existing.sourceLists.push(bookData.sourceList);
        }

        existing.lastTrendUpdate = new Date();
        await existing.save();
        return existing;
      }

      // Create new
      const book = await MarketingBook.create({
        title: bookData.title,
        author: bookData.author,
        isbn13: bookData.isbn13,
        isbn10: bookData.isbn10,
        googleBooksId: bookData.googleBooksId,
        coverImageUrl: bookData.coverImageUrl,
        description: bookData.description,
        genre: 'romance',
        subgenre: bookData.subgenre,
        categories: bookData.categories,
        publisher: bookData.publisher,
        publishedDate: bookData.publishedDate ? new Date(bookData.publishedDate) : undefined,
        averageRating: bookData.averageRating,
        ratingsCount: bookData.ratingsCount,
        sourceLists: [bookData.sourceList],
        amazonId: bookData.amazonUrl,
        previewLink: bookData.previewLink,
        infoLink: bookData.infoLink,
        active: true,
        popularityScore: bookData.rank ? Math.max(0, 100 - (bookData.rank - 1) * 5) : 50,
        currentTrendScore: bookData.rank ? Math.max(0, 100 - (bookData.rank - 1) * 5) : 50
      });

      return book;

    } catch (error) {
      logger.error('Error storing romance bestseller', {
        error: error.message,
        title: bookData.title
      });
      return null;
    }
  }

  /**
   * Get stored romance bestsellers with subgenre breakdown
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Romance bestsellers by subgenre
   */
  async getRomanceBestsellers(options = {}) {
    const {
      limit = 100,
      subgenre: filterSubgenre = null,
      sortBy = 'popularityScore',
      sortOrder = -1
    } = options;

    try {
      const query = {
        genre: 'romance',
        active: true
      };

      if (filterSubgenre) {
        query.subgenre = filterSubgenre;
      }

      const books = await MarketingBook
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .lean();

      // Build subgenre breakdown
      const subgenreBreakdown = {};
      for (const book of books) {
        const sg = book.subgenre || 'Uncategorized';
        if (!subgenreBreakdown[sg]) {
          subgenreBreakdown[sg] = [];
        }
        subgenreBreakdown[sg].push(book);
      }

      return {
        success: true,
        romanceBooks: books,
        subgenreBreakdown,
        totalBooks: books.length,
        subgenres: Object.keys(subgenreBreakdown)
      };

    } catch (error) {
      logger.error('Error getting romance bestsellers from database', {
        error: error.message
      });
      return {
        success: false,
        romanceBooks: [],
        subgenreBreakdown: {}
      };
    }
  }

  /**
   * Update all bestseller lists (alias for fetchRomanceBestsellers)
   * This is called by the scheduled job
   */
  async updateAllBestsellerLists() {
    return this.fetchRomanceBestsellers({ storeResults: true });
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isConfigured: this.isConfigured,
      lastRunTime: this.lastRunTime,
      romanceBooksFound: this.romanceBooksFound,
      availableLists: Object.keys(FICTION_LISTS),
      hasGoogleBooksKey: !!GOOGLE_BOOKS_API_KEY
    };
  }
}

// Export singleton instance
const nyTimesBestsellerService = new NyTimesBestsellerService();
export default nyTimesBestsellerService;
