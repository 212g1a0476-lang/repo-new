import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");

    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="app-root">
      <div className="topbar">
        <Topbar theme={theme} setTheme={setTheme} />
      </div>

      <div className="app-shell">
        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        </aside>

        <main className="main">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/session/:id" element={<ChatPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
