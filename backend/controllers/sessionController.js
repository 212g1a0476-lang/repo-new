import { v4 as uuidv4 } from "uuid";
import path from "path";
import { readJSONFile, writeJSONFile } from "../utils/fileUtils.js";

const __dirname = path.resolve();
const SESSIONS_FILE = path.join(__dirname, "data", "sessions.json");
const MOCK_FILE = path.join(__dirname, "data", "mock_data.json");

// Create a new session
export async function createSession(req, res) {
  try {
    const sessions = await readJSONFile(SESSIONS_FILE);

    const id = uuidv4();
    const title = req.body?.title || `Session ${sessions.length + 1}`;

    const session = {
      id,
      title,
      createdAt: new Date().toISOString(),
      messages: []
    };

    sessions.unshift(session);
    await writeJSONFile(SESSIONS_FILE, sessions);

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get list of all sessions
export async function getSessions(req, res) {
  try {
    const sessions = await readJSONFile(SESSIONS_FILE);
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get a session by ID
export async function getSessionById(req, res) {
  try {
    const sessions = await readJSONFile(SESSIONS_FILE);
    const session = sessions.find(s => s.id === req.params.id);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Add a message/question to a session
export async function addMessageToSession(req, res) {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question required" });
    }

    const sessions = await readJSONFile(SESSIONS_FILE);
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);

    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Session not found" });
    }

    const mock = await readJSONFile(MOCK_FILE);
    const q = question.toLowerCase();

    // Keyword-based mock selection
    let response = mock.responses[0];

    if (q.includes("inventory")) {
      response = mock.responses.find(r => r.intent === "inventory") || response;
    }
    if (q.includes("sales") || q.includes("revenue") || q.includes("monthly")) {
      response = mock.responses.find(r => r.intent === "sales_report") || response;
    }

    const answer = {
      id: uuidv4(),
      question,
      responseTitle: response.title,
      responseDescription: response.description,
      table: response.table,
      createdAt: new Date().toISOString(),
      feedback: { likes: 0, dislikes: 0 }
    };

    sessions[sessionIndex].messages.push(answer);

    // Update session title if it's a default one
    if (
      !sessions[sessionIndex].title ||
      sessions[sessionIndex].title.startsWith("Session")
    ) {
      sessions[sessionIndex].title = response.title;
    }

    await writeJSONFile(SESSIONS_FILE, sessions);

    res.json(answer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Update feedback (like/dislike)
export async function updateMessageFeedback(req, res) {
  try {
    const { action } = req.body;

    const sessions = await readJSONFile(SESSIONS_FILE);
    const session = sessions.find(s => s.id === req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const message = session.messages.find(m => m.id === req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (action === "like") {
      message.feedback.likes += 1;
    } else if (action === "dislike") {
      message.feedback.dislikes += 1;
    }

    await writeJSONFile(SESSIONS_FILE, sessions);

    res.json({
      success: true,
      feedback: message.feedback
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
