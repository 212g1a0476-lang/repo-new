import fs from "fs/promises";

// Read JSON file safely
export async function readJSONFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    if (err.code === "ENOENT") {
      // File doesn't exist → return empty array
      return [];
    }
    throw err;
  }
}

// Write JSON to file safely
export async function writeJSONFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}
