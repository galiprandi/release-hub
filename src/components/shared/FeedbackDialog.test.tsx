import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FeedbackDialog } from "./FeedbackDialog"

// Mock hooks and components
const mockSummarize = vi.fn().mockResolvedValue("AI Result")
const mockResetAI = vi.fn()

vi.mock("@galiprandi/react-tools", () => ({
	useAISummarize: () => ({
		data: "AI Result",
		status: "success",
		error: null,
		summarize: mockSummarize,
		reset: mockResetAI,
	}),
}))

vi.mock("@/hooks/useAIErrorProcessor", () => ({
	useAIErrorProcessor: () => ({
		processError: vi.fn().mockResolvedValue("Processed Error"),
		isProcessing: false,
	}),
}))

vi.mock("@/api/exec", () => ({
	runCommand: vi.fn().mockResolvedValue({ stdout: "https://github.com/issue/1" }),
}))

interface BaseDialogMockProps {
	children: React.ReactNode
	open: boolean
	title: React.ReactNode
}

// Mock BaseDialog to avoid Radix UI issues in tests
vi.mock("@/components/ui/BaseDialog", () => ({
	BaseDialog: ({ children, open, title }: BaseDialogMockProps) =>
		open ? (
			<div data-testid="base-dialog">
				<div>{title}</div>
				{children}
			</div>
		) : null
}))

describe("FeedbackDialog", () => {
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
		renderWithClient(<FeedbackDialog />)
		expect(screen.getByRole("button", { name: /feedback/i })).toBeInTheDocument()
	})

	it("should open dialog when trigger is clicked", () => {
		renderWithClient(<FeedbackDialog />)
		const trigger = screen.getByRole("button", { name: /feedback/i })
		fireEvent.click(trigger)
		expect(screen.getByTestId("base-dialog")).toBeInTheDocument()
		expect(screen.getByText("Describí tu feedback")).toBeInTheDocument()
	})

	it("should allow entering description and moving to next step", async () => {
		renderWithClient(<FeedbackDialog />)
		fireEvent.click(screen.getByRole("button", { name: /feedback/i }))

		const textarea = screen.getByLabelText(/descripción/i)
		fireEvent.change(textarea, { target: { value: "This is a test feedback" } })

		const nextButton = screen.getByRole("button", { name: /siguiente/i })
		fireEvent.click(nextButton)

		await waitFor(() => {
			expect(screen.getByText("Revisá tu feedback")).toBeInTheDocument()
		})
	})

	it("should show stepper with proper accessibility", () => {
		renderWithClient(<FeedbackDialog />)
		fireEvent.click(screen.getByRole("button", { name: /feedback/i }))

		const stepper = screen.getByRole("stepper")
		expect(stepper).toHaveAttribute("aria-label", "Progreso del feedback")

		const step1 = screen.getByRole("button", { name: /paso 1/i })
		expect(step1).toHaveAttribute("aria-current", "step")
	})

	it("should have focus rings on inputs for accessibility", () => {
		renderWithClient(<FeedbackDialog />)
		fireEvent.click(screen.getByRole("button", { name: /feedback/i }))

		const textarea = screen.getByLabelText(/descripción/i)
		// Updated to match Industrial Resonance V2 focus standard with 20% opacity
		expect(textarea).toHaveClass("focus:ring-2", "focus:ring-primary/30")
	})
})
