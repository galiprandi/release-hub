# 🚀 ReleaseHub

**ReleaseHub** is a sophisticated, stateless web platform designed for real-time CI/CD pipeline visualization, GitHub release management, local infrastructure monitoring, and intelligent development assistance.

The application runs **100% locally and securely**, acting as a unified control center that leverages your own credentials, team tools, and local utilities (`gh`, `kubectl`, `docker`), ensuring your data never leaves your machine and your local repositories remain fully protected from accidental clones or modifications.

---

## ✨ Key Features

*   **🤖 AI Assistant**: Your local development copilot, integrated directly into the interface. Features conversational chat powered by local Gemini Nano, multimodal support (intelligent processing of text, images, and audio), specialized technical profiles (General, Prompt Optimizer, DevOps Specialist), and real-time streaming responses rendered in rich markdown.
*   **🚀 Stateless Operations Without Cloning**: Interact with your repositories, manage tags, and publish releases using exclusively the official GitHub API. No local code cloning required, protecting your active branches and avoiding conflicts in your daily working tree.
*   **📊 GitHub Dashboard**: Unified repository management with favorites, custom project collections, production/staging commit tracking, pending promotion indicators, and integrated pipeline status monitoring.
*   **🩺 Omnipresent Health Monitoring**: Real-time service health status integrated directly into the main dashboard with semantic visual indicators (OK/Error/Warning) that link instantly to the error log to accelerate incident resolution.
*   **🐳 Docker Management**: View, start, stop, and access real-time logs of your local Docker containers directly from the browser, using your active configurations and contexts.
*   **☸️ Kubernetes Control**: Monitor deployments with favorites support, namespace filtering, and real-time log access for your Kubernetes workloads using your local `kubectl` context.
*   **📋 Fetcher & Magic Clipboard**: Ultra-fast cURL request import detected from your clipboard when you focus the app. Instantly opens an intelligent query modal with autocomplete and semantic HTTP method mapping to simplify API testing.
*   **🗂️ Projects & Collections**: Group your repositories into customizable collections with a high-density tactile filter bar, ideal for developers managing dozens of microservices daily.
*   **🎨 Industrial Resonance UI**: Elegant, high-density interface designed for elite developers with semantic color tokens, focus rings, and consistent component patterns across all modules.

---

## 💻 System Requirements

For **ReleaseHub** to connect with your local team utilities, ensure you have installed:

- **Node.js** (v22 or higher)
- **GitHub CLI (`gh`)** authenticated in your terminal
- **Docker** — *optional, for the containers tab*
- **`kubectl`** — *optional, for Kubernetes features*

---

## ⚡ Quick Install

Try it in under 10 seconds! Run the following command in your terminal to install and launch the local server:

```bash
curl -sSL https://raw.githubusercontent.com/galiprandi/release-hub/main/scripts/install.sh | bash
rhub
```

The application will automatically open in your default browser so you can start managing your repositories instantly.

---

## 🛠️ Local Development

If you prefer to clone the project to collaborate or experiment with it locally, you can use the following tools:

### Environment Setup

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Run the local development server (with Hot-Reload):
   ```bash
   npm run dev
   ```

### Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start local development server at http://localhost:5173 |
| `npm run build` | Build and optimize for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to ensure code quality and style |

---

## 🔒 Elite Security

ReleaseHub is built with strict protection standards:
- **Shell Injection Hardening**: Local CLI command execution (`kubectl`, `docker`) uses the native backend via typed argument passing and direct processes without shell (`shell: false`), neutralizing any possibility of malicious injections.
- **Protected Remote Access**: No static persistent tokens in the cloud. Dynamically consumes your active GitHub CLI session (`gh auth token`), keeping your keys and permissions entirely under your direct control.

---

Built with ❤️ to maximize productivity and technical visibility for elite development teams. Try it and take your deployment workflow to the next level!
