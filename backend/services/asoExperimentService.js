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
 * Analyze A/B test results and generate comprehensive conclusion report
 */
export async function analyzeResults(experimentId) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // Ensure we have fresh calculations
    experiment.calculateConversionRates();
    experiment.determineWinner();

    // Generate comprehensive analysis report
    const analysis = {
      experiment: {
        id: experiment._id,
        name: experiment.name,
        type: experiment.type,
        status: experiment.status,
        duration: experiment.duration,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
        metric: experiment.metric
      },

      // Test results
      results: {
        variantA: {
          name: experiment.variantA.name,
          views: experiment.variantAViews,
          conversions: experiment.variantAConversions,
          conversionRate: experiment.variantAConversionRate.toFixed(2) + '%'
        },
        variantB: {
          name: experiment.variantB.name,
          views: experiment.variantBViews,
          conversions: experiment.variantBConversions,
          conversionRate: experiment.variantBConversionRate.toFixed(2) + '%'
        }
      },

      // Statistical analysis
      statistics: {
        winner: experiment.winner,
        significance: experiment.significance.toFixed(4),
        confidence: experiment.confidence.toFixed(1) + '%',
        lift: experiment.lift.toFixed(2) + '%',
        isSignificant: experiment.significance < 0.05,
        confidenceLevel: experiment.significance < 0.01 ? '99%' :
                        experiment.significance < 0.05 ? '95%' :
                        experiment.significance < 0.10 ? '90%' : 'Not significant'
      },

      // Sample size analysis
      sampleSize: {
        totalViews: experiment.variantAViews + experiment.variantBViews,
        totalConversions: experiment.variantAConversions + experiment.variantBConversions,
        targetSampleSize: experiment.targetSampleSize,
        sufficient: experiment.hasSufficientSampleSize(),
        durationElapsed: experiment.hasTestDurationElapsed(),
        completionPercentage: experiment.getCompletionPercentage() + '%'
      },

      // Conclusion
      conclusion: generateAnalysisConclusion(experiment),

      // Recommendations
      recommendations: generateAnalysisRecommendations(experiment),

      // Insights
      insights: generateAnalysisInsights(experiment),

      // Next steps
      nextSteps: generateAnalysisNextSteps(experiment),

      // Metadata
      generatedAt: new Date(),
      completedAt: experiment.completedAt
    };

    console.log(`📊 Analyzed A/B test results: ${experiment.name}`);
    return analysis;
  } catch (error) {
    console.error('Error analyzing experiment results:', error);
    throw new Error(`Failed to analyze results: ${error.message}`);
  }
}

/**
 * Generate detailed conclusion based on test results for analysis report
 */
function generateAnalysisConclusion(experiment) {
  const { winner, significance, lift, variantAConversionRate, variantBConversionRate } = experiment;

  if (!experiment.hasSufficientSampleSize()) {
    return `Inconclusive: Insufficient sample size (${experiment.variantAConversions + experiment.variantBConversions} conversions, target: ${experiment.targetSampleSize}). Continue running the test to gather more data.`;
  }

  if (winner === 'inconclusive') {
    if (Math.abs(variantBConversionRate - variantAConversionRate) < 0.05) {
      return `Inconclusive: No meaningful difference detected between variants (${variantAConversionRate.toFixed(2)}% vs ${variantBConversionRate.toFixed(2)}%). Both variants perform similarly.`;
    }
    return `Inconclusive: Difference not statistically significant (p=${significance.toFixed(4)}). Need larger sample size or longer duration.`;
  }

  const winnerName = winner === 'variantA' ? experiment.variantA.name : experiment.variantB.name;
  const loserName = winner === 'variantA' ? experiment.variantB.name : experiment.variantA.name;
  const winnerRate = winner === 'variantA' ? variantAConversionRate : variantBConversionRate;
  const loserRate = winner === 'variantA' ? variantBConversionRate : variantAConversionRate;

  if (significance < 0.01) {
    return `Highly Significant Result: ${winnerName} outperformed ${loserName} with ${lift.toFixed(1)}% lift (${winnerRate.toFixed(2)}% vs ${loserRate.toFixed(2)}% conversion rate). Statistical confidence: 99%. This result is very reliable and should inform immediate action.`;
  } else if (significance < 0.05) {
    return `Significant Result: ${winnerName} outperformed ${loserName} with ${lift.toFixed(1)}% lift (${winnerRate.toFixed(2)}% vs ${loserRate.toFixed(2)}% conversion rate). Statistical confidence: 95%. This result is reliable enough for informed decisions.`;
  } else {
    return `Preliminary Result: ${winnerName} shows ${lift.toFixed(1)}% lift over ${loserName} (${winnerRate.toFixed(2)}% vs ${loserRate.toFixed(2)}%), but results are not yet statistically significant (p=${significance.toFixed(4)}). Consider extending the test duration.`;
  }
}

/**
 * Generate detailed actionable recommendations based on test results for analysis report
 */
function generateAnalysisRecommendations(experiment) {
  const recommendations = [];
  const { winner, significance, lift, type } = experiment;

  if (winner === 'inconclusive') {
    recommendations.push({
      priority: 'high',
      type: 'continue_testing',
      title: 'Extend Test Duration',
      description: 'Increase test duration to gather more data and reach statistical significance.',
      action: 'Run test for another 7-14 days or until target sample size is reached.'
    });

    if (experiment.variantAConversions + experiment.variantBConversions < 500) {
      recommendations.push({
        priority: 'medium',
        type: 'sample_size',
        title: 'Increase Sample Size',
        description: `Current sample size (${experiment.variantAConversions + experiment.variantBConversions} conversions) may be too small.`,
        action: 'Continue running until at least 1000 total conversions are recorded.'
      });
    }

    recommendations.push({
      priority: 'low',
      type: 'redesign',
      title: 'Consider Test Redesign',
      description: 'If extending the test doesn\'t help, consider testing more different variants.',
      action: 'Design new variants with more significant differences to test.'
    });

    return recommendations;
  }

  // Winner determined
  if (significance < 0.05) {
    recommendations.push({
      priority: 'high',
      type: 'implement_winner',
      title: `Implement ${winner === 'variantA' ? experiment.variantA.name : experiment.variantB.name}`,
      description: `The winning variant showed ${lift.toFixed(1)}% lift with ${experiment.confidence.toFixed(0)}% confidence.`,
      action: 'Apply the winning variant to the App Store production listing.'
    });

    // Type-specific recommendations
    if (type === 'icon') {
      recommendations.push({
        priority: 'medium',
        type: 'apply_learning',
        title: 'Apply Design Learning',
        description: 'Consider applying the winning design principles to other app store assets.',
        action: 'Review screenshot and design elements for consistency with winning icon style.'
      });
    } else if (type === 'screenshots') {
      recommendations.push({
        priority: 'medium',
        type: 'test_more',
        title: 'Test Additional Screenshots',
        description: 'Continue testing with more screenshot variations.',
        action: 'Run follow-up tests with different screenshot orders or captions.'
      });
    } else if (type === 'subtitle' || type === 'description') {
      recommendations.push({
        priority: 'medium',
        type: 'keyword_optimization',
        title: 'Optimize Keywords',
        description: 'Use the winning text insights to optimize other metadata.',
        action: 'Review and update keywords based on successful messaging.'
      });
    } else if (type === 'keywords') {
      recommendations.push({
        priority: 'medium',
        type: 'expand_keywords',
        title: 'Expand Keyword Strategy',
        description: 'Build on the winning keyword set.',
        action: 'Test additional related keywords that performed well.'
      });
    }
  }

  if (lift > 20) {
    recommendations.push({
      priority: 'high',
      type: 'document_learnings',
      title: 'Document Significant Win',
      description: `A ${lift.toFixed(1)}% lift is exceptional. Document the learnings for future reference.`,
      action: 'Create a case study and share with the team for knowledge sharing.'
    });
  }

  recommendations.push({
    priority: 'low',
    type: 'monitor',
    title: 'Monitor Post-Implementation Performance',
    description: 'Track performance after implementing the winner to validate results.',
    action: 'Monitor conversion rates for 2-4 weeks after implementation.'
  });

  return recommendations;
}

/**
 * Generate detailed insights from test results for analysis report
 */
function generateAnalysisInsights(experiment) {
  const insights = [];
  const { variantAViews, variantBViews, variantAConversions, variantBConversions, lift, winner } = experiment;

  // Sample size insight
  const totalViews = variantAViews + variantBViews;
  const totalConversions = variantAConversions + variantBConversions;
  const overallRate = (totalConversions / totalViews * 100).toFixed(2);

  insights.push({
    type: 'sample_size',
    title: 'Sample Size Analysis',
    content: `Collected ${totalViews.toLocaleString()} total views with ${totalConversions} conversions. Overall conversion rate: ${overallRate}%.`
  });

  // Duration insight
  if (experiment.startDate) {
    const daysRunning = Math.ceil((Date.now() - experiment.startDate.getTime()) / (24 * 60 * 60 * 1000));
    insights.push({
      type: 'duration',
      title: 'Test Duration',
      content: `Test ran for ${daysRunning} days. Target duration: ${experiment.duration} days.`
    });
  }

  // Statistical power insight
  if (experiment.significance < 0.05) {
    insights.push({
      type: 'statistical_power',
      title: 'Statistical Confidence',
      content: `Results are statistically significant with ${experiment.confidence.toFixed(0)}% confidence. This is a reliable result.`
    });
  } else if (experiment.significance < 0.10) {
    insights.push({
      type: 'statistical_power',
      title: 'Approaching Significance',
      content: `Results are approaching significance (p=${experiment.significance.toFixed(4)}). Consider extending the test duration.`
    });
  }

  // Lift insight
  if (winner !== 'inconclusive' && lift !== 0) {
    insights.push({
      type: 'lift',
      title: 'Performance Impact',
      content: winner === 'variantB'
        ? `Variant B (Treatment) showed ${lift.toFixed(1)}% ${lift > 0 ? 'improvement' : 'decline'} over Variant A (Control).`
        : `Variant A (Control) outperformed Variant B (Treatment) by ${Math.abs(lift).toFixed(1)}%.`
    });
  }

  // Traffic balance insight
  const trafficRatio = (variantAViews / variantBViews * 100).toFixed(1);
  if (Math.abs(100 - trafficRatio) > 10) {
    insights.push({
      type: 'traffic_balance',
      title: 'Traffic Distribution',
      content: `Traffic was not evenly split: ${trafficRatio}% / ${(100 - trafficRatio).toFixed(1)}%. This may affect reliability.`,
      recommendation: 'Aim for 50/50 traffic split in future tests for optimal statistical power.'
    });
  }

  return insights;
}

/**
 * Generate detailed next steps based on test results for analysis report
 */
function generateAnalysisNextSteps(experiment) {
  const nextSteps = [];

  if (experiment.winner === 'inconclusive') {
    nextSteps.push({
      order: 1,
      action: 'Extend test duration',
      details: `Continue running for another 7-14 days to reach statistical significance.`,
      timeframe: 'Immediate'
    });
    nextSteps.push({
      order: 2,
      action: 'Monitor sample size',
      details: `Track conversions until reaching ${experiment.targetSampleSize} total conversions.`,
      timeframe: 'Ongoing'
    });
  } else if (experiment.significance < 0.05) {
    nextSteps.push({
      order: 1,
      action: 'Implement winning variant',
      details: `Apply ${experiment.winner === 'variantA' ? experiment.variantA.name : experiment.variantB.name} to production.`,
      timeframe: 'Immediate'
    });
    nextSteps.push({
      order: 2,
      action: 'Document learnings',
      details: 'Record what worked and why for future reference.',
      timeframe: 'This week'
    });
    nextSteps.push({
      order: 3,
      action: 'Monitor performance',
      details: 'Track conversion rates for 2-4 weeks post-implementation.',
      timeframe: 'Next 2-4 weeks'
    });
    nextSteps.push({
      order: 4,
      action: 'Plan next test',
      details: 'Identify next hypothesis to test based on learnings.',
      timeframe: 'Next month'
    });
  }

  return nextSteps;
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
  getMockExperiments,
  analyzeResults
};
