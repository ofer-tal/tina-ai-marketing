/**
 * Chat Handlers Index
 *
 * Exports all specialized chat response handlers
 */

import strategyHandler from './strategyHandler.js';
import budgetHandler from './budgetHandler.js';
import contentHandler from './contentHandler.js';
import analysisHandler from './analysisHandler.js';

export {
  strategyHandler,
  budgetHandler,
  contentHandler,
  analysisHandler
};

export default {
  strategy: strategyHandler,
  budget: budgetHandler,
  content: contentHandler,
  analysis: analysisHandler
};
