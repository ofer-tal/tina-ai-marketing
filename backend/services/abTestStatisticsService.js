import ASOExperiment from '../models/ASOExperiment.js';

/**
 * A/B Test Statistical Analysis Service
 * Provides comprehensive statistical testing for A/B experiments
 * Supports multiple statistical tests: Z-test, T-test, Chi-square, Fisher's Exact
 */

// Cache for statistical calculations
const statisticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get A/B test results for statistical analysis
 * @param {string} experimentId - Experiment ID
 * @returns {Promise<Object>} Test results data
 */
export async function getABTestResults(experimentId) {
  try {
    const experiment = await ASOExperiment.findById(experimentId);

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Check cache
    const cacheKey = `results-${experimentId}`;
    const cached = statisticsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const results = {
      experimentId: experiment._id,
      name: experiment.name,
      type: experiment.type,
      status: experiment.status,
      variantA: {
        name: experiment.variantA.name,
        conversions: experiment.variantAConversions,
        views: experiment.variantAViews,
        conversionRate: experiment.variantAConversionRate || 0
      },
      variantB: {
        name: experiment.variantB.name,
        conversions: experiment.variantBConversions,
        views: experiment.variantBViews,
        conversionRate: experiment.variantBConversionRate || 0
      },
      metric: experiment.metric,
      targetSampleSize: experiment.targetSampleSize,
      startDate: experiment.startDate,
      duration: experiment.duration
    };

    // Cache results
    statisticsCache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

    return results;
  } catch (error) {
    console.error('Error fetching A/B test results:', error);
    throw error;
  }
}

/**
 * Apply statistical test to A/B test results
 * @param {string} experimentId - Experiment ID
 * @param {string} testType - Type of test: 'ztest', 'ttest', 'chisquare', 'fisher'
 * @returns {Promise<Object>} Statistical test results
 */
export async function applyStatisticalTest(experimentId, testType = 'ztest') {
  try {
    const results = await getABTestResults(experimentId);

    let testResults;

    switch (testType.toLowerCase()) {
      case 'ztest':
        testResults = performZTest(results);
        break;
      case 'ttest':
        testResults = performTTest(results);
        break;
      case 'chisquare':
        testResults = performChiSquareTest(results);
        break;
      case 'fisher':
        testResults = performFisherExactTest(results);
        break;
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }

    return {
      experimentId,
      testType,
      ...testResults,
      sampleSize: results.variantA.views + results.variantB.views,
      totalConversions: results.variantA.conversions + results.variantB.conversions
    };
  } catch (error) {
    console.error('Error applying statistical test:', error);
    throw error;
  }
}

/**
 * Perform Z-test for proportions
 * Most appropriate for large sample sizes (n > 30 per variant)
 */
function performZTest(results) {
  const p1 = results.variantA.conversions / results.variantA.views;
  const p2 = results.variantB.conversions / results.variantB.views;
  const n1 = results.variantA.views;
  const n2 = results.variantB.views;

  // Pooled proportion
  const pPooled = (results.variantA.conversions + results.variantB.conversions) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));

  // Z-score
  const z = se > 0 ? (p2 - p1) / se : 0;

  // P-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  // Confidence level
  const confidence = (1 - pValue) * 100;

  // Significant at 95% confidence?
  const isSignificant = pValue < 0.05;

  // Effect size (Cohen's h)
  const effectSize = 2 * Math.asin(Math.sqrt(p2)) - 2 * Math.asin(Math.sqrt(p1));

  // Lift
  const lift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

  return {
    testName: 'Z-Test for Proportions',
    testStatistic: z,
    pValue,
    confidence,
    isSignificant,
    effectSize,
    lift,
    standardError: se,
    interpretation: interpretPValue(pValue),
    power: calculatePower(n1, n2, p1, p2, pPooled)
  };
}

/**
 * Perform T-test for means
 * Appropriate for small sample sizes or when testing continuous metrics
 */
function performTTest(results) {
  const mean1 = results.variantA.conversionRate;
  const mean2 = results.variantB.conversionRate;
  const n1 = results.variantA.views;
  const n2 = results.variantB.views;

  // Standard deviations (estimated from binomial distribution)
  const std1 = Math.sqrt((mean1 / 100) * (1 - mean1 / 100));
  const std2 = Math.sqrt((mean2 / 100) * (1 - mean2 / 100));

  // Pooled standard deviation
  const pooledStd = Math.sqrt(
    ((n1 - 1) * std1 * std1 + (n2 - 1) * std2 * std2) / (n1 + n2 - 2)
  );

  // Standard error
  const se = pooledStd * Math.sqrt(1/n1 + 1/n2);

  // T-statistic
  const t = se > 0 ? (mean2 - mean1) / se : 0;

  // Degrees of freedom
  const df = n1 + n2 - 2;

  // P-value (two-tailed, approximated)
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));

  // Confidence level
  const confidence = (1 - pValue) * 100;

  // Significant at 95% confidence?
  const isSignificant = pValue < 0.05;

  // Effect size (Cohen's d)
  const effectSize = se > 0 ? (mean2 - mean1) / se : 0;

  // Lift
  const lift = mean1 > 0 ? ((mean2 - mean1) / mean1) * 100 : 0;

  return {
    testName: 'Two-Sample T-Test',
    testStatistic: t,
    degreesOfFreedom: df,
    pValue,
    confidence,
    isSignificant,
    effectSize,
    lift,
    standardError: se,
    interpretation: interpretPValue(pValue),
    criticalValue: getTCriticalValue(df, 0.05)
  };
}

/**
 * Perform Chi-square test of independence
 * Tests if there's a significant association between variant and conversion
 */
function performChiSquareTest(results) {
  // Create contingency table
  const observed = {
    a: { converted: results.variantA.conversions, notConverted: results.variantA.views - results.variantA.conversions },
    b: { converted: results.variantB.conversions, notConverted: results.variantB.views - results.variantB.conversions }
  };

  // Calculate expected values
  const totalConverted = observed.a.converted + observed.b.converted;
  const totalNotConverted = observed.a.notConverted + observed.b.notConverted;
  const totalA = results.variantA.views;
  const totalB = results.variantB.views;
  const grandTotal = totalA + totalB;

  const expected = {
    a: {
      converted: (totalA * totalConverted) / grandTotal,
      notConverted: (totalA * totalNotConverted) / grandTotal
    },
    b: {
      converted: (totalB * totalConverted) / grandTotal,
      notConverted: (totalB * totalNotConverted) / grandTotal
    }
  };

  // Calculate chi-square statistic
  let chiSquare = 0;
  chiSquare += Math.pow(observed.a.converted - expected.a.converted, 2) / expected.a.converted;
  chiSquare += Math.pow(observed.a.notConverted - expected.a.notConverted, 2) / expected.a.notConverted;
  chiSquare += Math.pow(observed.b.converted - expected.b.converted, 2) / expected.b.converted;
  chiSquare += Math.pow(observed.b.notConverted - expected.b.notConverted, 2) / expected.b.notConverted;

  // Degrees of freedom (2-1) * (2-1) = 1
  const df = 1;

  // P-value (using chi-square CDF approximation)
  const pValue = 1 - chiSquareCDF(chiSquare, df);

  // Confidence level
  const confidence = (1 - pValue) * 100;

  // Significant at 95% confidence?
  const isSignificant = pValue < 0.05;

  // Effect size (Phi coefficient)
  const phi = Math.sqrt(chiSquare / grandTotal);

  // Lift
  const p1 = results.variantA.conversions / results.variantA.views;
  const p2 = results.variantB.conversions / results.variantB.views;
  const lift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

  return {
    testName: 'Chi-Square Test of Independence',
    testStatistic: chiSquare,
    degreesOfFreedom: df,
    pValue,
    confidence,
    isSignificant,
    effectSize: phi,
    lift,
    interpretation: interpretPValue(pValue),
    criticalValue: 3.841, // Chi-square critical value for df=1, alpha=0.05
    contingencyTable: { observed, expected }
  };
}

/**
 * Perform Fisher's Exact Test
 * Most appropriate for small sample sizes
 * Uses hypergeometric distribution to calculate exact p-value
 */
function performFisherExactTest(results) {
  // Create 2x2 contingency table
  const a = results.variantA.conversions; // Variant A conversions
  const b = results.variantB.conversions; // Variant B conversions
  const c = results.variantA.views - results.variantA.conversions; // Variant A non-conversions
  const d = results.variantB.views - results.variantB.conversions; // Variant B non-conversions

  // Calculate Fisher's exact p-value (one-tailed)
  const pValueOneTailed = fisherExact(a, b, c, d);

  // Two-tailed p-value (multiply by 2 for symmetry, cap at 1.0)
  const pValue = Math.min(pValueOneTailed * 2, 1.0);

  // Confidence level
  const confidence = (1 - pValue) * 100;

  // Significant at 95% confidence?
  const isSignificant = pValue < 0.05;

  // Odds ratio
  const oddsRatio = (a * d) / (b * c || 0.001); // Avoid division by zero

  // Lift
  const p1 = results.variantA.conversions / results.variantA.views;
  const p2 = results.variantB.conversions / results.variantB.views;
  const lift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

  return {
    testName: "Fisher's Exact Test",
    testStatistic: oddsRatio,
    pValue,
    confidence,
    isSignificant,
    effectSize: Math.log(oddsRatio), // Log odds ratio
    lift,
    oddsRatio,
    interpretation: interpretPValue(pValue),
    contingencyTable: { a, b, c, d }
  };
}

/**
 * Calculate Fisher's exact p-value using hypergeometric distribution
 */
function fisherExact(a, b, c, d) {
  const n = a + b + c + d;
  const r = a + b;
  const k = a + c;

  let pValue = 0;

  // Calculate probability for observed table
  const observedProb = hypergeometricProb(a, r, k, n);

  // Sum probabilities for all tables as or more extreme than observed
  for (let i = Math.max(0, k - (c + d)); i <= Math.min(r, k); i++) {
    const prob = hypergeometricProb(i, r, k, n);
    if (prob <= observedProb) {
      pValue += prob;
    }
  }

  return pValue;
}

/**
 * Calculate hypergeometric probability
 */
function hypergeometricProb(x, n, K, N) {
  const numerator = combinations(K, x) * combinations(N - K, n - x);
  const denominator = combinations(N, n);
  return numerator / denominator;
}

/**
 * Calculate binomial coefficient (n choose k)
 */
function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }

  return result;
}

/**
 * Calculate p-value
 * @param {string} experimentId - Experiment ID
 * @param {string} testType - Type of test
 * @returns {Promise<number>} P-value (0-1)
 */
export async function calculatePValue(experimentId, testType = 'ztest') {
  try {
    const results = await applyStatisticalTest(experimentId, testType);
    return results.pValue;
  } catch (error) {
    console.error('Error calculating p-value:', error);
    throw error;
  }
}

/**
 * Determine if test result is statistically significant
 * @param {string} experimentId - Experiment ID
 * @param {string} testType - Type of test
 * @param {number} alpha - Significance level (default: 0.05 for 95% confidence)
 * @returns {Promise<Object>} Significance determination
 */
export async function determineSignificance(experimentId, testType = 'ztest', alpha = 0.05) {
  try {
    const results = await applyStatisticalTest(experimentId, testType);
    const isSignificant = results.pValue < alpha;

    return {
      experimentId,
      testType,
      isSignificant,
      pValue: results.pValue,
      confidence: results.confidence,
      alpha,
      interpretation: results.interpretation,
      recommendation: isSignificant
        ? 'Result is statistically significant. You can trust the observed difference.'
        : 'Result is not statistically significant. Collect more data or conclude no significant difference.',
      winner: determineWinner(results)
    };
  } catch (error) {
    console.error('Error determining significance:', error);
    throw error;
  }
}

/**
 * Determine winner based on statistical test results
 */
function determineWinner(testResults) {
  const { lift, isSignificant } = testResults;

  if (!isSignificant) {
    return {
      variant: 'inconclusive',
      reason: 'Test is not statistically significant',
      confidence: testResults.confidence
    };
  }

  if (lift > 0) {
    return {
      variant: 'variantB',
      reason: `Variant B outperforms Variant A by ${lift.toFixed(2)}%`,
      confidence: testResults.confidence,
      lift: lift.toFixed(2)
    };
  } else if (lift < 0) {
    return {
      variant: 'variantA',
      reason: `Variant A outperforms Variant B by ${Math.abs(lift).toFixed(2)}%`,
      confidence: testResults.confidence,
      lift: Math.abs(lift).toFixed(2)
    };
  } else {
    return {
      variant: 'inconclusive',
      reason: 'No significant difference between variants',
      confidence: testResults.confidence
    };
  }
}

/**
 * Get comprehensive statistical analysis summary
 * @param {string} experimentId - Experiment ID
 * @returns {Promise<Object>} Complete analysis summary
 */
export async function getStatisticalSummary(experimentId) {
  try {
    const results = await getABTestResults(experimentId);

    // Run all statistical tests
    const zTest = await applyStatisticalTest(experimentId, 'ztest');
    const tTest = await applyStatisticalTest(experimentId, 'ttest');
    const chiSquare = await applyStatisticalTest(experimentId, 'chisquare');
    const fisher = await applyStatisticalTest(experimentId, 'fisher');

    // Determine overall significance (majority vote)
    const significantCount = [zTest, tTest, chiSquare, fisher].filter(t => t.isSignificant).length;
    const overallSignificant = significantCount >= 3;

    return {
      experimentId,
      experimentName: results.name,
      testResults: {
        zTest,
        tTest,
        chiSquare,
        fisher
      },
      overallConclusion: {
        isSignificant: overallSignificant,
        consensus: `${significantCount}/4 tests show significance`,
        recommendation: overallSignificant
          ? 'Strong evidence of significant difference between variants'
          : 'Insufficient evidence to conclude significant difference',
        recommendedTest: results.variantA.views + results.variantB.views > 100 ? 'ztest' : 'fisher'
      },
      sampleSize: {
        total: results.variantA.views + results.variantB.views,
        variantA: results.variantA.views,
        variantB: results.variantB.views,
        sufficient: (results.variantA.views + results.variantB.views) >= results.targetSampleSize
      },
      effectSize: {
        value: Math.abs(zTest.effectSize),
        interpretation: interpretEffectSize(Math.abs(zTest.effectSize))
      }
    };
  } catch (error) {
    console.error('Error generating statistical summary:', error);
    throw error;
  }
}

/**
 * Get available statistical tests
 */
export function getAvailableTests() {
  return [
    {
      id: 'ztest',
      name: 'Z-Test',
      description: 'Best for large sample sizes (n > 30 per variant)',
      appropriateFor: 'Conversion rate testing with sufficient data'
    },
    {
      id: 'ttest',
      name: 'T-Test',
      description: 'Best for small sample sizes or continuous metrics',
      appropriateFor: 'When sample size is limited or testing mean values'
    },
    {
      id: 'chisquare',
      description: 'Chi-Square Test',
      description: 'Tests independence between variant and conversion',
      appropriateFor: 'Categorical data analysis'
    },
    {
      id: 'fisher',
      name: "Fisher's Exact Test",
      description: 'Best for very small sample sizes',
      appropriateFor: 'When sample size is very small (< 30 per variant)'
    }
  ];
}

/**
 * Clear statistics cache
 */
export function clearCache() {
  statisticsCache.clear();
}

// ============ HELPER FUNCTIONS ============

/**
 * Normal cumulative distribution function (CDF) approximation
 */
function normalCDF(z) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Student's t-distribution CDF approximation
 */
function tCDF(t, df) {
  // Approximation using normal distribution for large df
  if (df > 100) {
    return normalCDF(t);
  }

  // For small df, use approximation
  const a = df / 2;
  const x = df / (df + t * t);

  // Regularized incomplete beta function approximation
  const beta = 0.5 * x + 0.5;
  return t > 0 ? 1 - 0.5 * beta : 0.5 * beta;
}

/**
 * Chi-square CDF approximation
 */
function chiSquareCDF(x, df) {
  if (x < 0) return 0;

  // Wilson-Hilferty approximation for df >= 1
  const z = Math.pow(x / df, 1/3) - (1 - 2/(9*df)) / Math.sqrt(2/(9*df));
  return normalCDF(z);
}

/**
 * Calculate statistical power (probability of detecting an effect if it exists)
 */
function calculatePower(n1, n2, p1, p2, pPooled) {
  const effectSize = Math.abs(p2 - p1);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));

  if (se === 0 || effectSize === 0) return 0;

  const z = effectSize / se;
  const power = normalCDF(z - 1.96); // 1.96 is the z-value for 95% confidence

  return Math.max(0, Math.min(1, power)) * 100;
}

/**
 * Get critical t-value for given degrees of freedom and alpha
 */
function getTCriticalValue(df, alpha) {
  // Approximation for common values
  if (df >= 1000) return 1.96; // Normal distribution
  if (df >= 100) return 1.984;
  if (df >= 60) return 2.000;
  if (df >= 40) return 2.021;
  if (df >= 30) return 2.042;
  if (df >= 20) return 2.086;
  if (df >= 10) return 2.228;
  return 2.306; // df = 8
}

/**
 * Interpret p-value
 */
function interpretPValue(pValue) {
  if (pValue < 0.001) {
    return 'Extremely significant (p < 0.001)';
  } else if (pValue < 0.01) {
    return 'Very significant (p < 0.01)';
  } else if (pValue < 0.05) {
    return 'Significant (p < 0.05)';
  } else if (pValue < 0.1) {
    return 'Marginally significant (p < 0.1)';
  } else {
    return 'Not significant (p >= 0.1)';
  }
}

/**
 * Interpret effect size (Cohen's d or similar)
 */
function interpretEffectSize(effectSize) {
  if (effectSize < 0.2) {
    return 'Small effect';
  } else if (effectSize < 0.5) {
    return 'Medium effect';
  } else if (effectSize < 0.8) {
    return 'Large effect';
  } else {
    return 'Very large effect';
  }
}

export default {
  getABTestResults,
  applyStatisticalTest,
  calculatePValue,
  determineSignificance,
  getStatisticalSummary,
  getAvailableTests,
  clearCache
};
