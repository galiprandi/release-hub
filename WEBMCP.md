# WebMCP Implementation in ReleaseHub

ReleaseHub now supports **WebMCP (Web Model Context Protocol)**, allowing AI agents (like Gemini in Chrome) to interact directly with the application to perform tasks such as searching repositories, checking deployment status, and promoting releases.

## Available Tools for Agents

1.  **`search_repositories`**: Allows the agent to find repositories using the same logic as the in-app search.
2.  **`get_repo_details`**: Provides the agent with the latest commits, tags, and pipeline status for a specific repository.
3.  **`promote_to_production`**: Enables the agent to create a new release tag. *Note: This action should always be confirmed by the user through the agent's UI.*

## How to Test Locally

### 1. Enable WebMCP in Chrome
WebMCP is currently an experimental feature in Chrome. To enable it:
1.  Open Chrome and navigate to `chrome://flags/#enable-webmcp-testing`.
2.  Set the flag to **Enabled**.
3.  Restart Chrome.

### 2. Use the Model Context Tool Inspector
The easiest way to verify the implementation is using the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) extension.

1.  Install the extension.
2.  Open ReleaseHub in your browser (`npm run dev`).
3.  Open the Inspector extension.
4.  You should see `search_repositories`, `get_repo_details`, and `promote_to_production` listed in the registered tools.

### 3. Example Prompts
You can interact with the agent using natural language:

-   *"Busca repositorios que tengan que ver con 'backend'."*
-   *"¿Cuál es el último commit y el tag actual de 'mi-org/mi-repo'?"*
-   *"Crea un nuevo release v1.2.0 para 'mi-org/mi-repo' con el mensaje 'Fixes minor bugs'."*

## Implementation Details
The logic is encapsulated in the `useWebMCP` hook (`src/hooks/useWebMCP.ts`), which is initialized in the `RootLayout` (`src/routes/__root.tsx`). It uses the **WebMCP Imperative API** via `document.modelContext`.

For security, the `promote_to_production` tool requires the agent to provide all necessary parameters, and it is recommended that the AI client implement a "Human-in-the-loop" confirmation before executing this destructive action.
