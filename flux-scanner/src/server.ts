/**
 * HTTP Server for Rich List Scanner
 *
 * Serves the generated rich-list.json file via HTTP
 * Allows the explorer component to fetch the data
 */

import express from "express";
import * as fs from "fs/promises";
import * as path from "path";
import type { RichListData } from "./types";

const PORT = parseInt(process.env.PORT || "3001");
const DATA_DIR = process.env.DATA_DIR || "/data";
const RICH_LIST_FILE = path.join(DATA_DIR, "rich-list.json");

const app = express();

// CORS headers to allow explorer to fetch data
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "flux-rich-list-scanner",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get full rich list
 */
app.get("/rich-list", async (req, res) => {
  try {
    const data = await fs.readFile(RICH_LIST_FILE, "utf-8");
    const richList: RichListData = JSON.parse(data);

    res.json(richList);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({
        error: "Rich list not yet generated",
        message: "The scanner has not completed its first run yet. Please try again later.",
      });
    } else {
      console.error("Error reading rich list:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to read rich list data",
      });
    }
  }
});

/**
 * Get rich list metadata (without full address list)
 */
app.get("/rich-list/metadata", async (req, res) => {
  try {
    const data = await fs.readFile(RICH_LIST_FILE, "utf-8");
    const richList: RichListData = JSON.parse(data);

    res.json({
      lastUpdate: richList.lastUpdate,
      lastBlockHeight: richList.lastBlockHeight,
      totalSupply: richList.totalSupply,
      totalAddresses: richList.totalAddresses,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({
        error: "Rich list not yet generated",
      });
    } else {
      console.error("Error reading rich list metadata:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
});

/**
 * Get paginated rich list
 * Query params: page (1-based), pageSize (default 100)
 */
app.get("/rich-list/paginated", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 100, 1000); // Max 1000 per page

    const data = await fs.readFile(RICH_LIST_FILE, "utf-8");
    const richList: RichListData = JSON.parse(data);

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAddresses = richList.addresses.slice(startIndex, endIndex);

    res.json({
      lastUpdate: richList.lastUpdate,
      lastBlockHeight: richList.lastBlockHeight,
      totalSupply: richList.totalSupply,
      totalAddresses: richList.totalAddresses,
      page,
      pageSize,
      totalPages: Math.ceil(richList.addresses.length / pageSize),
      addresses: paginatedAddresses,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({
        error: "Rich list not yet generated",
      });
    } else {
      console.error("Error reading rich list:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
});

/**
 * Start server
 */
export function startServer(): void {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Rich list server listening on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Rich list: http://localhost:${PORT}/rich-list`);
    console.log(`📄 Metadata: http://localhost:${PORT}/rich-list/metadata`);
    console.log(`📃 Paginated: http://localhost:${PORT}/rich-list/paginated?page=1&pageSize=100`);
  });
}

// Start server if executed directly
if (require.main === module) {
  startServer();
}
