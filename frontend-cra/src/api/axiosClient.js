import axios from "axios";

const base = process.env.REACT_APP_API_URL || "http://localhost:4000/api";
console.log("API base URL:", base);

const api = axios.create({
  baseURL: base,
  // optionally: timeout: 5000
});

export default api;
