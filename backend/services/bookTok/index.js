/**
 * BookTok Services Index
 *
 * Exports all BookTok-related services for easy importing
 *
 * COST-CONTROLLED IMPLEMENTATION:
 * - Gopher API for TikTok data (once daily)
 * - Google Books API for book data (once daily, free)
 * - NYTimes API for bestsellers (weekly, free)
 */

// Data Collection Services (COST-CONTROLLED)
export { default as gopherDataService } from './gopherDataService.js';
export { default as googleBooksService } from './googleBooksService.js';
export { default as nyTimesBestsellerService } from './bestsellerApiService.js';

// Legacy services (kept for compatibility but not actively used)
// export { default as tikTokBookTokMonitor } from './tikTokBookTokMonitor.js';
// export { default as instagramBookstagramMonitor } from './instagramBookstagramMonitor.js';
// export { default as influencerTrackerService } from './influencerTrackerService.js';
// export { default as goodreadsScraperService } from './goodreadsScraperService.js';
// export { default as communitySourcesMonitor } from './communitySourcesMonitor.js';
// export { default as internalDataConnector } from './internalDataConnector.js';

// Analysis Services (use locally stored data)
export { default as engagementVelocityTracker } from './analysis/engagementVelocityTracker.js';
export { default as frequencySpikeDetector } from './analysis/frequencySpikeDetector.js';
export { default as engagementOutlierDetector } from './analysis/engagementOutlierDetector.js';
export { default as hashtagComboAnalyzer } from './analysis/hashtagComboAnalyzer.js';
export { default as hookStructureAnalyzer } from './analysis/hookStructureAnalyzer.js';

// Knowledge Base & Optimization Services (use locally stored data)
export { default as contentScorerService } from './contentScorerService.js';
export { default as topicRecommenderService } from './topicRecommenderService.js';
export { default as alertSystemService } from './alertSystemService.js';
