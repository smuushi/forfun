# Ollama Network Chat

A TypeScript-based CLI application that allows two computers on the same network to chat using Ollama's local LLM.

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Ollama installed on the server computer ([Ollama installation guide](https://ollama.ai/download))
- Either deepseek-r1:8b or deepseek-r1:14b model pulled on the server computer

## Setup

1. Clone this repository on both computers:

```bash
git clone <your-repo-url>
cd ollama-chat
```

2. Install dependencies on both computers:

```bash
pnpm install
```

3. On the server computer (the one with Ollama installed):

```bash
# Pull the models if you haven't already
ollama pull deepseek-r1:8b
# or
ollama pull deepseek-r1:14b

# Start the server with 8b model (default)
pnpm server

# Or start with 14b model
MODEL=deepseek-r1:14b pnpm server

# You can also specify a custom port
PORT=3001 MODEL=deepseek-r1:14b pnpm server
```

The server will display its IP address and model being used, e.g., `Server running at http://192.168.1.100:3000 using model: deepseek-r1:8b`

4. On the client computer:

```bash
# Replace SERVER_IP with the IP address shown in the server output
pnpm client http://SERVER_IP:3000
```

## Usage

### Server Computer

- The server computer runs Ollama and manages chat history
- All conversations are stored in the `history` directory
- The server must be running for clients to connect
- You can specify which model to use with the MODEL environment variable

### Client Computer

Available commands:

- Type a message and press Enter to chat
- `new` - Start a new conversation
- `list` - Show all available conversations
- `load <id>` - Load and view a specific conversation
- `servers` - List connected servers and their models
- `connect <name> <url>` - Connect to another server
- `switch <name>` - Switch between connected servers
- `auto-chat [prompt]` - Start auto-chat between servers
- `exit` - Quit the application

### Example Session

```bash
# On Server Computer
$ MODEL=deepseek-r1:14b pnpm server
Server running at http://192.168.1.100:3000 using model: deepseek-r1:14b

# On Client Computer
$ pnpm client http://192.168.1.100:3000
Ollama Chat Client
Server at http://192.168.1.100:3000 is using model: deepseek-r1:14b
You: Hello!
Assistant: Hi! How can I help you today?
```

## Troubleshooting

1. If the client can't connect:

   - Ensure both computers are on the same network
   - Check if the server IP is correct
   - Verify port 3000 is not blocked by firewall

2. If Ollama isn't responding:

   - Check if Ollama is running on the server computer
   - Verify the model is properly installed (`ollama list`)
   - Make sure you're using a model that's installed (`MODEL=deepseek-r1:8b` or `MODEL=deepseek-r1:14b`)

3. For connection errors:
   - Try pinging the server IP from the client
   - Check if the server shows in the console that it received the request
