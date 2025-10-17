/**
 * Flux Rich List Scanner - Main Entry Point
 *
 * This service does two things:
 * 1. Runs an HTTP server to serve rich list data
 * 2. Runs periodic blockchain scans via cron job
 */

import cron from "node-cron";
import { startServer } from "./server";
import { scanBlockchain } from "./scanner";

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 2 * * *"; // Default: 2am daily
const RUN_SCAN_ON_STARTUP = process.env.RUN_SCAN_ON_STARTUP !== "false"; // Default: true

console.log("🚀 Starting Flux Rich List Scanner");
console.log(`⏰ Cron schedule: ${CRON_SCHEDULE}`);
console.log(`🔄 Run scan on startup: ${RUN_SCAN_ON_STARTUP}`);

// Start HTTP server
startServer();

// Run initial scan on startup (if enabled)
if (RUN_SCAN_ON_STARTUP) {
  console.log("🔍 Running initial scan on startup...");
  scanBlockchain()
    .then(() => {
      console.log("✅ Initial scan completed");
    })
    .catch((error) => {
      console.error("❌ Initial scan failed:", error);
      // Don't exit - server should still run even if scan fails
    });
}

// Schedule periodic scans
cron.schedule(CRON_SCHEDULE, () => {
  console.log(`⏰ Cron job triggered: ${new Date().toISOString()}`);
  scanBlockchain()
    .then(() => {
      console.log("✅ Scheduled scan completed");
    })
    .catch((error) => {
      console.error("❌ Scheduled scan failed:", error);
    });
});

console.log("✅ Scanner service is running");

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("👋 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
