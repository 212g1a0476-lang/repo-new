import express from "express";
import {
  createSession,
  getSessions,
  getSessionById,
  addMessageToSession,
  updateMessageFeedback
} from "../controllers/sessionController.js";

const router = express.Router();

// Create new session
router.post("/", createSession);

// Get all sessions
router.get("/", getSessions);

// Get single session by ID
router.get("/:id", getSessionById);

// Add question → returns mock response
router.post("/:id/message", addMessageToSession);

// Like / Dislike feedback
router.post("/:sessionId/messages/:messageId/feedback", updateMessageFeedback);

export default router;
