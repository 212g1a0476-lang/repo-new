import React from "react";

export default function Topbar({ theme, setTheme }) {
  return (
    <>
      <h2>Chat App</h2>
      <button
        className="btn"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>
    </>
  );
}
