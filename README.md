# ReleaseHub

Web application for visualizing CI/CD pipelines and managing GitHub releases — stateless, browser-based, no local clones required.

## 🚀 Quick Start

```bash
curl -sSL https://raw.githubusercontent.com/galiprandi/release-hub/main/scripts/install.sh | bash
rhub
```

## Requirements

- Node.js (v22+)
- GitHub CLI (`gh`) authenticated
- `kubectl` — *optional, for K8s features*

## Stack

React 19 + Vite + TypeScript · TanStack Router & Query v5 · Tailwind CSS 4 + shadcn/ui

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## License

MIT License
