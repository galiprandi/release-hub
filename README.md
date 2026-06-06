# 🚀 ReleaseHub

Stateless platform for CI/CD visualization and GitHub management. **100% local and secure**.

## ✨ Key Features
- **🤖 AI Assistant**: Local Gemini Nano, multimodal (text/image/audio), technical profiles.
- **🚀 Stateless**: Operations via GitHub API/CLI. No local cloning required.
- **📊 Unified Dashboards**: GitHub, Kubernetes, Docker, and Service Health monitoring.
- **📋 Fetcher**: Clipboard cURL detection and intelligent API testing.
- **🎨 Industrial Resonance UI**: High-density interface for elite developers.

## 💻 Requirements
- **Node.js** (v22+)
- **GitHub CLI (`gh`)** authenticated.
- Optional: **Docker**, **`kubectl`**.

## ⚡ Quick Start
```bash
curl -sSL https://raw.githubusercontent.com/galiprandi/release-hub/main/scripts/install.sh | bash
rhub
```

## 🛠️ Development
```bash
npm install
npm run dev
```

## 🔒 Security
- **Hardened Shell**: Direct process execution (`shell: false`), no injection vectors.
- **Dynamic Auth**: Uses active `gh auth token`, no persistent secrets.
