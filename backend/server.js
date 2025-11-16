import express from "express";
import cors from "cors";
import sessionRoutes from "./routes/sessionRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/sessions", sessionRoutes);

// Basic test route
app.get("/", (req, res) => {
  res.json({ message: "Mock Chat API running" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});
