import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axiosClient";
import TableView from "./TableView";

export default function ChatPanel() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState("");

  // LOAD SESSION DATA
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await api.get(`/sessions/${id}`);
        setSession(res.data);
      } catch (e) {
        console.error("Error loading session:", e);
      }
    }

    fetchSession();
  }, [id]);

  // SEND QUESTION
  const sendQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      await api.post(`/sessions/${id}/message`, { question });
      setQuestion("");

      // reload session after adding message
      const res = await api.get(`/sessions/${id}`);
      setSession(res.data);
    } catch (e) {
      console.error("Error sending question:", e);
    }
  };

  // SEND FEEDBACK
  const sendFeedback = async (msgId, action) => {
    try {
      await api.post(`/sessions/${id}/messages/${msgId}/feedback`, { action });

      // reload latest session
      const res = await api.get(`/sessions/${id}`);
      setSession(res.data);
    } catch (e) {
      console.error("Error sending feedback:", e);
    }
  };

  if (!session) {
    return <div className="card">Loading...</div>;
  }

  const messages = session.messages || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "78vh" }}>
      {/* Session Title */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ marginBottom: 4 }}>{session.title}</h2>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>
          Created: {new Date(session.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 8,
          marginBottom: 12,
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className="card" style={{ marginBottom: 12 }}>
            <p>
              <strong>You:</strong> {msg.question}
            </p>

            <p style={{ fontWeight: "600", marginTop: 6 }}>
              {msg.responseTitle}
            </p>

            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              {msg.responseDescription}
            </p>

            {/* Table */}
            <TableView table={msg.table} />

            {/* Feedback */}
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => sendFeedback(msg.id, "like")}
                style={{
                  marginRight: 10,
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                👍 {msg.feedback.likes}
              </button>

              <button
                onClick={() => sendFeedback(msg.id, "dislike")}
                style={{
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                👎 {msg.feedback.dislikes}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Ask Question Form */}
      <form
        onSubmit={sendQuestion}
        style={{ display: "flex", gap: 10, marginTop: 10 }}
      >
        <input
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
          }}
          value={question}
          placeholder="Ask something..."
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button type="submit" className="btn">
          Send
        </button>
      </form>
    </div>
  );
}
