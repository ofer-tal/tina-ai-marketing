#!/usr/bin/env python3
"""
Script to add auto-todo creation to chat.js
"""
import re

# Read the file
with open('C:/Projects/blush-marketing/backend/api/chat.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Check if import already exists
if 'createTodosFromAIRecommendations' in content:
    print("✅ Import already exists")
else:
    # Add import after line 2
    lines = content.split('\n')
    lines.insert(2, 'import { createTodosFromAIRecommendations } from "../utils/todoAutoCreator.js";')
    content = '\n'.join(lines)
    print("✅ Added import statement")

# Find the section where we need to add auto-todo creation (after aiResponse is received)
# Look for the pattern where we return the response
if 'autoCreatedTodos' in content:
    print("✅ Auto-todo code already exists")
else:
    # Find the location to add the auto-todo creation
    # We'll add it right before the final res.json in the message endpoint

    # Pattern: Find where we save the conversation and add auto-todo creation
    pattern = r'(savedConversation = \{[^}]+\}\s*\}\s*)'

    # Add auto-todo creation after saving conversation
    replacement = r'''\1
    // Auto-create todos from AI recommendations
    let autoCreatedTodos = [];
    try {
      autoCreatedTodos = await createTodosFromAIRecommendations(
        aiResponse,
        savedConversation?.id || conversationId,
        status
      );
    } catch (todoError) {
      console.error("Error auto-creating todos:", todoError);
      // Don't fail the chat response if todo creation fails
    }
'''

    content = re.sub(pattern, replacement, content, count=1)
    print("✅ Added auto-todo creation code")

    # Now modify the response to include autoCreatedTodos
    # Find the res.json with the response
    old_response = '''res.json({
      success: true,
      response: {
        role: aiResponse.role,
        content: aiResponse.content,
        timestamp: aiResponse.timestamp,
        proposal: aiResponse.proposal || null
      },
      conversationId: savedConversation?.id,'''

    new_response = '''res.json({
      success: true,
      response: {
        role: aiResponse.role,
        content: aiResponse.content,
        timestamp: aiResponse.timestamp,
        proposal: aiResponse.proposal || null
      },
      conversationId: savedConversation?.id,
      autoCreatedTodos: autoCreatedTodos,
      autoCreatedTodosCount: autoCreatedTodos.length,'''

    content = content.replace(old_response, new_response)
    print("✅ Modified response to include autoCreatedTodos")

# Write the file back
with open('C:/Projects/blush-marketing/backend/api/chat.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Successfully modified chat.js to add auto-todo creation!")
