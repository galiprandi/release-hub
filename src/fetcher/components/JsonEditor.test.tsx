import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { JsonEditor } from "./JsonEditor";

describe("JsonEditor", () => {
	const mockOnChange = vi.fn();
	const mockOnSearchChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock clipboard
		Object.defineProperty(navigator, "clipboard", {
			value: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
			configurable: true,
		});
		vi.useFakeTimers();
	});

	it("renders JsonEditor in editable mode", () => {
		render(
			<JsonEditor
				value='{"name": "test"}'
				onChange={mockOnChange}
				placeholder='{"key": "value"}'
			/>
		);

		expect(screen.getByText("JSON")).toBeInTheDocument();
		const textarea = screen.getByPlaceholderText('{"key": "value"}');
		expect(textarea).toBeInTheDocument();
		expect(textarea).toHaveValue('{"name": "test"}');
	});

	it("renders JsonEditor in readOnly mode", () => {
		render(
			<JsonEditor
				value='{"name": "test"}'
				onChange={mockOnChange}
				readOnly={true}
			/>
		);

		// In readOnly mode, it renders a pre element with formatted JSON
		const pre = screen.getByText(/"name": "test"/);
		expect(pre).toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("calls onChange when text is updated", () => {
		render(
			<JsonEditor
				value='{"name": "test"}'
				onChange={mockOnChange}
			/>
		);

		const textarea = screen.getByRole("textbox");
		fireEvent.change(textarea, { target: { value: '{"name": "new"}' } });
		expect(mockOnChange).toHaveBeenCalledWith('{"name": "new"}');
	});

	it("copies text to clipboard when copy button is clicked", async () => {
		render(
			<JsonEditor
				value='{"name": "test"}'
				onChange={mockOnChange}
			/>
		);

		const copyButton = screen.getByRole("button", { name: "Copiar código JSON al portapapeles" });
		expect(copyButton).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(copyButton);
		});

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{"name": "test"}');
	});

	it("toggles search input when search button is clicked", () => {
		render(
			<JsonEditor
				value='{"name": "test"}'
				onChange={mockOnChange}
				searchQuery=""
				onSearchChange={mockOnSearchChange}
			/>
		);

		// Initially search input is not visible
		expect(screen.queryByPlaceholderText("Buscar...")).not.toBeInTheDocument();

		const searchBtn = screen.getByRole("button", { name: "Buscar en JSON" });
		fireEvent.click(searchBtn);

		// Search input should now be visible and focused
		const searchInput = screen.getByPlaceholderText("Buscar...");
		expect(searchInput).toBeInTheDocument();

		fireEvent.change(searchInput, { target: { value: "test" } });
		expect(mockOnSearchChange).toHaveBeenCalledWith("test");

		// Close search input
		const closeSearchBtn = screen.getByRole("button", { name: "Cerrar búsqueda de JSON" });
		fireEvent.click(closeSearchBtn);

		expect(screen.queryByPlaceholderText("Buscar...")).not.toBeInTheDocument();
		expect(mockOnSearchChange).toHaveBeenCalledWith("");
	});

	it("formats JSON on format button click", () => {
		render(
			<JsonEditor
				value='{"name":"test"}'
				onChange={mockOnChange}
			/>
		);

		const formatBtn = screen.getByRole("button", { name: "Formatear código JSON" });
		fireEvent.click(formatBtn);

		// It should attempt to call onChange with formatted JSON
		expect(mockOnChange).toHaveBeenCalledWith('{\n  "name": "test"\n}');
	});
});
