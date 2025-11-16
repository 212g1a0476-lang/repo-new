import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// global error logging (helps catch silent failures)
window.addEventListener("error", e =>
  console.error("WINDOW ERROR:", e.error || e.message)
);
window.addEventListener("unhandledrejection", e =>
  console.error("UNHANDLED REJECTION:", e.reason)
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
