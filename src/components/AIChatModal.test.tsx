import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AIChatModal } from "./AIChatModal";

// Mock the AI hook
vi.mock("@galiprandi/react-tools", () => ({
	useAIPrompt: vi.fn(() => ({
		data: "",
		status: "idle",
		prompt: vi.fn(),
		reset: vi.fn(),
		error: null,
	})),
}));

// Mock Streamdown
vi.mock("streamdown", () => ({
	Streamdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock BaseDialog to just render children if open
vi.mock("@/components/ui/BaseDialog", () => ({
	BaseDialog: ({ children, open, title, headerExtra }: any) => (
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
	it("renders correctly when open", () => {
		render(<AIChatModal isOpen={true} onClose={() => {}} />);

		expect(screen.getByText("Asistente AI")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Pregunta algo sobre ReleaseHub...")).toBeInTheDocument();
		expect(screen.getByText(/¡Hola! Soy tu asistente de ReleaseHub/)).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		const { queryByTestId } = render(<AIChatModal isOpen={false} onClose={() => {}} />);
		expect(queryByTestId("base-dialog")).not.toBeInTheDocument();
	});

	it("updates input value on change", () => {
		render(<AIChatModal isOpen={true} onClose={() => {}} />);
		const textarea = screen.getByPlaceholderText("Pregunta algo sobre ReleaseHub...") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "Hola IA" } });
		expect(textarea.value).toBe("Hola IA");
	});

	it("calls prompt when send button is clicked", async () => {
		const mockPrompt = vi.fn();
		const { useAIPrompt } = await import("@galiprandi/react-tools");
		(useAIPrompt as any).mockReturnValue({
			data: "",
			status: "idle",
			prompt: mockPrompt,
			reset: vi.fn(),
			error: null,
		});

		render(<AIChatModal isOpen={true} onClose={() => {}} />);
		const textarea = screen.getByPlaceholderText("Pregunta algo sobre ReleaseHub...");
		const sendButton = screen.getByRole("button", { name: "" }); // Send button has no text but icon

		fireEvent.change(textarea, { target: { value: "Test prompt" } });
		fireEvent.click(sendButton);

		expect(mockPrompt).toHaveBeenCalledWith("Test prompt");
		expect((textarea as HTMLTextAreaElement).value).toBe(""); // Clears after send
	});

	it("calls reset when clear button is clicked", async () => {
		const mockReset = vi.fn();
		const { useAIPrompt } = await import("@galiprandi/react-tools");
		(useAIPrompt as any).mockReturnValue({
			data: "",
			status: "idle",
			prompt: vi.fn(),
			reset: mockReset,
			error: null,
		});

		render(<AIChatModal isOpen={true} onClose={() => {}} />);
		const clearButton = screen.getByRole("button", { name: /Limpiar/i });

		fireEvent.click(clearButton);
		expect(mockReset).toHaveBeenCalled();
	});
});
