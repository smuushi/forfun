import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import path from "path";
import { Message, Conversation } from "./types.js";

export class OllamaChat {
  private historyDir: string;
  private model: string;

  constructor(model = "deepseek-r1:8b") {
    this.model = model;
    this.historyDir = path.join(process.cwd(), "history");

    if (!existsSync(this.historyDir)) {
      mkdirSync(this.historyDir);
    }
  }

  private async generateResponse(prompt: string): Promise<string> {
    try {
      // First check if Ollama is running
      const healthCheck = await fetch("http://localhost:11434/api/tags");
      if (!healthCheck.ok) {
        throw new Error("Ollama service is not running");
      }

      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false, // Add this to get a single JSON response instead of stream
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`
        );
      }

      const text = await response.text(); // Get raw text first
      try {
        const data = JSON.parse(text); // Then parse it
        return data.response;
      } catch (parseError) {
        throw new Error(
          `Failed to parse Ollama response: ${text.slice(0, 100)}...`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate response: ${error.message}`);
      }
      throw error;
    }
  }

  async chat(message: string, conversationId?: string): Promise<Conversation> {
    let conversation: Conversation;

    if (conversationId && existsSync(this.getHistoryPath(conversationId))) {
      conversation = this.loadConversation(conversationId);
    } else {
      conversation = {
        id: new Date().getTime().toString(),
        messages: [],
        metadata: {
          model: this.model,
          created: new Date().toISOString(),
        },
      };
    }

    conversation.messages.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    const response = await this.generateResponse(message);

    conversation.messages.push({
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
    });

    this.saveConversation(conversation);

    return conversation;
  }

  private getHistoryPath(id: string): string {
    return path.join(this.historyDir, `${id}.json`);
  }

  private saveConversation(conversation: Conversation): void {
    const filePath = this.getHistoryPath(conversation.id);
    writeFileSync(filePath, JSON.stringify(conversation, null, 2));
  }

  loadConversation(id: string): Conversation {
    const filePath = this.getHistoryPath(id);
    const data = readFileSync(filePath, "utf8");
    return JSON.parse(data);
  }

  listConversations(): string[] {
    return existsSync(this.historyDir)
      ? readdirSync(this.historyDir)
          .filter((file: string) => file.endsWith(".json"))
          .map((file: string) => file.replace(".json", ""))
      : [];
  }
}
