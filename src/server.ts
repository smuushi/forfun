import express from "express";
import cors from "cors";
import OllamaChat from "./cli";
import { networkInterfaces } from "os";

console.log("Server module loaded");

function startServer() {
  console.log("Starting server function...");
  const app = express();
  const port = 3000;

  app.use(express.json());
  app.use(cors());

  console.log("Setting up Ollama chat...");
  const chat = new OllamaChat();

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
  console.log("Starting server on port", port);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://${localIP}:${port}`);
  });
}

console.log("Exporting server function");
export default startServer;
