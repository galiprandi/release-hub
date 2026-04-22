# ReleaseHub

Web application for visualizing CI/CD pipelines and managing GitHub releases.

## Features

- Real-time pipeline status visualization
- Integration with CI/CD API
- Modern UI with Tailwind CSS and shadcn/ui components
- Routing with TanStack Router
- Server state management with TanStack Query

## Tech Stack

- **Framework:** React 19 + Vite (Rolldown)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Router:** TanStack Router
- **Data Fetching:** TanStack Query + Axios
- **Icons:** Lucide React

## Requirements

- Node.js (version specified in `.nvmrc`)
- npm

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── api/           # API client and types
├── hooks/         # Custom React hooks
├── lib/           # Utilities
├── providers/     # React context providers
└── routes/        # Application routes
```

## License

MIT License
