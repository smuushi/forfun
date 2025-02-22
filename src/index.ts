import ChatClient from "./client";

const args = process.argv.slice(2);
const mode = args[0];
const serverUrl = args[1];

console.log("Starting application with mode:", mode);

if (!mode || (mode === "client" && !serverUrl)) {
  console.log("Usage:");
  console.log("  Server mode: pnpm dev server");
  console.log("  Client mode: pnpm dev client http://<server-ip>:3000");
  process.exit(1);
}

async function main() {
  try {
    if (mode === "server") {
      console.log("Starting server mode...");
      const serverModule = await import("./server");
      console.log("Server module loaded:", Object.keys(serverModule));
      if (typeof serverModule.default === "function") {
        console.log("Starting server function...");
        serverModule.default();
      } else {
        console.error("Server module doesn't export a default function");
      }
    } else if (mode === "client") {
      console.log("Starting client mode...");
      const client = new ChatClient(serverUrl);
      client.start();
    }
  } catch (error) {
    console.error("Error in main:", error);
  }
}

main().catch((error) => console.error("Top level error:", error));
