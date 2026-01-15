import express from "express";
import chatRouter from "./chat.js";
import { createTodosFromAIRecommendations } from "../utils/todoAutoCreator.js";
import databaseService from "../services/database.js";

const router = express.Router();

// Proxy all existing chat endpoints
router.use("/", chatRouter);

// Override the message endpoint to add auto-todo creation
router.post("/message-autotodos", async (req, res) => {
  try {
    const { message, conversationId, autoCreateTodos = true } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required and must be a string"
      });
    }

    // Build messages array for AI
    let messages = [
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
- Maintain context across multiple conversation turns

Always base recommendations on actual data when available.`
      }
    ];

    // Load conversation history if conversationId is provided
    let existingConversation = null;
    const status = databaseService.getStatus();

    if (conversationId) {
      if (status.isConnected && status.readyState === 1) {
        try {
          const mongoose = await import('mongoose');
          const collection = mongoose.connection.collection("marketing_strategy");
          existingConversation = await collection.findOne({ _id: new mongoose.Types.ObjectId(conversationId) });

          // Add previous messages to context for multi-turn conversation
          if (existingConversation && existingConversation.messages && existingConversation.messages.length > 0) {
            messages = messages.concat(existingConversation.messages);
          }
        } catch (dbError) {
          console.error("Error loading conversation history:", dbError);
        }
      }
    }

    // Add current user message
    messages.push({
      role: "user",
      content: message
    });

    // Import the callGLM4API function from chat.js (we need to access it)
    // For now, we'll use a simpler approach - import the entire chat module
    const chatResponse = await fetch('http://localhost:3001/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId })
    });

    const responseData = await chatResponse.json();

    if (!responseData.success) {
      return res.status(500).json(responseData);
    }

    // Auto-create todos from AI recommendations if enabled
    let autoCreatedTodos = [];
    if (autoCreateTodos && responseData.success) {
      const aiResponse = {
        content: responseData.response.content,
        timestamp: responseData.response.timestamp
      };

      // Get the new conversation ID if one was created
      const newConversationId = responseData.conversationId || conversationId;

      autoCreatedTodos = await createTodosFromAIRecommendations(
        aiResponse,
        newConversationId,
        status
      );
    }

    // Return the response with auto-created todos info
    res.json({
      ...responseData,
      autoCreatedTodos: autoCreatedTodos,
      autoCreatedTodosCount: autoCreatedTodos.length
    });

  } catch (error) {
    console.error("Error processing chat message with auto-todos:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
