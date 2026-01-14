import ASOExperiment from '../models/ASOExperiment.js';
import appStoreConnectService from './appStoreConnectService.js';

/**
 * ASO Experiment Service
 * Manages A/B test creation, execution, and analysis for App Store optimization
 */

/**
 * Create a new A/B test experiment
 */
export async function createExperiment(experimentData) {
  try {
    const experiment = new ASOExperiment(experimentData);

    // Validate that variant data matches test type
    validateVariantData(experiment);

    await experiment.save();

    console.log(`✅ Created A/B test experiment: ${experiment.name}`);
    return experiment;
  } catch (error) {
    console.error('Error creating experiment:', error);
    throw new Error(`Failed to create experiment: ${error.message}`);
  }
}

/**
 * Validate that variant data is appropriate for test type
 */
function validateVariantData(experiment) {
  const { type, variantA, variantB } = experiment;

  switch (type) {
    case 'icon':
      if (!variantA.iconUrl || !variantB.iconUrl) {
        throw new Error('Icon tests require iconUrl for both variants');
      }
      break;

    case 'screenshots':
      if (!variantA.screenshotUrls?.length || !variantB.screenshotUrls?.length) {
        throw new Error('Screenshot tests require screenshotUrls array for both variants');
      }
      break;

    case 'subtitle':
      if (!variantA.subtitle || !variantB.subtitle) {
        throw new Error('Subtitle tests require subtitle text for both variants');
      }
      break;

    case 'description':
      if (!variantA.description || !variantB.description) {
        throw new Error('Description tests require description text for both variants');
      }
      break;

    case 'keywords':
      if (!variantA.keywords?.length || !variantB.keywords?.length) {
        throw new Error('Keyword tests require keywords array for both variants');
      }
      break;

    default:
      throw new Error(`Invalid test type: ${type}`);
  }
}

/**
 * Get all experiments with optional filtering
 */
export async function getExperiments(filters = {}) {
  try {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    const experiments = await ASOExperiment
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);

    console.log(`📊 Retrieved ${experiments.length} experiments`);
    return experiments;
  } catch (error) {
    console.error('Error fetching experiments:', error);
    throw new Error(`Failed to fetch experiments: ${error.message}`);
  }
}

/**
 * Get a specific experiment by ID
 */
export async function getExperiment(experimentId) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    return experiment;
  } catch (error) {
    console.error('Error fetching experiment:', error);
    throw new Error(`Failed to fetch experiment: ${error.message}`);
  }
}

/**
 * Update experiment data
 */
export async function updateExperiment(experimentId, updates) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // Don't allow updating certain fields if test is running
    if (experiment.status === 'running') {
      const protectedFields = ['type', 'variantA', 'variantB', 'duration', 'metric'];
      const attemptedUpdates = Object.keys(updates).filter(key => protectedFields.includes(key));

      if (attemptedUpdates.length > 0) {
        throw new Error(`Cannot update ${attemptedUpdates.join(', ')} while test is running`);
      }
    }

    Object.assign(experiment, updates);
    await experiment.save();

    console.log(`✅ Updated experiment: ${experiment.name}`);
    return experiment;
  } catch (error) {
    console.error('Error updating experiment:', error);
    throw new Error(`Failed to update experiment: ${error.message}`);
  }
}

/**
 * Start an A/B test via App Store Connect API
 */
export async function startExperiment(experimentId) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.status !== 'draft') {
      throw new Error(`Cannot start experiment with status: ${experiment.status}`);
    }

    // Prepare test configuration for App Store Connect
    const testConfig = prepareAppStoreTestConfig(experiment);

    // Call App Store Connect API to start the test
    const appStoreResult = await appStoreConnectService.startABTest(testConfig);

    // Update experiment with App Store Connect IDs
    experiment.appStoreTreatmentId = appStoreResult.treatmentId;
    experiment.appStoreCampaignId = appStoreResult.campaignId;
    experiment.automaticallyStarted = true;
    experiment.status = 'running';
    experiment.startDate = new Date();

    await experiment.save();

    console.log(`🚀 Started A/B test: ${experiment.name}`);
    return experiment;
  } catch (error) {
    console.error('Error starting experiment:', error);

    // If App Store Connect API fails, still allow manual start
    const experiment = await ASOExperiment.findById(experimentId);
    experiment.status = 'running';
    experiment.startDate = new Date();
    experiment.automaticallyStarted = false;
    await experiment.save();

    console.log(`⚠️  Started A/B test in manual mode (API unavailable): ${experiment.name}`);
    return experiment;
  }
}

/**
 * Prepare test configuration for App Store Connect API
 */
function prepareAppStoreTestConfig(experiment) {
  const config = {
    name: experiment.name,
    type: experiment.type,
    startDate: experiment.startDate,
    durationDays: experiment.duration,
    metric: experiment.metric
  };

  switch (experiment.type) {
    case 'icon':
      config.variantA = { iconUrl: experiment.variantA.iconUrl };
      config.variantB = { iconUrl: experiment.variantB.iconUrl };
      break;

    case 'screenshots':
      config.variantA = { screenshotUrls: experiment.variantA.screenshotUrls };
      config.variantB = { screenshotUrls: experiment.variantB.screenshotUrls };
      break;

    case 'subtitle':
      config.variantA = { subtitle: experiment.variantA.subtitle };
      config.variantB = { subtitle: experiment.variantB.subtitle };
      break;

    case 'description':
      config.variantA = { description: experiment.variantA.description };
      config.variantB = { description: experiment.variantB.description };
      break;

    case 'keywords':
      config.variantA = { keywords: experiment.variantA.keywords };
      config.variantB = { keywords: experiment.variantB.keywords };
      break;
  }

  return config;
}

/**
 * Stop an A/B test
 */
export async function stopExperiment(experimentId, conclusion = null) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.status !== 'running') {
      throw new Error(`Cannot stop experiment with status: ${experiment.status}`);
    }

    // Try to stop via App Store Connect API
    try {
      await appStoreConnectService.stopABTest(experiment.appStoreCampaignId);
      experiment.automaticallyStopped = true;
    } catch (error) {
      console.warn('Could not stop test via App Store Connect API:', error.message);
      experiment.automaticallyStopped = false;
    }

    experiment.status = 'completed';
    experiment.endDate = new Date();

    if (conclusion) {
      experiment.conclusion = conclusion;
    }

    // Determine winner
    experiment.determineWinner();

    await experiment.save();

    console.log(`🛑 Stopped A/B test: ${experiment.name}`);
    return experiment;
  } catch (error) {
    console.error('Error stopping experiment:', error);
    throw new Error(`Failed to stop experiment: ${error.message}`);
  }
}

/**
 * Update experiment metrics with latest data
 */
export async function updateExperimentMetrics(experimentId) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // Fetch latest metrics from App Store Connect
    if (experiment.appStoreCampaignId) {
      try {
        const metrics = await appStoreConnectService.getABTestMetrics(experiment.appStoreCampaignId);

        experiment.variantAViews = metrics.variantA.views || experiment.variantAViews;
        experiment.variantBViews = metrics.variantB.views || experiment.variantBViews;
        experiment.variantAConversions = metrics.variantA.conversions || experiment.variantAConversions;
        experiment.variantBConversions = metrics.variantB.conversions || experiment.variantBConversions;

        console.log(`📊 Updated metrics for experiment: ${experiment.name}`);
      } catch (error) {
        console.warn('Could not fetch metrics from App Store Connect:', error.message);
      }
    }

    await experiment.save();
    return experiment;
  } catch (error) {
    console.error('Error updating experiment metrics:', error);
    throw new Error(`Failed to update metrics: ${error.message}`);
  }
}

/**
 * Complete experiment and declare winner
 */
export async function completeExperiment(experimentId, winner, conclusion) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.status === 'completed') {
      throw new Error('Experiment is already completed');
    }

    // Stop the test if running
    if (experiment.status === 'running') {
      await stopExperiment(experimentId, conclusion);
    } else {
      experiment.status = 'completed';
      experiment.endDate = new Date();
    }

    // Set winner and conclusion
    experiment.winner = winner;
    experiment.conclusion = conclusion || '';

    // Calculate final statistics
    experiment.determineWinner();

    // Generate recommendations based on winner
    experiment.recommendations = generateRecommendations(experiment);

    await experiment.save();

    console.log(`✅ Completed A/B test: ${experiment.name}, Winner: ${winner}`);
    return experiment;
  } catch (error) {
    console.error('Error completing experiment:', error);
    throw new Error(`Failed to complete experiment: ${error.message}`);
  }
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(experiment) {
  const recommendations = [];

  if (experiment.winner === 'variantB') {
    recommendations.push({
      type: 'implement',
      description: `Implement ${experiment.variantB.name} as it significantly outperformed the control`
    });

    if (experiment.lift > 10) {
      recommendations.push({
        type: 'scale',
        description: `Strong ${experiment.lift.toFixed(1)}% lift detected. Consider applying similar changes to other metadata.`
      });
    }
  } else if (experiment.winner === 'variantA') {
    recommendations.push({
      type: 'keep',
      description: `Keep current ${experiment.variantA.name} as it outperformed the treatment`
    });

    recommendations.push({
      type: 'iterate',
      description: 'Consider testing different variants as the treatment did not improve performance.'
    });
  } else {
    recommendations.push({
      type: 'extend',
      description: 'Test was inconclusive. Consider extending duration or increasing sample size.'
    });

    recommendations.push({
      type: 'iterate',
      description: 'Try testing a different variable or create more distinct variants.'
    });
  }

  return recommendations;
}

/**
 * Get experiments that need attention
 */
export async function getExperimentsNeedingAttention() {
  try {
    const runningExperiments = await ASOExperiment.find({ status: 'running' });

    const needsAttention = [];

    for (const experiment of runningExperiments) {
      // Check if test duration has elapsed
      if (experiment.hasTestDurationElapsed()) {
        needsAttention.push({
          experiment,
          reason: 'duration_elapsed',
          message: `Test duration (${experiment.duration} days) has completed`
        });
        continue;
      }

      // Check if sufficient sample size reached
      if (experiment.hasSufficientSampleSize()) {
        needsAttention.push({
          experiment,
          reason: 'sample_size_reached',
          message: `Target sample size (${experiment.targetSampleSize} conversions) reached`
        });
        continue;
      }

      // Check if significant result detected (early stopping)
      experiment.determineWinner();
      if (experiment.winner !== 'pending' && experiment.significance < 0.01) {
        needsAttention.push({
          experiment,
          reason: 'significant_result',
          message: `Significant result detected (${experiment.confidence.toFixed(1)}% confidence)`
        });
      }
    }

    console.log(`⚠️  Found ${needsAttention.length} experiments needing attention`);
    return needsAttention;
  } catch (error) {
    console.error('Error checking experiments:', error);
    throw new Error(`Failed to check experiments: ${error.message}`);
  }
}

/**
 * Get experiment statistics
 */
export async function getExperimentStatistics() {
  try {
    const totalExperiments = await ASOExperiment.countDocuments();
    const draftExperiments = await ASOExperiment.countDocuments({ status: 'draft' });
    const runningExperiments = await ASOExperiment.countDocuments({ status: 'running' });
    const completedExperiments = await ASOExperiment.countDocuments({ status: 'completed' });
    const cancelledExperiments = await ASOExperiment.countDocuments({ status: 'cancelled' });

    // Get average lift for completed tests with a winner
    const completedTests = await ASOExperiment.find({
      status: 'completed',
      winner: { $in: ['variantA', 'variantB'] }
    });

    const averageLift = completedTests.length > 0
      ? completedTests.reduce((sum, test) => sum + test.lift, 0) / completedTests.length
      : 0;

    // Count by type
    const experimentsByType = await ASOExperiment.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const stats = {
      total: totalExperiments,
      draft: draftExperiments,
      running: runningExperiments,
      completed: completedExperiments,
      cancelled: cancelledExperiments,
      averageLift: averageLift.toFixed(1) + '%',
      byType: experimentsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    console.log('📊 Experiment statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting statistics:', error);
    throw new Error(`Failed to get statistics: ${error.message}`);
  }
}

/**
 * Delete an experiment
 */
export async function deleteExperiment(experimentId) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.status === 'running') {
      throw new Error('Cannot delete a running experiment. Stop it first.');
    }

    await ASOExperiment.deleteOne({ _id: experimentId });

    console.log(`🗑️  Deleted experiment: ${experiment.name}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting experiment:', error);
    throw new Error(`Failed to delete experiment: ${error.message}`);
  }
}

/**
 * Cancel an experiment
 */
export async function cancelExperiment(experimentId) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.status !== 'draft' && experiment.status !== 'running') {
      throw new Error(`Cannot cancel experiment with status: ${experiment.status}`);
    }

    // Stop via App Store Connect if running
    if (experiment.status === 'running' && experiment.appStoreCampaignId) {
      try {
        await appStoreConnectService.stopABTest(experiment.appStoreCampaignId);
      } catch (error) {
        console.warn('Could not stop test via App Store Connect:', error.message);
      }
    }

    experiment.status = 'cancelled';
    experiment.endDate = new Date();
    await experiment.save();

    console.log(`❌ Cancelled experiment: ${experiment.name}`);
    return experiment;
  } catch (error) {
    console.error('Error cancelling experiment:', error);
    throw new Error(`Failed to cancel experiment: ${error.message}`);
  }
}

/**
 * Get mock experiment data for testing
 */
export async function getMockExperiments() {
  return [
    {
      _id: 'exp_mock_1',
      name: 'Icon Test - Romantic vs Minimalist',
      type: 'icon',
      status: 'completed',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      duration: 14,
      metric: 'conversionRate',
      variantA: {
        name: 'Control',
        iconUrl: '/mock-icons/control-icon.png',
        description: 'Current romantic-style icon with couple illustration'
      },
      variantB: {
        name: 'Treatment',
        iconUrl: '/mock-icons/treatment-icon.png',
        description: 'Minimalist icon with heart silhouette'
      },
      variantAConversions: 456,
      variantBConversions: 523,
      variantAViews: 12500,
      variantBViews: 12450,
      variantAConversionRate: 3.65,
      variantBConversionRate: 4.20,
      winner: 'variantB',
      significance: 0.02,
      confidence: 98,
      lift: 15.1,
      conclusion: 'The minimalist icon performed significantly better with 15.1% lift in conversion rate.',
      recommendations: [
        { type: 'implement', description: 'Implement minimalist icon as primary app icon' },
        { type: 'scale', description: 'Consider applying minimalist approach to screenshots as well' }
      ],
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'exp_mock_2',
      name: 'Subtitle Test - Keyword Focus',
      type: 'subtitle',
      status: 'running',
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      duration: 14,
      metric: 'conversionRate',
      variantA: {
        name: 'Control',
        subtitle: 'Romantic Stories',
        description: 'Current subtitle emphasizing story genre'
      },
      variantB: {
        name: 'Treatment',
        subtitle: 'Interactive Romance',
        description: 'New subtitle emphasizing interactive gameplay'
      },
      variantAConversions: 89,
      variantBConversions: 102,
      variantAViews: 3200,
      variantBViews: 3150,
      variantAConversionRate: 2.78,
      variantBConversionRate: 3.24,
      winner: 'pending',
      significance: 0.15,
      confidence: 85,
      lift: 0,
      automaticallyStarted: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      _id: 'exp_mock_3',
      name: 'Screenshot Test - Character Focus',
      type: 'screenshots',
      status: 'draft',
      duration: 14,
      metric: 'conversionRate',
      variantA: {
        name: 'Control',
        screenshotUrls: ['/mock/ss/control-1.png', '/mock/ss/control-2.png'],
        description: 'Current screenshots showing story interface'
      },
      variantB: {
        name: 'Treatment',
        screenshotUrls: ['/mock/ss/treatment-1.png', '/mock/ss/treatment-2.png'],
        description: 'New screenshots emphasizing character emotions'
      },
      variantAConversions: 0,
      variantBConversions: 0,
      variantAViews: 0,
      variantBViews: 0,
      winner: 'pending',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ];
}

export default {
  createExperiment,
  getExperiments,
  getExperiment,
  updateExperiment,
  startExperiment,
  stopExperiment,
  updateExperimentMetrics,
  completeExperiment,
  getExperimentsNeedingAttention,
  getExperimentStatistics,
  deleteExperiment,
  cancelExperiment,
  getMockExperiments
};
