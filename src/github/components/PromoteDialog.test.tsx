import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PromoteDialog } from "./PromoteDialog"

// Mock hooks
vi.mock("../hooks/useRepoPermission", () => ({
	useRepoPermission: () => ({
		data: { viewerPermission: 'ADMIN', permissions: { push: true } },
		isLoading: false
	})
}))

vi.mock("@/hooks/useDiscordChannel", () => ({
	useDiscordChannel: () => ({ webhookUrl: "https://discord.com/webhook" })
}))

vi.mock("@/hooks/useGitUser", () => ({
	useGitUser: () => ({ data: { name: "Test User" } })
}))

vi.mock("@/hooks/useGitCommits", () => ({
	useGitCommits: () => ({
		commits: [
			{ hash: "sha1", shortHash: "sha1", message: "Commit 1", date: "2024-01-01", author: "User" },
			{ hash: "sha2", shortHash: "sha2", message: "Commit 2", date: "2024-01-02", author: "User" }
		]
	})
}))

vi.mock("@/hooks/useGitTags", () => ({
	useGitTags: () => ({
		latestTag: { tag: "v1.0.0", commit: "sha2" }
	})
}))

vi.mock("@/hooks/useCommitSummary", () => ({
	useCommitSummary: () => ({
		generateCommitSummary: vi.fn(),
		isGenerating: false,
		summary: "AI Summary",
		isAvailable: true,
		getStatusMessage: "Ready"
	})
}))

vi.mock("@/api/exec", () => ({
	runCommand: vi.fn().mockResolvedValue({ stdout: "new-sha" })
}))

// Mock BaseDialog to avoid Radix UI issues in tests
vi.mock("@/components/ui/BaseDialog", () => ({
	BaseDialog: ({ children, open, title }: { children: React.ReactNode; open: boolean; title: React.ReactNode }) =>
		open ? (
			<div data-testid="base-dialog">
				<div>{title}</div>
				{children}
			</div>
		) : null
}))

describe("PromoteDialog", () => {
	let queryClient: QueryClient

	beforeEach(() => {
		vi.clearAllMocks()
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		})
	})

	const renderWithClient = (ui: React.ReactElement) => {
		return render(
			<QueryClientProvider client={queryClient}>
				{ui}
			</QueryClientProvider>
		)
	}

	it("should render trigger button", () => {
		renderWithClient(<PromoteDialog repo="org/repo" latestTag="v1.0.0" />)
		expect(screen.getByRole("button", { name: /promocionar/i })).toBeInTheDocument()
	})

	it("should open dialog when trigger is clicked", async () => {
		renderWithClient(<PromoteDialog repo="org/repo" latestTag="v1.0.0" />)
		fireEvent.click(screen.getByRole("button", { name: /promocionar/i }))
		expect(screen.getByTestId("base-dialog")).toBeInTheDocument()
		expect(screen.getByText(/Configurar Lanzamiento/i)).toBeInTheDocument()
	})

	it("should suggest next version correctly", async () => {
		renderWithClient(<PromoteDialog repo="org/repo" latestTag="v1.0.0" />)
		fireEvent.click(screen.getByRole("button", { name: /promocionar/i }))

		await waitFor(() => {
			const input = screen.getByLabelText(/nombre del tag/i) as HTMLInputElement
			expect(input.value).toBe("v1.0.1")
		})
	})

	it("should toggle commits list with accessibility attributes", () => {
		renderWithClient(<PromoteDialog repo="org/repo" latestTag="v1.0.0" />)
		fireEvent.click(screen.getByRole("button", { name: /promocionar/i }))

		const toggleButton = screen.getByRole("button", { name: /1 commit a promocionar/i })
		expect(toggleButton).toHaveAttribute("aria-expanded", "false")
		expect(toggleButton).toHaveAttribute("aria-controls", "pending-commits-list")

		fireEvent.click(toggleButton)
		expect(toggleButton).toHaveAttribute("aria-expanded", "true")
		expect(screen.getByTestId("base-dialog")).toContainElement(screen.getByText(/Cambios desde v1.0.0/i))
	})

	it("should have focus rings on interactive elements", () => {
		renderWithClient(<PromoteDialog repo="org/repo" latestTag="v1.0.0" />)
		fireEvent.click(screen.getByRole("button", { name: /promocionar/i }))

		const input = screen.getByLabelText(/nombre del tag/i)
		expect(input).toHaveClass("focus-visible:ring-2", "focus-visible:ring-primary")

		const textarea = screen.getByLabelText(/descripción/i)
		expect(textarea).toHaveClass("focus-visible:ring-2", "focus-visible:ring-primary")
	})
})
