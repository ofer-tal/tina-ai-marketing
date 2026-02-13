import mongoose from 'mongoose';

/**
 * Chat Conversation Model
 *
 * Stores AI chat conversations with Tina (AI Marketing Executive)
 * Includes message history, summaries, and context data caching
 */
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true
  },
  content: {
    type: String,
    required: function() {
      // Content is required for user and system roles
      // Optional for assistant (tool calls may have empty content)
      // Optional for tool role (tool result may be empty string)
      return this.role === 'user' || this.role === 'system';
    },
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  toolCalls: [{
    id: String,
    type: String,
    function: {
      name: String,
      arguments: String
    },
    index: Number
  }],
  metadata: {
    tokens: Number,
    model: String,
    proposalId: mongoose.Schema.Types.ObjectId,
    thinkingTime: Number // Time in ms to generate response
  }
}, { _id: false });

const contextDataSchema = new mongoose.Schema({
  lastRevenueFetch: Date,
  lastContentFetch: Date,
  lastSpendFetch: Date,
  lastMetricsFetch: Date
}, { _id: false });

const chatConversationSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  summary: {
    type: String,
    default: ''
  },
  summaryPoints: [{
    type: String
  }],
  contextData: {
    type: contextDataSchema,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  archivedAt: {
    type: Date
  },
  metadata: {
    messageCount: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    lastTopic: String,
    categoryTags: [String]
  }
}, {
  collection: 'marketing_chat_conversations',
  timestamps: true
});

// Indexes for efficient queries
chatConversationSchema.index({ isActive: 1, updatedAt: -1 });
chatConversationSchema.index({ createdAt: -1 });
chatConversationSchema.index({ 'messages.role': 1 });
chatConversationSchema.index({ 'metadata.categoryTags': 1 });

// Virtual for message count
chatConversationSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Method to add a message
chatConversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });

  // Update metadata
  this.metadata.messageCount = this.messages.length;
  this.markModified('messages');
  this.markModified('metadata');

  return this;
};

// Method to get recent messages for context
chatConversationSchema.methods.getRecentMessages = function(count = 20) {
  return this.messages.slice(-count);
};

// Method to get messages since a certain timestamp
chatConversationSchema.methods.getMessagesSince = function(timestamp) {
  return this.messages.filter(m => new Date(m.timestamp) > new Date(timestamp));
};

// Method to update summary
chatConversationSchema.methods.updateSummary = function(summary, points = []) {
  this.summary = summary;
  this.summaryPoints = points;
  this.markModified('summary');
  this.markModified('summaryPoints');
  return this;
};

// Method to archive conversation
chatConversationSchema.methods.archive = function() {
  this.isActive = false;
  this.archivedAt = new Date();
  return this.save();
};

// Method to restore archived conversation
chatConversationSchema.methods.restore = function() {
  this.isActive = true;
  this.archivedAt = undefined;
  return this.save();
};

// Static method to get active conversations
chatConversationSchema.statics.getActiveConversations = function() {
  return this.find({ isActive: true }).sort({ updatedAt: -1 });
};

// Static method to get archived conversations
chatConversationSchema.statics.getArchivedConversations = function() {
  return this.find({ isActive: false }).sort({ archivedAt: -1 });
};

// Static method to search conversations
chatConversationSchema.statics.searchConversations = function(query) {
  return this.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { 'messages.content': { $regex: query, $options: 'i' } },
      { 'metadata.categoryTags': { $regex: query, $options: 'i' } }
    ],
    isActive: true
  }).sort({ updatedAt: -1 });
};

const ChatConversation = mongoose.model('ChatConversation', chatConversationSchema);

export default ChatConversation;
