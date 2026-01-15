/**
 * Auto-create todos from AI recommendations
 * Detects actionable items in AI responses and creates todos automatically
 */

import databaseService from "../services/database.js";

/**
 * Automatically create todos from AI recommendations
 * Detects actionable items in AI responses and creates todos
 */
export async function createTodosFromAIRecommendations(aiResponse, conversationId, status) {
  const createdTodos = [];

  // Only create todos if database is available
  if (!status.isConnected || status.readyState !== 1) {
    console.log("⚠️ Database not connected - skipping auto todo creation");
    return createdTodos;
  }

  try {
    const mongoose = await import('mongoose');

    // Parse AI response for actionable recommendations
    const recommendations = [];

    // Check for explicit "Next Steps" or "Action Items" sections
    const actionItemsMatch = aiResponse.content.match(/(?:Next Steps|Action Items|✅.*?:)[\s\S]*?(?=\n\n|\n\*\*[A-Z]|$)/i);
    if (actionItemsMatch) {
      const items = actionItemsMatch[0].split('\n')
        .filter(line => line.trim().match(/^[\-\*\d\.]+?\s+/)) // Match list items
        .map(line => line.replace(/^[\-\*\d\.]+?\s*/, '').trim())
        .filter(line => line.length > 5); // Filter out very short items

      recommendations.push(...items);
    }

    // Check for recommendations with specific keywords
    const recommendationKeywords = [
      'should i',
      'recommend',
      'create',
      'update',
      'pause',
      'implement',
      'setup',
      'generate',
      'add',
      'fix',
      'optimize'
    ];

    const lines = aiResponse.content.split('\n');
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (recommendationKeywords.some(keyword => lowerLine.includes(keyword))) {
        // Check if this line looks like a recommendation
        if (line.trim().length > 10 && !line.startsWith('**')) {
          const cleanLine = line.replace(/^[\-\*\d\.]+?\s*/, '').trim();
          if (cleanLine.length > 5 && !recommendations.includes(cleanLine)) {
            recommendations.push(cleanLine);
          }
        }
      }
    });

    // Also check for numbered action items in recommendations sections
    const numberedItemsMatch = aiResponse.content.match(/\d+\.\s+[A-Z][^.\n]+/g);
    if (numberedItemsMatch) {
      numberedItemsMatch.forEach(item => {
        const cleanItem = item.replace(/^\d+\.\s+/, '').trim();
        if (cleanItem.length > 5 && !recommendations.includes(cleanItem)) {
          recommendations.push(cleanItem);
        }
      });
    }

    // Limit to top 5 recommendations to avoid spam
    const topRecommendations = recommendations.slice(0, 5);

    if (topRecommendations.length === 0) {
      console.log("ℹ️ No actionable recommendations found in AI response");
      return createdTodos;
    }

    // Create todos for each recommendation
    for (const recommendation of topRecommendations) {
      // Determine category based on content
      let category = 'review';
      let priority = 'medium';

      const lowerRec = recommendation.toLowerCase();

      if (lowerRec.includes('content') || lowerRec.includes('post') || lowerRec.includes('tiktok') || lowerRec.includes('instagram') || lowerRec.includes('video')) {
        category = 'posting';
        priority = 'high';
      } else if (lowerRec.includes('campaign') || lowerRec.includes('ad') || lowerRec.includes('budget') || lowerRec.includes('pause')) {
        category = 'review';
        priority = 'urgent';
      } else if (lowerRec.includes('keyword') || lowerRec.includes('aso') || lowerRec.includes('app store')) {
        category = 'configuration';
        priority = 'medium';
      } else if (lowerRec.includes('create') || lowerRec.includes('setup') || lowerRec.includes('implement') || lowerRec.includes('build')) {
        category = 'development';
        priority = 'high';
      } else if (lowerRec.includes('review') || lowerRec.includes('analyze') || lowerRec.includes('check') || lowerRec.includes('monitor')) {
        category = 'analysis';
        priority = 'medium';
      }

      // Schedule for today or tomorrow based on priority
      const scheduledAt = priority === 'urgent'
        ? new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const todo = {
        title: recommendation.length > 60 ? recommendation.substring(0, 60) + '...' : recommendation,
        description: `AI-generated recommendation from conversation`,
        category,
        priority,
        status: 'pending',
        scheduledAt,
        dueAt: priority === 'urgent' ? new Date(Date.now() + 4 * 60 * 60 * 1000) : null,
        completedAt: null,
        resources: conversationId ? [{
          type: 'link',
          url: `/chat?conversation=${conversationId}`,
          description: 'View conversation context'
        }] : [],
        estimatedTime: priority === 'urgent' ? 15 : 30,
        actualTime: null,
        createdBy: 'ai',
        relatedStrategyId: conversationId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await mongoose.connection.collection("marketing_tasks").insertOne(todo);
      createdTodos.push({
        id: result.insertedId,
        ...todo
      });

      console.log(`✅ Created todo: "${todo.title}" (category: ${category}, priority: ${priority})`);
    }

    console.log(`✅ Auto-created ${createdTodos.length} todos from AI recommendations`);
  } catch (error) {
    console.error("❌ Error auto-creating todos:", error);
  }

  return createdTodos;
}
