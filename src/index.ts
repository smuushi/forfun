import { ChatClient } from "./client.js";

// Debug logging
console.log("Process arguments:", process.argv);
console.log("Current directory:", process.cwd());

const args = process.argv.slice(2);
console.log("Parsed arguments:", args);

const mode = args[0];
const serverUrl = args[1];

console.log("Mode:", mode);
console.log("Server URL:", serverUrl);

if (!mode || (mode === "client" && !serverUrl)) {
  console.log("Usage:");
  console.log("  Server mode: pnpm server");
  console.log("  Client mode: pnpm client http://<server-ip>:3000");
  process.exit(1);
}

async function main() {
  try {
    if (mode === "server") {
      console.log("Starting server mode...");
      const { startServer } = await import("./server.js");
      console.log("Server module loaded");
      console.log("Starting server function...");
      await startServer();
      console.log("Server function called");
    } else if (mode === "client") {
      console.log("Starting client mode...");
      const client = new ChatClient(serverUrl);
      client.start();
    }
  } catch (error) {
    console.error("Error in main:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
  }
}

main().catch((error) => {
  console.error("Top level error:", error);
  console.error(
    "Error stack:",
    error instanceof Error ? error.stack : "No stack trace"
  );
});
