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

    // Add logging middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
      next();
    });

    app.use(express.json());
    app.use(cors());

    console.log("Setting up Ollama chat...");
    const chat = new OllamaChat();

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port,
      });
    });

    // Get local IP address
    const getLocalIP = () => {
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] ?? []) {
          if (net.family === "IPv4" && !net.internal) {
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
        const conversation = await chat.chat(message, conversationId);
        res.json(conversation);
      } catch (error) {
        console.error("Error in chat:", error);
        res.status(500).json({ error: "Failed to process chat request" });
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
