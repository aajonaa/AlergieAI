# AllergyAI 🌿

A modern, AI-powered allergist assistant built with Next.js, designed to help users manage allergies, understand pollen seasons, and navigate dietary concerns.

![AllergyAI](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)

## Features

- 🤖 **AI-Powered Chat** - Real-time streaming responses from your local LLM
- 💬 **Context-Aware** - Maintains conversation history for contextual responses
- 🔐 **Authentication** - Simple credential-based login system
- 💾 **Persistent History** - Chat history saved to localStorage
- 🎨 **Beautiful UI** - Modern, responsive design with shadcn/ui components
- 🐳 **Docker Ready** - Optimized for containerized deployment

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A running LLM API server (vLLM, Ollama, etc.) at `http://localhost:8000/v1`

### Installation

```bash
# Navigate to the project directory
cd allergy-ai

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials

- **Username:** `doctor`
- **Password:** `pollen123`

## Project Structure

```
allergy-ai/
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/  # NextAuth API routes
│   │   ├── chat/                     # Chat page
│   │   ├── login/                    # Login page
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home (redirects to /chat)
│   ├── components/
│   │   ├── chat/                     # Chat components
│   │   ├── providers/                # Context providers
│   │   └── ui/                       # shadcn/ui components
│   ├── lib/
│   │   └── utils.ts                  # Utility functions
│   ├── store/
│   │   └── chat-store.ts             # Zustand store
│   └── middleware.ts                 # Auth middleware
├── cypress/                          # E2E tests
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | GPU API server URL | `http://localhost:8000/v1` |
| `NEXTAUTH_URL` | App URL for NextAuth | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | JWT encryption secret | (required) |

### Tailwind Theme

The app uses a custom color scheme:

- **Primary (Green):** `#4CAF50` - Main actions, user messages
- **Secondary (Blue):** `#2196F3` - Links, secondary actions
- **Warning (Orange):** `#FF9800` - Alerts, warnings

## Testing

### Unit Tests (Jest)

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### E2E Tests (Cypress)

```bash
# Open Cypress UI
npm run cypress

# Run headless
npm run cypress:headless
```

**Note:** E2E tests mock the API, so no GPU server is required.

## Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t allergy-ai .

# Run the container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://host.docker.internal:8000/v1 \
  -e NEXTAUTH_SECRET=your-secret-key \
  allergy-ai
```

### Using Docker Compose

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Connecting to Host GPU API

When running in Docker, the container needs to access the GPU API running on your host machine:

| Platform | API URL |
|----------|---------|
| **Docker Desktop (Windows/Mac)** | `http://host.docker.internal:8000/v1` |
| **Linux (host network)** | `http://localhost:8000/v1` |
| **Linux (bridge network)** | `http://172.17.0.1:8000/v1` |

## API Integration

The app expects an OpenAI-compatible chat completions API:

```bash
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "default",
  "messages": [
    {"role": "system", "content": "You are an expert Allergist AI..."},
    {"role": "user", "content": "What causes hay fever?"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 1024
}
```

Compatible servers:
- [vLLM](https://github.com/vllm-project/vllm)
- [Ollama](https://ollama.ai/)
- [LocalAI](https://github.com/mudler/LocalAI)
- [text-generation-webui](https://github.com/oobabooga/text-generation-webui)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |
| `npm run cypress` | Open Cypress |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - feel free to use this project for your own purposes.

---

Built with 💚 for allergy sufferers everywhere.

