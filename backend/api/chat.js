import express from "express";
import databaseService from "../services/database.js";

const router = express.Router();

// Mock GLM4.7 API integration for development
// In production, this will call the actual GLM4.7 API
async function callGLM4API(messages, conversationHistory = []) {
  // For development, return mock responses
  // In production, this would make an actual API call to GLM4.7

  const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";

  // Simple mock response logic based on keywords
  if (lastUserMessage.includes("revenue") || lastUserMessage.includes("mrr")) {
    return {
      role: "assistant",
      content: `Based on the current data, your MRR is $425 with 38 active subscribers. That's a 12% increase from last month. However, we're still far from the $10,000/month goal.

I recommend focusing on:
1. **Content Strategy**: Increase posting frequency to 3-4 posts per day across TikTok and Instagram
2. **ASO Optimization**: The keyword "spicy fiction" dropped from #5 to #7, we should address this
3. **Paid Ads**: Current ROI is negative (-66% on TikTok Ads), consider pausing and refining targeting

Would you like me to create action items for any of these areas?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("content") || lastUserMessage.includes("post")) {
    return {
      role: "assistant",
      content: `Looking at your content performance:

**Top Performing Posts (Last 7 Days):**
1. "Forbidden Professor Chapter 1" - 45.2K views, 4.2% engagement
2. "Billionaire's Secret Baby" - 38.1K views, 3.8% engagement
3. "Office Romance Compilation" - 29.4K views, 5.1% engagement

**Recommendations:**
- Focus more on "professor romance" and "secret baby" themes
- Video length 15-30 seconds performs best
- Post between 6-9 PM EST for maximum engagement
- Use trending audio from TikTok's viral sounds

I've prepared a content strategy proposal. Should I create a task to generate more content in these themes?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("budget") || lastUserMessage.includes("spend")) {
    return {
      role: "assistant",
      content: `**Budget Status: ⚠️ Warning**

Current utilization: 72% of monthly budget ($2,160 of $3,000 spent)
Daily spend rate: $86/day (on track)
Projected month-end spend: $2,580

**Channel Breakdown:**
- Apple Search Ads: $1,200 (40% of budget) - ROI: -45%
- TikTok Ads: $720 (24% of budget) - ROI: -66%
- Instagram Ads: $240 (8% of budget) - ROI: -72%

**My Recommendation:**
Pause all paid campaigns immediately. The negative ROI means we're losing money on every acquisition. Focus on organic growth through content and ASO optimization instead.

Should I draft a budget reallocation proposal for your approval?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("keyword") || lastUserMessage.includes("aso")) {
    return {
      role: "assistant",
      content: `**ASO Performance Update:**

⚠️ **Alert**: "spicy fiction" dropped from #5 to #7 (2 positions)
✅ **Positive**: "romance stories" holding at #12
✅ **Positive**: "fiction app" improved to #18

**Opportunity Keywords:**
1. "romance novels" - #45, High volume, Low competition
2. "love stories" - #38, Medium volume, Medium competition
3. "fanfiction" - #52, High volume, Low competition

**Suggested Actions:**
1. Update app subtitle to include "romance novels"
2. Create keyword A/B test for "spicy fiction" vs "spicy romance"
3. Optimize app description with high-performing keywords

Would you like me to set up an A/B test or update the app metadata?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("hello") || lastUserMessage.includes("hi")) {
    return {
      role: "assistant",
      content: `Hello! I'm your AI Marketing Executive for the Blush app. I'm here to help you grow from $425 MRR to $10,000/month.

Here's what I can help with:
- 📊 **Analytics**: Review performance metrics and trends
- 💰 **Revenue**: Track MRR, subscribers, and revenue growth
- 📱 **Content**: Plan and optimize social media content
- 🔍 **ASO**: Improve App Store rankings and visibility
- 📈 **Ads**: Manage paid advertising campaigns
- 💡 **Strategy**: Develop and execute growth strategies

What would you like to focus on today?`,
      timestamp: new Date().toISOString()
    };
  } else {
    return {
      role: "assistant",
      content: `I understand you're asking about "${lastUserMessage}".

To give you the most relevant advice, could you provide more context? I can help with:

1. **Revenue & Growth** - MRR tracking, subscriber analysis, churn rate
2. **Content Strategy** - Post performance, content ideas, scheduling
3. **ASO & Keywords** - App Store optimization, keyword rankings
4. **Paid Advertising** - Campaign performance, ROI analysis, budget management
5. **Strategic Planning** - Growth initiatives, milestone tracking

What area would you like to explore?`,
      timestamp: new Date().toISOString()
    };
  }
}

// GET /api/chat/history - Get conversation history
router.get("/history", async (req, res) => {
  try {
    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      // Return empty history if no database connection
      return res.json({
        success: true,
        conversations: [],
        message: "No database connection - using in-memory storage"
      });
    }

    const mongoose = await import('mongoose');
    const conversations = await mongoose.connection
      .collection("marketing_strategy")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv._id,
        type: conv.type,
        title: conv.title,
        content: conv.content,
        reasoning: conv.reasoning,
        status: conv.status,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.json({
      success: true,
      conversations: [],
      message: "Error fetching history - starting fresh"
    });
  }
});

// POST /api/chat/message - Send a message and get AI response
router.post("/message", async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required and must be a string"
      });
    }

    // Build messages array for AI
    const messages = [
      {
        role: "system",
        content: `You are an AI Marketing Executive for the Blush iPhone app - a romantic/spicy AI story generator. Your goal is to help grow the app from $300-500/month MRR to $10,000/month in 6 months.

Key context:
- Target audience: 90%+ female, 85% straight, ages 18-45
- Current MRR: $425 with 38 active subscribers
- Channels: TikTok, Instagram, YouTube Shorts, Apple Search Ads
- Brand voice: Sex-positive, romantic, empowering, sexy

Your role:
- Provide strategic recommendations based on data
- Be collaborative and explain your reasoning
- Create action items when appropriate
- Ask for approval before making significant changes
- Be concise but thorough

Always base recommendations on actual data when available.`
      },
      {
        role: "user",
        content: message
      }
    ];

    // Get AI response
    const aiResponse = await callGLM4API(messages);

    // Save conversation to database if available
    const status = databaseService.getStatus();
    let savedConversation = null;

    if (status.isConnected && status.readyState === 1) {
      try {
        const mongoose = await import('mongoose');
        const conversation = {
          type: "chat",
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          content: aiResponse.content,
          reasoning: `Responding to: ${message}`,
          status: "completed",
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await mongoose.connection.collection("marketing_strategy").insertOne(conversation);
        savedConversation = {
          id: result.insertedId,
          ...conversation
        };
      } catch (dbError) {
        console.error("Error saving conversation to database:", dbError);
        // Continue without saving
      }
    }

    res.json({
      success: true,
      response: {
        role: aiResponse.role,
        content: aiResponse.content,
        timestamp: aiResponse.timestamp
      },
      conversationId: savedConversation?.id,
      message: "Response generated successfully"
    });
  } catch (error) {
    console.error("Error processing chat message:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/feedback - Provide feedback on AI response
router.post("/feedback", async (req, res) => {
  try {
    const { conversationId, feedback, type } = req.body;

    if (!conversationId || !feedback) {
      return res.status(400).json({
        success: false,
        error: "Conversation ID and feedback are required"
      });
    }

    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      return res.json({
        success: true,
        message: "Feedback received (not persisted - no database connection)"
      });
    }

    // Update conversation with feedback
    const mongoose = await import('mongoose');
    await mongoose.connection.collection("marketing_strategy").updateOne(
      { _id: conversationId },
      {
        $set: {
          feedback: feedback,
          feedbackType: type, // 'positive' or 'negative'
          feedbackGivenAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: "Feedback recorded successfully"
    });
  } catch (error) {
    console.error("Error recording feedback:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/chat/history - Clear conversation history
router.delete("/history", async (req, res) => {
  try {
    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      return res.json({
        success: true,
        message: "History cleared (no database connection)"
      });
    }

    const mongoose = await import('mongoose');
    await mongoose.connection.collection("marketing_strategy").deleteMany({ type: "chat" });

    res.json({
      success: true,
      message: "Conversation history cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing chat history:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
