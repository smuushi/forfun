import express from "express";
import cors from "cors";
import { OllamaChat } from "./cli.js";
import { networkInterfaces } from "os";

console.log("Server module loaded");

export async function startServer() {
  try {
    console.log("Starting server function...");
    const app = express();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const model = process.env.MODEL || "deepseek-r1:8b";

    console.log(`Using model: ${model}`);

    // Add logging middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
      next();
    });

    app.use(express.json());
    app.use(cors());

    console.log("Setting up Ollama chat...");
    const chat = new OllamaChat(model);

    // Health check endpoint with model info
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port,
        model,
      });
    });

    // Get local IP address
    const getLocalIP = () => {
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        // Skip WSL and virtual interfaces
        if (name.includes("WSL") || name.includes("vEthernet")) {
          continue;
        }

        for (const net of nets[name] ?? []) {
          // Look for IPv4 addresses that start with 192.168
          if (
            net.family === "IPv4" &&
            !net.internal &&
            net.address.startsWith("192.168")
          ) {
            return net.address;
          }
        }
      }
      return "localhost";
    };

    // Chat endpoint
    app.post("/chat", async (req, res) => {
      try {
        const { message, conversationId } = req.body;

        // Check if Ollama is running
        try {
          const ollamaHealth = await fetch("http://localhost:11434/api/tags");
          if (!ollamaHealth.ok) {
            throw new Error("Ollama is not responding");
          }
        } catch (error) {
          console.error("Ollama service error:", error);
          res.status(503).json({
            error: "Ollama service is not available",
            details: error instanceof Error ? error.message : "Unknown error",
          });
          return;
        }

        const conversation = await chat.chat(message, conversationId);
        res.json(conversation);
      } catch (error) {
        console.error("Error in chat:", error);
        res.status(500).json({
          error: "Failed to process chat request",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Get conversation history
    app.get("/conversations", (req, res) => {
      try {
        const conversations = chat.listConversations();
        res.json(conversations);
      } catch (error) {
        console.error("Error listing conversations:", error);
        res.status(500).json({ error: "Failed to list conversations" });
      }
    });

    // Get specific conversation
    app.get("/conversation/:id", (req, res) => {
      try {
        const conversation = chat.loadConversation(req.params.id);
        res.json(conversation);
      } catch (error) {
        console.error("Error loading conversation:", error);
        res.status(500).json({ error: "Failed to load conversation" });
      }
    });

    const localIP = getLocalIP();
    console.log(`Starting server on port ${port}`);

    return new Promise<void>((resolve) => {
      app.listen(port, "0.0.0.0", () => {
        console.log(`Server running at http://${localIP}:${port}`);
        console.log(
          `Health check available at http://${localIP}:${port}/health`
        );
        resolve();
      });
    });
  } catch (error) {
    console.error("Error starting server:", error);
    throw error;
  }
}

console.log("Exporting server function");
