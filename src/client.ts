import readline from "readline";
import { Message, Conversation } from "./types";

class ChatClient {
  private serverUrl: string;
  private rl: readline.Interface;
  private currentConversationId?: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async fetchConversations(): Promise<string[]> {
    const response = await fetch(`${this.serverUrl}/conversations`);
    return response.json();
  }

  private async loadConversation(id: string): Promise<Conversation> {
    const response = await fetch(`${this.serverUrl}/conversation/${id}`);
    return response.json();
  }

  private async sendMessage(message: string): Promise<Conversation> {
    const response = await fetch(`${this.serverUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversationId: this.currentConversationId,
      }),
    });
    return response.json();
  }

  async start() {
    console.log("Ollama Chat Client");
    console.log(
      'Type "exit" to quit, "new" for new conversation, "load <id>" to load conversation, "list" to see all conversations'
    );

    const askQuestion = () => {
      const prefix = this.currentConversationId
        ? `[${this.currentConversationId}] `
        : "";
      this.rl.question(`${prefix}You: `, async (input) => {
        if (input.toLowerCase() === "exit") {
          this.rl.close();
          return;
        }

        if (input.toLowerCase() === "new") {
          this.currentConversationId = undefined;
          console.log("Starting new conversation");
          askQuestion();
          return;
        }

        if (input.toLowerCase() === "list") {
          try {
            const conversations = await this.fetchConversations();
            console.log("Available conversations:", conversations);
          } catch (error) {
            console.error("Error fetching conversations:", error);
          }
          askQuestion();
          return;
        }

        if (input.toLowerCase().startsWith("load ")) {
          const id = input.split(" ")[1];
          try {
            const conversation = await this.loadConversation(id);
            this.currentConversationId = id;
            console.log(`Loaded conversation ${id}`);
            console.log("Chat history:");
            conversation.messages.forEach((msg: Message) => {
              console.log(`${msg.role}: ${msg.content}`);
            });
          } catch (error) {
            console.error(`Failed to load conversation ${id}`);
          }
          askQuestion();
          return;
        }

        try {
          const conversation = await this.sendMessage(input);
          this.currentConversationId = conversation.id;
          console.log(
            "Assistant:",
            conversation.messages[conversation.messages.length - 1].content
          );
        } catch (error) {
          console.error("Error:", error);
        }

        askQuestion();
      });
    };

    askQuestion();
  }
}

export default ChatClient;
