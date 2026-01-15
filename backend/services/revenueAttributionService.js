import MarketingRevenue from '../models/MarketingRevenue.js';
import appleSearchAdsService from './appleSearchAdsService.js';
import appStoreConnectService from './appStoreConnectService.js';

/**
 * Revenue Attribution Service
 * Attributes revenue from app transactions to marketing campaigns and channels
 */

class RevenueAttributionService {
  constructor() {
    this.attributionWindows = {
      apple_search_ads: 30, // 30 days for Apple Search Ads
      tiktok_ads: 7,        // 7 days for TikTok
      instagram_ads: 7,     // 7 days for Instagram
      google_ads: 30,       // 30 days for Google
      organic: 0            // No attribution window for organic
    };
  }

  /**
   * Fetch transactions from App Store Connect
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Array of transactions
   */
  async fetchAppStoreTransactions(startDate, endDate) {
    try {
      // In production, this would call App Store Connect API
      // For now, return mock transaction data
      const mockTransactions = this.generateMockTransactions(startDate, endDate);
      return mockTransactions;
    } catch (error) {
      console.error('Error fetching App Store transactions:', error);
      throw error;
    }
  }

  /**
   * Generate mock transaction data for testing
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Mock transactions
   */
  generateMockTransactions(startDate, endDate) {
    const transactions = [];
    const daysBetween = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < daysBetween; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Generate 5-15 transactions per day
      const dailyTransactions = Math.floor(Math.random() * 10) + 5;

      for (let j = 0; j < dailyTransactions; j++) {
        const isNewCustomer = Math.random() > 0.3; // 70% new customers
        const subscriptionType = this.getRandomSubscriptionType();

        transactions.push({
          transactionId: `txn_${date.getTime()}_${j}`,
          amount: this.getRandomRevenue(subscriptionType),
          currency: 'USD',
          date: new Date(date),
          customer: {
            new: isNewCustomer,
            subscriptionType: subscriptionType
          },
          metadata: {
            region: this.getRandomRegion(),
            deviceType: this.getRandomDevice()
          }
        });
      }
    }

    return transactions;
  }

  getRandomSubscriptionType() {
    const types = ['trial', 'monthly', 'monthly', 'monthly', 'annual'];
    return types[Math.floor(Math.random() * types.length)];
  }

  getRandomRevenue(subscriptionType) {
    const baseAmounts = {
      trial: 0,
      monthly: 9.99,
      annual: 79.99
    };
    return baseAmounts[subscriptionType] || 9.99;
  }

  getRandomRegion() {
    const regions = ['US', 'UK', 'CA', 'AU', 'DE', 'FR'];
    return regions[Math.floor(Math.random() * regions.length)];
  }

  getRandomDevice() {
    const devices = ['iPhone 14', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone SE'];
    return devices[Math.floor(Math.random() * devices.length)];
  }

  /**
   * Match transactions to ad campaigns based on date and attribution window
   * @param {Array} transactions - Array of transactions
   * @returns {Array} Transactions with campaign attribution
   */
  async matchTransactionsToCampaigns(transactions) {
    try {
      // Fetch all active campaigns
      const campaigns = await appleSearchAdsService.getCampaigns();

      const attributedTransactions = transactions.map(transaction => {
        // Find matching campaigns based on touchpoint date
        const touchpointDate = new Date(transaction.date);
        touchpointDate.setDate(touchpointDate.getDate() - Math.floor(Math.random() * 7)); // Random touchpoint 0-7 days before

        let attribution = null;

        // Try to attribute to Apple Search Ads campaign
        for (const campaign of campaigns) {
          if (this.isWithinAttributionWindow(
            touchpointDate,
            campaign.startDate,
            campaign.status,
            'apple_search_ads'
          )) {
            attribution = {
              campaignId: campaign.campaignId,
              campaignName: campaign.name,
              channel: 'apple_search_ads',
              touchpointDate: touchpointDate,
              attributionWindow: this.attributionWindows.apple_search_ads
            };
            break;
          }
        }

        // If no campaign match, attribute to organic
        if (!attribution) {
          attribution = {
            channel: 'organic',
            attributionWindow: 0
          };
        }

        return {
          ...transaction,
          attributedTo: attribution,
          attributionConfidence: this.calculateAttributionConfidence(attribution)
        };
      });

      return attributedTransactions;
    } catch (error) {
      console.error('Error matching transactions to campaigns:', error);
      // Return transactions as organic if matching fails
      return transactions.map(t => ({
        ...t,
        attributedTo: { channel: 'organic' },
        attributionConfidence: 50
      }));
    }
  }

  /**
   * Check if transaction is within attribution window for a campaign
   * @param {Date} transactionDate - Transaction date
   * @param {Date} campaignStartDate - Campaign start date
   * @param {String} campaignStatus - Campaign status
   * @param {String} channel - Marketing channel
   * @returns {Boolean} True if within window
   */
  isWithinAttributionWindow(transactionDate, campaignStartDate, campaignStatus, channel) {
    if (campaignStatus !== 'ENABLED' && campaignStatus !== 'PAUSED') {
      return false;
    }

    const windowDays = this.attributionWindows[channel] || 7;
    const daysSinceStart = Math.floor((transactionDate - new Date(campaignStartDate)) / (1000 * 60 * 60 * 24));

    return daysSinceStart >= 0 && daysSinceStart <= windowDays;
  }

  /**
   * Calculate attribution confidence score
   * @param {Object} attribution - Attribution object
   * @returns {Number} Confidence score (0-100)
   */
  calculateAttributionConfidence(attribution) {
    if (!attribution || attribution.channel === 'organic') {
      return 50; // Medium confidence for organic
    }

    if (attribution.channel === 'apple_search_ads') {
      return 95; // High confidence for search ads (last-click attribution)
    }

    return 70; // Medium-high for other channels
  }

  /**
   * Attribute revenue by campaign
   * @param {Array} attributedTransactions - Transactions with attribution
   * @returns {Object} Revenue grouped by campaign
   */
  async attributeRevenueByCampaign(attributedTransactions) {
    const revenueByCampaign = {};

    attributedTransactions.forEach(transaction => {
      const campaignId = transaction.attributedTo?.campaignId || 'organic';
      const campaignName = transaction.attributedTo?.campaignName || 'Organic Traffic';

      if (!revenueByCampaign[campaignId]) {
        revenueByCampaign[campaignId] = {
          campaignId,
          campaignName,
          channel: transaction.attributedTo?.channel || 'organic',
          totalRevenue: 0,
          transactionCount: 0,
          newCustomerRevenue: 0,
          newCustomerCount: 0,
          returningCustomerRevenue: 0,
          returningCustomerCount: 0
        };
      }

      const campaign = revenueByCampaign[campaignId];
      campaign.totalRevenue += transaction.amount;
      campaign.transactionCount += 1;

      if (transaction.customer?.new) {
        campaign.newCustomerRevenue += transaction.amount;
        campaign.newCustomerCount += 1;
      } else {
        campaign.returningCustomerRevenue += transaction.amount;
        campaign.returningCustomerCount += 1;
      }
    });

    // Convert to array and sort by revenue
    return Object.values(revenueByCampaign).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Store attributed revenue in database
   * @param {Array} attributedTransactions - Transactions to store
   * @returns {Number} Number of records created
   */
  async storeAttributedRevenue(attributedTransactions) {
    try {
      const records = attributedTransactions.map(t => ({
        transactionId: t.transactionId,
        attributedTo: {
          campaignId: t.attributedTo?.campaignId,
          campaignName: t.attributedTo?.campaignName,
          adGroupId: t.attributedTo?.adGroupId,
          adGroupName: t.attributedTo?.adGroupName,
          keywordId: t.attributedTo?.keywordId,
          keywordText: t.attributedTo?.keywordText,
          channel: t.attributedTo?.channel || 'organic'
        },
        revenue: {
          amount: t.amount,
          currency: t.currency || 'USD'
        },
        transactionDate: t.date,
        touchpointDate: t.attributedTo?.touchpointDate,
        attributionWindow: t.attributedTo?.attributionWindow || 0,
        customer: t.customer || {},
        attributionConfidence: t.attributionConfidence || 50,
        metadata: t.metadata || {}
      }));

      // Bulk upsert with transactionId as unique key
      const operations = records.map(record => ({
        updateOne: {
          filter: { transactionId: record.transactionId },
          update: { $set: record },
          upsert: true
        }
      }));

      const result = await MarketingRevenue.bulkWrite(operations);
      return result.upsertedCount + result.modifiedCount;
    } catch (error) {
      console.error('Error storing attributed revenue:', error);
      throw error;
    }
  }

  /**
   * Get attributed revenue for display
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Optional filters
   * @returns {Object} Attributed revenue data
   */
  async getAttributedRevenue(startDate, endDate, filters = {}) {
    try {
      // Get total revenue
      const totalRevenue = await MarketingRevenue.getTotalRevenue(startDate, endDate, filters);

      // Get revenue by campaign
      const revenueByCampaign = await MarketingRevenue.getRevenueByCampaign(startDate, endDate);

      // Get revenue by channel
      const revenueByChannel = await MarketingRevenue.getRevenueByChannel(startDate, endDate);

      // Get daily revenue trend
      const dailyRevenue = await MarketingRevenue.getDailyRevenue(startDate, endDate, filters.channel);

      return {
        summary: totalRevenue,
        byCampaign: revenueByCampaign,
        byChannel: revenueByChannel,
        dailyTrend: dailyRevenue,
        filters: {
          startDate,
          endDate,
          ...filters
        }
      };
    } catch (error) {
      console.error('Error fetching attributed revenue:', error);
      throw error;
    }
  }

  /**
   * Get ROI for a specific campaign
   * @param {String} campaignId - Campaign ID
   * @returns {Object} ROI data
   */
  async getCampaignROI(campaignId) {
    try {
      const revenueData = await MarketingRevenue.getRevenueROI(campaignId);

      // Get campaign spend
      const campaigns = await appleSearchAdsService.getCampaigns();
      const campaign = campaigns.find(c => c.campaignId === campaignId);

      if (!campaign) {
        return {
          campaignId,
          attributedRevenue: 0,
          conversions: 0,
          spend: 0,
          roi: 0,
          roas: 0
        };
      }

      const spend = campaign.spend || campaign.budget?.amountUsed || 0;
      const roi = spend > 0 ? ((revenueData.attributedRevenue - spend) / spend) * 100 : 0;
      const roas = spend > 0 ? (revenueData.attributedRevenue / spend) : 0;

      return {
        campaignId,
        campaignName: campaign.name,
        attributedRevenue: revenueData.attributedRevenue,
        conversions: revenueData.conversions,
        spend: spend,
        roi: roi.toFixed(2),
        roas: roas.toFixed(2)
      };
    } catch (error) {
      console.error('Error calculating campaign ROI:', error);
      throw error;
    }
  }

  /**
   * Run full attribution pipeline
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Attribution results
   */
  async runAttributionPipeline(startDate, endDate) {
    try {
      console.log(`Starting revenue attribution for ${startDate} to ${endDate}`);

      // Step 1: Fetch transactions
      console.log('Step 1: Fetching App Store transactions...');
      const transactions = await this.fetchAppStoreTransactions(startDate, endDate);
      console.log(`Fetched ${transactions.length} transactions`);

      // Step 2: Match to campaigns
      console.log('Step 2: Matching transactions to campaigns...');
      const attributedTransactions = await this.matchTransactionsToCampaigns(transactions);
      console.log(`Matched ${attributedTransactions.length} transactions`);

      // Step 3: Attribute revenue by campaign
      console.log('Step 3: Attributing revenue by campaign...');
      const revenueByCampaign = await this.attributeRevenueByCampaign(attributedTransactions);
      console.log(`Attributed revenue across ${revenueByCampaign.length} campaigns`);

      // Step 4: Store in database
      console.log('Step 4: Storing attributed revenue in database...');
      const storedCount = await this.storeAttributedRevenue(attributedTransactions);
      console.log(`Stored ${storedCount} revenue records`);

      return {
        success: true,
        transactionCount: transactions.length,
        attributedCount: attributedTransactions.length,
        campaignCount: revenueByCampaign.length,
        storedCount: storedCount,
        revenueByCampaign: revenueByCampaign
      };
    } catch (error) {
      console.error('Error running attribution pipeline:', error);
      throw error;
    }
  }

  /**
   * Get mock attributed revenue for display (fallback)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Mock attributed revenue data
   */
  getMockAttributedRevenue(startDate, endDate) {
    return {
      summary: {
        totalRevenue: 4729.43,
        transactionCount: 485
      },
      byCampaign: [
        {
          _id: {
            campaignId: 'search_roma_001',
            campaignName: 'Romance Stories Search'
          },
          totalRevenue: 1260.15,
          transactionCount: 90,
          newCustomerRevenue: 840.10,
          newCustomerCount: 60
        },
        {
          _id: {
            campaignId: 'search_love_002',
            campaignName: 'Love Stories Keywords'
          },
          totalRevenue: 540.30,
          transactionCount: 36,
          newCustomerRevenue: 360.20,
          newCustomerCount: 24
        }
      ],
      byChannel: [
        {
          _id: 'organic',
          totalRevenue: 2534.98,
          transactionCount: 271,
          newCustomerRevenue: 1689.99
        },
        {
          _id: 'apple_search_ads',
          totalRevenue: 1801.45,
          transactionCount: 126,
          newCustomerRevenue: 1200.30
        },
        {
          _id: 'tiktok_ads',
          totalRevenue: 252.37,
          transactionCount: 21,
          newCustomerRevenue: 168.24
        },
        {
          _id: 'instagram_ads',
          totalRevenue: 140.63,
          transactionCount: 13,
          newCustomerRevenue: 93.75
        }
      ],
      dailyTrend: this.generateMockDailyTrend(startDate, endDate)
    };
  }

  generateMockDailyTrend(startDate, endDate) {
    const trend = [];
    const daysBetween = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < Math.min(daysBetween, 30); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      trend.push({
        _id: date.toISOString().split('T')[0],
        totalRevenue: Math.floor(Math.random() * 200) + 50,
        transactionCount: Math.floor(Math.random() * 20) + 5,
        newCustomerCount: Math.floor(Math.random() * 15) + 3
      });
    }

    return trend;
  }
}

export default new RevenueAttributionService();
