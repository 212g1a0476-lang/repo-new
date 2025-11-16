import React, { useEffect, useState } from "react";
import api from "../api/axiosClient";
import { Link, useNavigate } from "react-router-dom";

export default function Sidebar({ collapsed, setCollapsed }) {
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  const loadSessions = async () => {
    const res = await api.get("/sessions");
    setSessions(res.data);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const newSession = async () => {
    const res = await api.post("/sessions");
    navigate(`/session/${res.data.id}`);
    loadSessions();
  };

  return (
    <div>
      <button onClick={() => setCollapsed(!collapsed)}>☰</button>

      {!collapsed && (
        <>
          <button className="btn" onClick={newSession}>New Chat</button>

          <ul>
            {sessions.map((s) => (
              <li key={s.id}>
                <Link to={`/session/${s.id}`}>{s.title}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
