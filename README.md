# ReleaseHub

Web application for visualizing CI/CD pipelines and managing GitHub releases.

## 🚀 Quick Install & Launch

Run the following command to install or update ReleaseHub and launch it immediately:

```bash
curl -sSL https://raw.githubusercontent.com/galiprandi/release-hub/main/scripts/install.sh | bash
```

Once installed, you can launch the app anytime by simply typing:

```bash
rhub
```


## Features

- Real-time pipeline status visualization
- Integration with CI/CD API
- Modern UI with Tailwind CSS and shadcn/ui components
- Routing with TanStack Router
- Server state management with TanStack Query

## Release Strategy

ReleaseHub follows a **Trunk-Based Development** model with **Tag-based promotion**:

- **Staging**: Automatically deploys the latest commits from the `main` branch.
- **Production**: Deploys are triggered manually by creating a **GitHub Tag**, promoting a validated version from Staging to Production.

The app leverages the **GitHub CLI (`gh`)** to perform these operations remotely, ensuring it remains stateless and can manage multiple repositories without local clones.

## Tech Stack

- **Framework:** React 19 + Vite (Rolldown)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Router:** TanStack Router
- **Data Fetching:** TanStack Query + Axios
- **Icons:** Lucide React

## Requirements

- Node.js (v18+)
- npm
- GitHub CLI (`gh`) authenticated

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
## Available Scripts

| Command | Description |
|---------|-------------|
| `rhub` | Launch the app (after installation) |
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
