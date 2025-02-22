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
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("Error generating response:", error);
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
