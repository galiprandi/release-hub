import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIChatModal } from "./AIChatModal";

// Mock the AI hook
vi.mock("@galiprandi/react-tools", () => ({
	useAIPrompt: vi.fn(() => ({
		data: "",
		status: "idle",
		prompt: vi.fn(),
		reset: vi.fn(),
		error: null,
		progress: 0,
		append: vi.fn(),
		contextUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
		contextWindow: 0,
	})),
}));

// Mock Streamdown
vi.mock("streamdown", () => ({
	Streamdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock BaseDialog to just render children if open
vi.mock("@/components/ui/BaseDialog", () => ({
	BaseDialog: ({ children, open, title, headerExtra }: { children: React.ReactNode; open: boolean; title: React.ReactNode; headerExtra: React.ReactNode }) => (
		open ? (
			<div data-testid="base-dialog">
				<div>{title}</div>
				<div>{headerExtra}</div>
				{children}
			</div>
		) : null
	),
}));

describe("AIChatModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('URL', {
			createObjectURL: vi.fn(() => 'mock-url'),
			revokeObjectURL: vi.fn(),
		});
	});

	it("renders correctly when open", () => {
		render(<AIChatModal isOpen={true} onClose={() => {}} />);

		expect(screen.getByText("Asistente AI")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Pregunta algo sobre ReleaseHub...")).toBeInTheDocument();

		// Use a more specific query for the profile label in the header
		const profiles = screen.getAllByText(/General/i);
		expect(profiles.length).toBeGreaterThan(0);
	});

	it("switches profiles and updates messages", async () => {
		const { useAIPrompt } = await import("@galiprandi/react-tools");
		vi.mocked(useAIPrompt).mockReturnValue({
			data: "",
			status: "idle",
			prompt: vi.fn(),
			reset: vi.fn(),
			error: null,
			progress: null,
			append: vi.fn(),
			contextUsage: 0,
			contextWindow: 0,
		});

		render(<AIChatModal isOpen={true} onClose={() => {}} />);

		const optimizerButtons = screen.getAllByText(/Optimizar Prompts/i);
		fireEvent.click(optimizerButtons[0]);

		expect(screen.getByText(/Cambiado a perfil: \*\*Optimizar Prompts\*\*/i)).toBeInTheDocument();
	});

	it("shows stop button during prompting and calls reset on click", async () => {
		const mockReset = vi.fn();
		const { useAIPrompt } = await import("@galiprandi/react-tools");
		vi.mocked(useAIPrompt).mockReturnValue({
			data: "Thinking...",
			status: "prompting",
			prompt: vi.fn(),
			reset: mockReset,
			error: null,
			progress: null,
			append: vi.fn(),
			contextUsage: 0,
			contextWindow: 0,
		});

		render(<AIChatModal isOpen={true} onClose={() => {}} />);

		const stopButton = screen.getByLabelText("Detener respuesta");
		expect(stopButton).toBeInTheDocument();

		fireEvent.click(stopButton);
		expect(mockReset).toHaveBeenCalled();
	});

	it("handles file selection and shows preview", async () => {
		render(<AIChatModal isOpen={true} onClose={() => {}} />);

		const file = new File(["hello"], "hello.png", { type: "image/png" });
		const fileInput = screen.getByLabelText("Adjuntar archivo").previousElementSibling as HTMLInputElement;

		fireEvent.change(fileInput, { target: { files: [file] } });

		expect(screen.getByText("hello.png")).toBeInTheDocument();
		expect(screen.getByAltText("Preview")).toBeInTheDocument();

		const removeButton = screen.getByLabelText("Cerrar previsualización");
		fireEvent.click(removeButton);

		expect(screen.queryByText("hello.png")).not.toBeInTheDocument();
	});

	it("calls prompt with multimodal signature when send button is clicked", async () => {
		const mockPrompt = vi.fn();
		const { useAIPrompt } = await import("@galiprandi/react-tools");
		vi.mocked(useAIPrompt).mockReturnValue({
			data: "",
			status: "idle",
			prompt: mockPrompt,
			reset: vi.fn(),
			error: null,
			progress: null,
			append: vi.fn(),
			contextUsage: 0,
			contextWindow: 0,
		});

		render(<AIChatModal isOpen={true} onClose={() => {}} />);
		const textarea = screen.getByPlaceholderText("Pregunta algo sobre ReleaseHub...");
		const sendButton = screen.getByLabelText("Enviar mensaje");

		fireEvent.change(textarea, { target: { value: "Test prompt" } });
		fireEvent.click(sendButton);

		expect(mockPrompt).toHaveBeenCalledWith([
			{ role: "user", content: "Test prompt" }
		]);
	});

	it("calls reset when clear button is clicked", async () => {
		const mockReset = vi.fn();
		const { useAIPrompt } = await import("@galiprandi/react-tools");
		vi.mocked(useAIPrompt).mockReturnValue({
			data: "",
			status: "idle",
			prompt: vi.fn(),
			reset: mockReset,
			error: null,
			progress: null,
			append: vi.fn(),
			contextUsage: 0,
			contextWindow: 0,
		});

		render(<AIChatModal isOpen={true} onClose={() => {}} />);
		const clearButton = screen.getByLabelText("Limpiar");

		fireEvent.click(clearButton);
		expect(mockReset).toHaveBeenCalled();
	});
});
