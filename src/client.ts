import readline from "readline";
import { Message, Conversation } from "./types.js";

export class ChatClient {
  private servers: Map<string, string>;
  private rl: readline.Interface;
  private currentConversationId?: string;
  private currentServer: string;
  private isAutoChatting: boolean = false;

  constructor(serverUrl: string) {
    this.servers = new Map();
    this.addServer("default", serverUrl);
    this.currentServer = "default";

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private addServer(name: string, url: string) {
    this.servers.set(name, url);
  }

  private async fetchConversations(): Promise<string[]> {
    const response = await fetch(
      `${this.servers.get(this.currentServer)}/conversations`
    );
    return response.json();
  }

  private async loadConversation(id: string): Promise<Conversation> {
    const response = await fetch(
      `${this.servers.get(this.currentServer)}/conversation/${id}`
    );
    return response.json();
  }

  private async sendMessage(message: string): Promise<Conversation> {
    const response = await fetch(
      `${this.servers.get(this.currentServer)}/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationId: this.currentConversationId,
        }),
      }
    );
    return response.json();
  }

  private async checkServerHealth(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async startAutoChat(
    initialPrompt: string = "Let's have an interesting discussion about artificial intelligence and consciousness."
  ) {
    console.log("\nStarting auto-chat mode...");
    console.log("Initial prompt:", initialPrompt);
    console.log("Press Ctrl+C to stop the conversation\n");

    this.isAutoChatting = true;
    let currentPrompt = initialPrompt;
    let messageCount = 0;
    const maxMessages = 20; // Prevent infinite conversations

    try {
      while (this.isAutoChatting && messageCount < maxMessages) {
        // Add a delay between messages to make it more readable
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log(`\nSending to ${this.currentServer}...`);
        try {
          // Send message to current server
          const response1 = await this.sendMessage(currentPrompt);
          if (!response1?.messages?.length) {
            console.error("Invalid response from server:", response1);
            break;
          }
          const reply1 =
            response1.messages[response1.messages.length - 1].content;
          console.log(`\n${this.currentServer} says:`, reply1);

          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Switch servers
          const otherServer =
            this.currentServer === "default" ? "remote" : "default";
          const otherUrl = this.servers.get(otherServer);
          if (!otherUrl) {
            console.error(`Cannot find URL for server: ${otherServer}`);
            break;
          }

          // Check if other server is healthy before switching
          const isHealthy = await this.checkServerHealth(otherUrl);
          if (!isHealthy) {
            console.error(`Server ${otherServer} is not responding`);
            break;
          }

          this.currentServer = otherServer;
          console.log(`\nSending to ${this.currentServer}...`);

          // Send the reply to the other server
          const response2 = await this.sendMessage(reply1);
          if (!response2?.messages?.length) {
            console.error("Invalid response from server:", response2);
            break;
          }
          const reply2 =
            response2.messages[response2.messages.length - 1].content;
          console.log(`\n${this.currentServer} says:`, reply2);

          // Update the prompt for the next iteration
          currentPrompt = reply2;
          messageCount++;
        } catch (error) {
          console.error(`Error during message exchange:`, error);
          break;
        }
      }
    } catch (error) {
      console.error("Error in auto-chat:", error);
    }

    this.isAutoChatting = false;
    console.log("\nAuto-chat session ended.");
    this.askQuestion();
  }

  async start() {
    console.log("Ollama Chat Client");
    console.log("Commands:");
    console.log('  "exit" - Quit the application');
    console.log('  "new" - Start a new conversation');
    console.log('  "list" - Show all available conversations');
    console.log('  "load <id>" - Load a specific conversation');
    console.log('  "connect <name> <url>" - Add a new server');
    console.log('  "switch <name>" - Switch to a different server');
    console.log('  "servers" - List all connected servers');
    console.log('  "auto-chat [prompt]" - Start auto-chat between servers');

    this.askQuestion();
  }

  private askQuestion = () => {
    const serverName = this.currentServer;
    const prefix = this.currentConversationId
      ? `[${serverName}:${this.currentConversationId}] `
      : `[${serverName}] `;

    this.rl.question(`${prefix}You: `, async (input) => {
      if (input.toLowerCase() === "exit") {
        this.rl.close();
        return;
      }

      if (input.toLowerCase().startsWith("auto-chat")) {
        const prompt = input.slice(10).trim() || undefined;
        if (this.servers.size < 2) {
          console.log(
            "Please connect to a remote server first using 'connect remote <url>'"
          );
          this.askQuestion();
          return;
        }

        // Verify both servers are healthy
        const defaultUrl = this.servers.get("default");
        const remoteUrl = this.servers.get("remote");

        if (!defaultUrl || !remoteUrl) {
          console.log("Both default and remote servers must be connected");
          this.askQuestion();
          return;
        }

        const [defaultHealth, remoteHealth] = await Promise.all([
          this.checkServerHealth(defaultUrl),
          this.checkServerHealth(remoteUrl),
        ]);

        if (!defaultHealth || !remoteHealth) {
          console.log("Both servers must be online to start auto-chat");
          console.log(
            `Default server: ${defaultHealth ? "online" : "offline"}`
          );
          console.log(`Remote server: ${remoteHealth ? "online" : "offline"}`);
          this.askQuestion();
          return;
        }

        await this.startAutoChat(prompt);
        return;
      }

      if (input.toLowerCase() === "new") {
        this.currentConversationId = undefined;
        console.log("Starting new conversation");
        this.askQuestion();
        return;
      }

      if (input.toLowerCase() === "servers") {
        console.log("Connected servers:");
        for (const [name, url] of this.servers.entries()) {
          const isHealthy = await this.checkServerHealth(url);
          console.log(
            `  ${name}: ${url} (${isHealthy ? "online" : "offline"})`
          );
        }
        this.askQuestion();
        return;
      }

      if (input.toLowerCase().startsWith("connect ")) {
        const [, name, url] = input.split(" ");
        if (!name || !url) {
          console.log("Usage: connect <name> <url>");
        } else {
          const isHealthy = await this.checkServerHealth(url);
          if (isHealthy) {
            this.addServer(name, url);
            console.log(`Connected to server ${name} at ${url}`);
          } else {
            console.log(`Could not connect to server at ${url}`);
          }
        }
        this.askQuestion();
        return;
      }

      if (input.toLowerCase().startsWith("switch ")) {
        const [, name] = input.split(" ");
        if (!name) {
          console.log("Usage: switch <name>");
        } else if (!this.servers.has(name)) {
          console.log(`Unknown server: ${name}`);
        } else {
          const url = this.servers.get(name)!;
          const isHealthy = await this.checkServerHealth(url);
          if (isHealthy) {
            this.currentServer = name;
            this.currentConversationId = undefined;
            console.log(`Switched to server: ${name}`);
          } else {
            console.log(`Server ${name} is not responding`);
          }
        }
        this.askQuestion();
        return;
      }

      if (input.toLowerCase() === "list") {
        try {
          const conversations = await this.fetchConversations();
          console.log("Available conversations:", conversations);
        } catch (error) {
          console.error("Error fetching conversations:", error);
        }
        this.askQuestion();
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
        this.askQuestion();
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

      this.askQuestion();
    });
  };
}
