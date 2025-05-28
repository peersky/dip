#!/usr/bin/env node

/**
 * Development script that runs the frontend:
 * - Connected to production API (peeramid.network/api)
 * - Using mainnet chain configuration
 * - Without running the local API server
 *
 * This reduces local system load while still allowing development
 */

const { spawn } = require("child_process");
const path = require("path");

// Environment variables to set
const envVars = {
  // Point API requests to production
  NEXT_PUBLIC_API_BASE_URL: "https://peeramid.network/api",

  // Use mainnet chain (Celo)
  NEXT_PUBLIC_TESTNET_ENABLED: "false",

  // Disable local API development (requests will go to production)
  NEXT_API_SKIP_LOCAL: "true",

  // Set production mode for chain configuration but keep development server
  NEXT_PUBLIC_PUBLIC_DEV_MODE: "false",

  // Make sure we're not running in test mode
  NODE_ENV: "development",
};

console.log("Starting frontend in development mode with the following configuration:");
console.log("- API: peeramid.network/api (production)");
console.log("- Chain: Celo mainnet");
console.log("- Local API server: Disabled\n");

// Merge current environment variables with our custom ones
const env = { ...process.env, ...envVars };

// Start the Next.js development server
const devProcess = spawn("pnpm", ["next", "dev"], {
  env,
  stdio: "inherit",
  shell: true,
  cwd: path.resolve(__dirname),
});

// Handle process exit
devProcess.on("exit", (code) => {
  console.log(`Development server exited with code ${code}`);
  process.exit(code);
});

// Handle process errors
devProcess.on("error", (err) => {
  console.error("Failed to start development server:", err);
  process.exit(1);
});

// Handle termination signals
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    console.log(`\nReceived ${signal}, shutting down development server...`);
    devProcess.kill(signal);
  });
});
