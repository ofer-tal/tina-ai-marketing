import TinaReflection from '../models/TinaReflection.js';
import TinaThoughtLog from '../models/TinaThoughtLog.js';
import MarketingStrategy from '../models/MarketingStrategy.js';
import MarketingExperiment from '../models/MarketingExperiment.js';
import MarketingGoal from '../models/MarketingGoal.js';
import MarketingPost from '../models/MarketingPost.js';
import TinaLearning from '../models/TinaLearning.js';
import TinaObservation from '../models/TinaObservation.js';
import { getLogger } from '../utils/logger.js';
import glmService from '../services/glmService.js';

const logger = getLogger('jobs', 'tina-reflection');

/**
 * Generate weekly reflection
 *
 * Analyzes the past week's activity and generates a structured reflection
 * including wins, losses, learnings, and priorities for next week.
 */
export async function generateWeeklyReflection() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

  // Check if reflection already exists for this week
  const existing = await TinaReflection.getByWeek(d.getUTCFullYear(), weekNumber);

  if (existing && existing.status === 'completed') {
    logger.info('Reflection already exists for this week', { year: d.getUTCFullYear(), weekNumber });
    return { exists: true, reflectionId: existing.reflectionId };
  }

  try {
    // Get week range (Monday to Sunday)
    const monday = new Date(d);
    monday.setDate(d.getDate() - (d.getDay() || 7) + 1);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    logger.info('Generating weekly reflection', {
      year: d.getUTCFullYear(),
      weekNumber,
      weekStart: monday,
      weekEnd: sunday
    });

    // Fetch data for the week
    const [thoughts, experiments, strategies, goals, posts, learnings] = await Promise.all([
      TinaThoughtLog.find({
        timestamp: { $gte: monday, $lte: sunday }
      }).sort({ timestamp: -1 }).limit(50).lean(),

      MarketingExperiment.find({
        $or: [
          { createdAt: { $gte: monday, $lte: sunday } },
          { startDate: { $gte: monday, $lte: sunday } },
          { actualEndDate: { $gte: monday, $lte: sunday } }
        ]
      }).lean(),

      MarketingStrategy.find({
        status: { $in: ['active', 'paused', 'completed'] },
        updatedAt: { $gte: monday }
      }).lean(),

      MarketingGoal.find({
        updatedAt: { $gte: monday }
      }).lean(),

      MarketingPost.find({
        publishedAt: { $gte: monday, $lte: sunday }
      }).lean(),

      TinaLearning.find({
        createdAt: { $gte: monday, $lte: sunday }
      }).lean()
    ]);

    logger.info('Week data fetched', {
      thoughts: thoughts.length,
      experiments: experiments.length,
      strategies: strategies.length,
      goals: goals.length,
      posts: posts.length,
      learnings: learnings.length
    });

    // Try AI-powered reflection generation first
    let sections, sentiment, improvementAreas, continueDoing, stopDoing, startDoing, nextWeekPriorities, overallScore, questionsForFounder;

    const aiReflection = await generateReflectionWithAI(
      thoughts,
      experiments,
      strategies,
      goals,
      posts,
      learnings,
      weekNumber,
      d.getUTCFullYear()
    );

    if (aiReflection) {
      // Use AI-generated reflection
      sections = aiReflection.sections || [];
      sentiment = aiReflection.sentiment || 'neutral';
      improvementAreas = aiReflection.improvementAreas || [];
      continueDoing = aiReflection.continueDoing || [];
      stopDoing = aiReflection.stopDoing || [];
      startDoing = aiReflection.startDoing || [];
      nextWeekPriorities = aiReflection.nextWeekPriorities || [];
      overallScore = aiReflection.overallScore || 50;
      questionsForFounder = aiReflection.questionsForFounder || [];
      logger.info('Using AI-generated reflection');
    } else {
      // Fall back to template-based generation
      logger.info('Using template-based reflection generation');

      // Section: What I Tried
      sections = [];
      if (thoughts.length > 0) {
        sections.push({
          title: 'What I Tried',
          content: generateThoughtsSummary(thoughts),
          category: 'observations',
          relatedIds: thoughts.map(t => t._id.toString())
        });
      }

      // Section: Experiments
      const activeExperiments = experiments.filter(e => e.status === 'running');
      const completedExperiments = experiments.filter(e => e.status === 'completed');
      if (experiments.length > 0) {
        sections.push({
          title: 'Experiments',
          content: generateExperimentsSummary(activeExperiments, completedExperiments),
          category: 'learnings',
          relatedIds: experiments.map(e => e._id.toString())
        });
      }

      // Section: Content Performance
      if (posts.length > 0) {
        sections.push({
          title: 'Content Performance',
          content: generatePostsSummary(posts),
          category: 'metrics'
        });
      }

      // Section: Strategy Updates
      if (strategies.length > 0) {
        sections.push({
          title: 'Strategy Updates',
          content: generateStrategiesSummary(strategies),
          category: 'observations',
          relatedIds: strategies.map(s => s._id.toString())
        });
      }

      // Section: Goal Progress
      if (goals.length > 0) {
        sections.push({
          title: 'Goal Progress',
          content: generateGoalsSummary(goals),
          category: 'metrics',
          relatedIds: goals.map(g => g._id.toString())
        });
      }

      // Section: Key Learnings
      if (learnings.length > 0) {
        sections.push({
          title: 'Key Learnings',
          content: generateLearningsSummary(learnings),
          category: 'learnings',
          relatedIds: learnings.map(l => l._id.toString())
        });
      }

      // Calculate sentiment based on week's activity
      sentiment = calculateSentiment(completedExperiments, posts, strategies);

      // Generate improvement areas and recommendations
      improvementAreas = generateImprovementAreas(strategies, goals, posts);
      continueDoing = generateContinueDoing(completedExperiments, strategies);
      stopDoing = generateStopDoing(strategies, experiments);
      startDoing = generateStartDoing(goals, experiments);
      nextWeekPriorities = generateNextWeekPriorities(goals, strategies, experiments);

      // Calculate overall score
      overallScore = calculateOverallScore(completedExperiments, posts, strategies);

      // No AI-generated questions in fallback mode
      questionsForFounder = [];
    }

    // Create or update reflection
    let reflection;
    if (existing) {
      reflection = existing;
    } else {
      reflection = new TinaReflection({
        weekOf: monday,
        year: d.getUTCFullYear(),
        weekNumber
      });
    }

    // Update reflection data
    reflection.sections = sections;
    reflection.sentiment = sentiment;
    reflection.improvementAreas = improvementAreas;
    reflection.continueDoing = continueDoing;
    reflection.stopDoing = stopDoing;
    reflection.startDoing = startDoing;
    reflection.nextWeekPriorities = nextWeekPriorities;
    reflection.overallScore = overallScore;
    reflection.questionsForFounder = questionsForFounder;

    // Add metrics
    reflection.metrics = [];
    if (posts.length > 0) {
      const avgEngagement = posts.reduce((sum, p) =>
        sum + (p.performanceMetrics?.engagementRate || 0), 0
      ) / posts.length;
      reflection.metrics.push({
        name: 'Average Engagement Rate',
        value: Math.round(avgEngagement * 10) / 10,
        target: 5.0,
        status: avgEngagement >= 5 ? 'met' : 'below',
        notes: `${posts.length} posts published`
      });
    }

    if (strategies.length > 0) {
      const activeStrategies = strategies.filter(s => s.status === 'active').length;
      reflection.metrics.push({
        name: 'Active Strategies',
        value: activeStrategies,
        target: 5,
        status: activeStrategies >= 3 ? 'met' : 'below'
      });
    }

    if (experiments.length > 0) {
      const completedExperiments = experiments.filter(e => e.status === 'completed');
      const completedCount = completedExperiments.length;
      reflection.metrics.push({
        name: 'Experiments Completed',
        value: completedCount,
        target: 2,
        status: completedCount >= 1 ? 'met' : 'below'
      });
    }

    // Generate summary
    reflection.summary = generateSummary(reflection);

    // Mark as completed
    await reflection.complete();

    // Create observation to notify user
    await createReflectionObservation(reflection);

    logger.info('Weekly reflection generated', {
      reflectionId: reflection.reflectionId,
      year: reflection.year,
      weekNumber: reflection.weekNumber,
      sentiment,
      overallScore,
      questionsCount: questionsForFounder.length
    });

    return { success: true, reflectionId: reflection.reflectionId };

  } catch (error) {
    logger.error('Error generating reflection', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
}

/**
 * Generate summary from thoughts
 */
function generateThoughtsSummary(thoughts) {
  if (thoughts.length === 0) return 'No thoughts logged this week.';

  const byType = {};
  thoughts.forEach(t => {
    const type = t.thoughtType || 'general';
    if (!byType[type]) byType[type] = [];
    byType[type].push(t);
  });

  const parts = [];
  for (const [type, typeThoughts] of Object.entries(byType)) {
    parts.push(`${type}: ${typeThoughts.length} thought${typeThoughts.length !== 1 ? 's' : ''}`);
  }

  return parts.join('. ');
}

/**
 * Generate summary from experiments
 */
function generateExperimentsSummary(active, completed) {
  const parts = [];

  if (active.length > 0) {
    parts.push(`${active.length} active experiment${active.length !== 1 ? 's' : ''}`);
    active.forEach(e => {
      parts.push(`- "${e.name}" (running)`);
    });
  }

  if (completed.length > 0) {
    parts.push(`${completed.length} completed experiment${completed.length !== 1 ? 's' : ''}`);
    completed.forEach(e => {
      const winner = e.winningVariant ? `Winner: ${e.winningVariant}` : '';
      parts.push(`- "${e.name}" ${winner}`);
    });
  }

  return parts.length > 0 ? parts.join('. ') : 'No experiments this week.';
}

/**
 * Generate summary from posts
 */
function generatePostsSummary(posts) {
  if (posts.length === 0) return 'No posts published this week.';

  const totalEngagement = posts.reduce((sum, p) =>
    sum + (p.performanceMetrics?.engagementRate || 0), 0
  );
  const avgEngagement = totalEngagement / posts.length;

  const byPlatform = {};
  posts.forEach(p => {
    const platform = p.platform || 'unknown';
    if (!byPlatform[platform]) byPlatform[platform] = 0;
    byPlatform[platform]++;
  });

  const platformBreakdown = Object.entries(byPlatform)
    .map(([platform, count]) => `${count} ${platform}`)
    .join(', ');

  return `${posts.length} posts published (${platformBreakdown}). Average engagement: ${Math.round(avgEngagement * 10) / 10}%.`;
}

/**
 * Generate summary from strategies
 */
function generateStrategiesSummary(strategies) {
  if (strategies.length === 0) return 'No strategy updates this week.';

  const byStatus = {};
  strategies.forEach(s => {
    if (!byStatus[s.status]) byStatus[s.status] = [];
    byStatus[s.status].push(s.name);
  });

  const parts = [];
  if (byStatus.active) {
    parts.push(`${byStatus.active.length} active: ${byStatus.active.slice(0, 3).join(', ')}`);
  }
  if (byStatus.completed) {
    parts.push(`${byStatus.completed.length} completed: ${byStatus.completed.join(', ')}`);
  }
  if (byStatus.paused) {
    parts.push(`${byStatus.paused.length} paused: ${byStatus.paused.join(', ')}`);
  }

  return parts.join('. ') || 'No strategy updates.';
}

/**
 * Generate summary from goals
 */
function generateGoalsSummary(goals) {
  if (goals.length === 0) return 'No goal updates this week.';

  const onTrack = goals.filter(g => {
    if (g.targetValue && g.currentValue) {
      return g.currentValue >= g.targetValue * 0.8;
    }
    return false;
  }).length;

  const behind = goals.length - onTrack;

  return `${goals.length} goals tracked. ${onTrack} on track, ${behind} behind target.`;
}

/**
 * Generate summary from learnings
 */
function generateLearningsSummary(learnings) {
  if (learnings.length === 0) return 'No new learnings this week.';

  const byCategory = {};
  learnings.forEach(l => {
    if (!byCategory[l.category]) byCategory[l.category] = 0;
    byCategory[l.category]++;
  });

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(', ');

  return `${learnings.length} new pattern${learnings.length !== 1 ? 's' : ''} discovered. Top categories: ${topCategories}.`;
}

/**
 * Calculate sentiment based on week's activity
 */
function calculateSentiment(completedExperiments, posts, strategies) {
  let score = 50; // neutral

  // Positive indicators
  if (completedExperiments.length > 0) score += 10;
  if (posts.length > 5) score += 10;
  if (strategies.some(s => s.status === 'completed')) score += 15;

  // Negative indicators
  if (strategies.some(s => s.status === 'paused')) score -= 5;

  // Determine sentiment
  if (score >= 80) return 'very_positive';
  if (score >= 65) return 'positive';
  if (score >= 35) return 'neutral';
  if (score >= 20) return 'negative';
  return 'very_negative';
}

/**
 * Generate improvement areas
 */
function generateImprovementAreas(strategies, goals, posts) {
  const areas = [];

  // Check for paused strategies
  const pausedStrategies = strategies.filter(s => s.status === 'paused');
  if (pausedStrategies.length > 0) {
    areas.push(`Review ${pausedStrategies.length} paused strateg${pausedStrategies.length !== 1 ? 'ies' : 'y'}`);
  }

  // Check for behind goals
  const behindGoals = goals.filter(g => {
    if (g.targetValue && g.currentValue) {
      return g.currentValue < g.targetValue * 0.8;
    }
    return false;
  });
  if (behindGoals.length > 0) {
    areas.push(`Accelerate progress on ${behindGoals.length} goal${behindGoals.length !== 1 ? 's' : ''}`);
  }

  // Check for low post volume
  if (posts.length < 3) {
    areas.push('Increase content output');
  }

  return areas;
}

/**
 * Generate continue doing list
 */
function generateContinueDoing(completedExperiments, strategies) {
  const list = [];

  // Continue successful strategies
  const activeStrategies = strategies.filter(s => s.status === 'active');
  if (activeStrategies.length > 0) {
    const topStrategy = activeStrategies
      .filter(s => s.progress && s.progress.currentValue)
      .sort((a, b) => {
        const progressA = a.progress.currentValue / (a.progress.targetValue || 1);
        const progressB = b.progress.currentValue / (b.progress.targetValue || 1);
        return progressB - progressA;
      })[0];
    if (topStrategy) {
      list.push(`Pursue "${topStrategy.name}" strategy`);
    }
  }

  // Continue experimenting
  if (completedExperiments.length > 0) {
    list.push('Run regular A/B tests');
  }

  return list;
}

/**
 * Generate stop doing list
 */
function generateStopDoing(strategies, experiments) {
  const list = [];

  // Stop paused strategies
  const pausedStrategies = strategies.filter(s => s.status === 'paused');
  pausedStrategies.forEach(s => {
    list.push(`Paused: "${s.name}"`);
  });

  // Stop failed experiments
  const failedExperiments = experiments.filter(e => e.status === 'cancelled');
  failedExperiments.forEach(e => {
    list.push(`Experiment: "${e.name}"`);
  });

  return list;
}

/**
 * Generate start doing list
 */
function generateStartDoing(goals, experiments) {
  const list = [];

  // Start strategies for behind goals
  const behindGoals = goals.filter(g => {
    if (g.targetValue && g.currentValue) {
      return g.currentValue < g.targetValue * 0.8;
    }
    return false;
  });

  behindGoals.forEach(g => {
    list.push(`Initiatives for goal: "${g.name}"`);
  });

  // Test new hypotheses
  list.push('Test new content hypotheses');

  return list;
}

/**
 * Generate next week priorities
 */
function generateNextWeekPriorities(goals, strategies, experiments) {
  const priorities = [];

  // Priority from behind goals
  const behindGoals = goals.filter(g => {
    if (g.targetValue && g.currentValue) {
      return g.currentValue < g.targetValue * 0.8;
    }
    return false;
  });

  if (behindGoals.length > 0) {
    priorities.push(`Focus on ${behindGoals[0].name}`);
  }

  // Complete running experiments
  const runningExperiments = experiments.filter(e => e.status === 'running');
  if (runningExperiments.length > 0) {
    priorities.push(`Complete "${runningExperiments[0].name}" experiment`);
  }

  // Create new experiments
  priorities.push('Design new A/B test');

  // Content creation
  priorities.push('Maintain content output');

  return priorities;
}

/**
 * Calculate overall score (0-100)
 */
function calculateOverallScore(completedExperiments, posts, strategies) {
  let score = 50; // baseline

  // Experiment points
  if (completedExperiments.length > 0) score += 15;
  if (completedExperiments.length >= 2) score += 10;

  // Content points
  if (posts.length >= 5) score += 10;
  if (posts.length >= 10) score += 5;

  // Strategy points
  const activeStrategies = strategies.filter(s => s.status === 'active').length;
  const completedStrategies = strategies.filter(s => s.status === 'completed').length;
  score += activeStrategies * 5;
  score += completedStrategies * 10;

  // Paused strategy penalty
  const pausedStrategies = strategies.filter(s => s.status === 'paused').length;
  score -= pausedStrategies * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate summary text
 */
function generateSummary(reflection) {
  const parts = [];

  if (reflection.sections.length > 0) {
    const titles = reflection.sections.map(s => s.title).join(', ');
    parts.push(`Covered: ${titles}`);
  }

  if (reflection.continueDoing.length > 0) {
    parts.push(`Continue: ${reflection.continueDoing[0]}`);
  }

  if (reflection.nextWeekPriorities.length > 0) {
    parts.push(`Next: ${reflection.nextWeekPriorities[0]}`);
  }

  return parts.join('. ') || 'Weekly reflection generated.';
}

/**
 * Generate AI-powered reflection using GLM-4.7
 *
 * Uses LLM to generate more nuanced, specific insights instead of templates.
 */
async function generateReflectionWithAI(thoughts, experiments, strategies, goals, posts, learnings, weekNumber, year) {
  const prompt = buildReflectionPrompt(thoughts, experiments, strategies, goals, posts, learnings, weekNumber, year);

  try {
    const response = await glmService.createMessage({
      messages: [
        {
          role: 'system',
          content: `You are Tina, an AI marketing executive. Generate structured weekly reflections.

Return ONLY valid JSON matching this exact schema:
{
  "sections": [
    {"title": "Executive Summary", "content": "...", "category": "general"},
    {"title": "What I Tried", "content": "...", "category": "wins"},
    {"title": "What Worked", "content": "...", "category": "wins"},
    {"title": "What Didn't Work", "content": "...", "category": "losses"},
    {"title": "Key Learnings", "content": "...", "category": "learnings"}
  ],
  "sentiment": "very_positive|positive|neutral|negative|very_negative",
  "overallScore": 0-100,
  "improvementAreas": ["..."],
  "continueDoing": ["..."],
  "stopDoing": ["..."],
  "startDoing": ["..."],
  "nextWeekPriorities": ["..."],
  "questionsForFounder": [
    {"question": "...", "context": "...", "relatedTo": "goal|strategy|experiment|learning|general", "id": "..."}
  ]
}

Be specific, honest, and actionable. Base your analysis on the actual data provided.
Generate 3-5 thoughtful questions for the founder that arise from this week's data.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      maxTokens: 4096,
      temperature: 0.7
    });

    return parseReflectionResponse(response);
  } catch (error) {
    logger.warn('AI reflection generation failed, falling back to template', { error: error.message });
    return null; // Signal to use fallback
  }
}

/**
 * Build the prompt for AI reflection generation
 */
function buildReflectionPrompt(thoughts, experiments, strategies, goals, posts, learnings, weekNumber, year) {
  let prompt = `Generate a weekly marketing reflection for week ${weekNumber} of ${year}.\n\n`;

  // Context sections
  if (thoughts.length > 0) {
    prompt += `## Thoughts & Decisions (${thoughts.length})\n`;
    prompt += thoughts.slice(0, 10).map(t => `- ${t.thoughtType || 'general'}: ${t.thought?.substring(0, 100) || 'no content'}`).join('\n') + '\n\n';
  }

  if (experiments.length > 0) {
    prompt += `## Experiments\n`;
    experiments.forEach(e => {
      prompt += `- ${e.name}: ${e.status}`;
      if (e.status === 'completed' && e.results) {
        const winner = e.results.winner || e.winningVariant || 'pending';
        const lift = e.results.lift || 'N/A';
        prompt += ` (Winner: ${winner}, Lift: ${lift}%)`;
      }
      prompt += '\n';
    });
    prompt += '\n';
  }

  if (strategies.length > 0) {
    prompt += `## Strategies\n`;
    strategies.forEach(s => {
      let progress = '';
      if (s.progress && s.progress.targetValue) {
        const pct = Math.round((s.progress.currentValue / s.progress.targetValue) * 100);
        progress = ` (${pct}% progress)`;
      }
      prompt += `- ${s.name}: ${s.status}${progress}\n`;
    });
    prompt += '\n';
  }

  if (goals.length > 0) {
    prompt += `## Goals\n`;
    goals.forEach(g => {
      let progress = '';
      if (g.targetValue && g.currentValue) {
        const pct = Math.round((g.currentValue / g.targetValue) * 100);
        progress = ` (${pct}% achieved)`;
      }
      prompt += `- ${g.name}: ${g.status}${progress}\n`;
    });
    prompt += '\n';
  }

  if (posts.length > 0) {
    prompt += `## Content Performance\n`;
    prompt += `${posts.length} posts published this week.\n`;
    const byPlatform = posts.reduce((acc, p) => {
      acc[p.platform || 'unknown'] = (acc[p.platform || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    prompt += `Platforms: ${Object.entries(byPlatform).map(([p, c]) => `${c} ${p}`).join(', ')}\n`;

    // Add engagement stats
    const totalEngagement = posts.reduce((sum, p) => sum + (p.performanceMetrics?.engagementRate || 0), 0);
    if (posts.length > 0 && totalEngagement > 0) {
      const avgEngagement = totalEngagement / posts.length;
      prompt += `Average engagement rate: ${Math.round(avgEngagement * 10) / 10}%\n`;
    }
    prompt += '\n';
  }

  if (learnings.length > 0) {
    prompt += `## New Learnings (${learnings.length})\n`;
    learnings.slice(0, 5).forEach(l => {
      prompt += `- ${l.pattern} (confidence: ${l.confidence}%)\n`;
    });
    prompt += '\n';
  }

  prompt += `Generate a thoughtful, actionable reflection. Be specific and honest about what worked and what didn't.
Include 3-5 thoughtful questions for the founder based on this week's data - these should prompt strategic thinking
or highlight areas needing attention.

Respond with ONLY the JSON object, no additional text.`;

  return prompt;
}

/**
 * Parse the LLM response into reflection data
 */
function parseReflectionResponse(response) {
  try {
    let content = '';
    if (Array.isArray(response.content)) {
      content = response.content.find(c => c.type === 'text')?.text || '';
    } else if (typeof response.content === 'string') {
      content = response.content;
    }

    // Extract JSON from the response (handle potential markdown code blocks)
    let jsonStr = content.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      const lines = jsonStr.split('\n');
      lines.shift(); // Remove first line (```json or ```)
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop(); // Remove last line (```)
      }
      jsonStr = lines.join('\n');
    }

    const data = JSON.parse(jsonStr);

    logger.info('AI reflection generated successfully', {
      sectionsCount: data.sections?.length || 0,
      questionsCount: data.questionsForFounder?.length || 0,
      sentiment: data.sentiment,
      overallScore: data.overallScore
    });

    return data;
  } catch (error) {
    logger.error('Failed to parse AI reflection response', {
      error: error.message,
      contentPreview: response.content?.substring(0, 500)
    });
    return null;
  }
}

/**
 * Create TinaObservation for completed reflection
 */
async function createReflectionObservation(reflection) {
  try {
    const observation = new TinaObservation({
      urgency: 'low',
      category: 'milestone',
      title: `Weekly Reflection Ready - Week ${reflection.weekNumber}`,
      summary: `Week ${reflection.weekNumber} reflection is complete. Score: ${reflection.overallScore}/100, Sentiment: ${reflection.sentiment}.`,
      details: {
        what: 'Weekly reflection generated',
        why: 'Automatic weekly review of activities and outcomes',
        metric: 'weekly_reflection',
        value: {
          weekNumber: reflection.weekNumber,
          year: reflection.year,
          overallScore: reflection.overallScore,
          sentiment: reflection.sentiment,
          sectionsCount: reflection.sections?.length || 0,
          hasQuestions: reflection.questionsForFounder?.length > 0
        }
      },
      actionRequest: {
        type: 'review_content',
        description: 'Review the full weekly reflection for insights and questions',
        parameters: {
          reflectionId: reflection.reflectionId,
          viewPath: `/tina/reflections/${reflection._id}`
        },
        estimatedEffort: 'low'
      },
      status: 'pending',
      tags: ['weekly-reflection', `week-${reflection.weekNumber}`, `year-${reflection.year}`]
    });

    await observation.save();
    logger.info('Reflection observation created', { observationId: observation.observationId });
    return observation;
  } catch (error) {
    logger.error('Failed to create reflection observation', { error: error.message });
    return null;
  }
}

export default { generateWeeklyReflection, generateReflectionWithAI, createReflectionObservation };
