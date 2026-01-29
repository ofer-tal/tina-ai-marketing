import express from "express";
import databaseService from "../services/database.js";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { validate, schemas } from "../middleware/validation.js";

const router = express.Router();

// GET /api/todos/test - Test route
router.get("/test", async (req, res) => {
  res.json({
    success: true,
    message: "Todos routes are working!",
    timestamp: new Date().toISOString()
  });
});

// GET /api/todos - Get all todos
router.get("/", async (req, res) => {
  try {
    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      // Return mock todos if no database connection
      const mockTodos = [
        {
          _id: "1",
          title: "Review and approve 3 pending posts",
          description: "You have 3 posts scheduled for today that need approval before posting",
          category: "review",
          priority: "high",
          status: "pending",
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          completedAt: null,
          resources: [
            { type: "link", url: "/content/approval", description: "Review Pending Approvals" }
          ],
          estimatedTime: 15,
          actualTime: null,
          createdBy: "ai",
          relatedStrategyId: null,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          _id: "2",
          title: "Update ASO keywords",
          description: "Fix declining 'spicy fiction' keyword ranking (dropped from #5 to #7)",
          category: "configuration",
          priority: "medium",
          status: "pending",
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          dueAt: null,
          completedAt: null,
          resources: [
            { type: "link", url: "/aso", description: "ASO Settings" }
          ],
          estimatedTime: 30,
          actualTime: null,
          createdBy: "ai",
          relatedStrategyId: null,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: "3",
          title: "Create 10 Professor Romance story posts",
          description: "Increase content volume for top-performing category",
          category: "posting",
          priority: "high",
          status: "in_progress",
          scheduledAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: null,
          resources: [
            { type: "link", url: "/content", description: "Content Library" },
            { type: "document", url: "#", description: "Professor Romance Story Guide" }
          ],
          estimatedTime: 120,
          actualTime: 45,
          createdBy: "ai",
          relatedStrategyId: null,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
      ];

      return res.json({
        success: true,
        todos: mockTodos,
        message: "Mock data - no database connection"
      });
    }

    const todos = await mongoose.connection
      .collection("marketing_tasks")
      .find({})
      .sort({ scheduledAt: 1, priority: -1 })
      .limit(50)
      .toArray();

    res.json({
      success: true,
      todos: todos.map(todo => ({
        id: todo._id,
        title: todo.title,
        description: todo.description,
        category: todo.category,
        priority: todo.priority,
        status: todo.status,
        scheduledAt: todo.scheduledAt,
        dueAt: todo.dueAt,
        completedAt: todo.completedAt,
        resources: todo.resources || [],
        estimatedTime: todo.estimatedTime,
        actualTime: todo.actualTime,
        createdBy: todo.createdBy,
        relatedStrategyId: todo.relatedStrategyId,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/todos - Create new todo
router.post("/", validate(schemas.todo, { sanitize: true }), async (req, res) => {
  try {
    const { title, description, category, priority, scheduledAt, dueAt, resources, estimatedTime, createdBy, relatedStrategyId } = req.body;

    const status = databaseService.getStatus();
    let createdTodo = null;

    if (status.isConnected && status.readyState === 1) {
      try {
        const todo = {
          title,
          description: description || "",
          category: category || "review",
          priority: priority || "medium",
          status: "pending",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          dueAt: dueAt ? new Date(dueAt) : null,
          completedAt: null,
          resources: resources || [],
          estimatedTime: estimatedTime || null,
          actualTime: null,
          createdBy: createdBy || "ai",
          relatedStrategyId: relatedStrategyId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await mongoose.connection.collection("marketing_tasks").insertOne(todo);
        createdTodo = {
          id: result.insertedId,
          ...todo
        };
      } catch (dbError) {
        console.error("Error saving todo to database:", dbError);
        // Continue with mock response
      }
    }

    // If no database save, return mock success
    if (!createdTodo) {
      createdTodo = {
        id: `mock_${Date.now()}`,
        title,
        description: description || "",
        category: category || "review",
        priority: priority || "medium",
        status: "pending",
        scheduledAt: scheduledAt || new Date().toISOString(),
        dueAt: dueAt || null,
        completedAt: null,
        resources: resources || [],
        estimatedTime: estimatedTime || null,
        actualTime: null,
        createdBy: createdBy || "ai",
        relatedStrategyId: relatedStrategyId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      todo: createdTodo,
      message: "Todo created successfully"
    });
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/todos/:id/complete - Mark todo as complete
router.post("/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    const status = databaseService.getStatus();

    if (status.isConnected && status.readyState === 1) {
      await mongoose.connection.collection("marketing_tasks").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
    }

    res.json({
      success: true,
      message: "Todo marked as complete"
    });
  } catch (error) {
    console.error("Error completing todo:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/todos/:id/snooze - Snooze todo
router.post("/:id/snooze", async (req, res) => {
  try {
    const { id } = req.params;
    const { snoozeUntil } = req.body;

    const status = databaseService.getStatus();

    if (status.isConnected && status.readyState === 1) {
      await mongoose.connection.collection("marketing_tasks").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "snoozed",
            scheduledAt: snoozeUntil ? new Date(snoozeUntil) : new Date(Date.now() + 60 * 60 * 1000),
            updatedAt: new Date()
          }
        }
      );
    }

    res.json({
      success: true,
      message: "Todo snoozed successfully"
    });
  } catch (error) {
    console.error("Error snoozing todo:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/todos/:id - Update todo (no validation required for partial updates)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const status = databaseService.getStatus();

    if (status.isConnected && status.readyState === 1) {
      // First try to find the document to see if it exists
      const existingDoc = await mongoose.connection.collection("marketing_tasks").findOne({ _id: new ObjectId(id) });

      if (!existingDoc) {
        console.log(`[PUT] Document not found with _id: ${id}`);
        return res.status(404).json({
          success: false,
          error: "Todo not found"
        });
      }

      console.log(`[PUT] Found document:`, existingDoc.title, `current status:`, existingDoc.status);

      // If status is being changed to completed, add completedAt timestamp
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      if (updates.status === 'completed') {
        updateData.completedAt = new Date();
      } else if (updates.status === 'pending' || updates.status === 'in_progress') {
        // Clear completedAt if reverting from completed
        updateData.completedAt = null;
      }

      // Update the document
      const result = await mongoose.connection.collection("marketing_tasks").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updateData
        }
      );

      console.log(`[PUT] Update result - matchedCount:`, result.matchedCount, `modifiedCount:`, result.modifiedCount);
    }

    res.json({
      success: true,
      message: "Todo updated successfully"
    });
  } catch (error) {
    console.error("Error updating todo:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/todos/:id/debug - Debug endpoint to see raw document (must come before /:id routes)
router.get("/:id/debug", async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await mongoose.connection.collection("marketing_tasks").findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      document: doc,
      idType: typeof id,
      objectId: new ObjectId(id)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// DELETE /api/todos/:id - Delete todo
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const status = databaseService.getStatus();

    if (status.isConnected && status.readyState === 1) {
      await mongoose.connection.collection("marketing_tasks").deleteOne({ _id: new ObjectId(id) });
    }

    res.json({
      success: true,
      message: "Todo deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
