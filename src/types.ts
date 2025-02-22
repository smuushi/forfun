export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  metadata: {
    model: string;
    created: string;
    title?: string;
  };
}
