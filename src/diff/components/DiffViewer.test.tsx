import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DiffViewer } from "./DiffViewer";

describe("DiffViewer", () => {
	it("renders empty state initially", () => {
		render(<DiffViewer mode="json" />);
		expect(screen.getAllByText("Esperando entrada técnica")).toHaveLength(2);
		expect(screen.getAllByText(/Pega contenido en los paneles superiores/i)).toHaveLength(2);
	});

	it("toggles expanded state when the expand/restore button is clicked", () => {
		render(<DiffViewer mode="json" />);

		// Type some content to enable the comparison results and reveal the expand button
		const textareas = screen.getAllByRole("textbox");
		expect(textareas).toHaveLength(2);

		// The expand button should be present
		const expandButton = screen.getByRole("button", { name: "Expandir" });
		expect(expandButton).toBeInTheDocument();

		// Panels container should not have "hidden" class initially
		const panelsContainer = screen.getByTestId("diff-panels");
		expect(panelsContainer).not.toHaveClass("hidden");

		// Click the expand button
		fireEvent.click(expandButton);

		// Now the restore button should be present
		const restoreButton = screen.getByRole("button", { name: "Restaurar" });
		expect(restoreButton).toBeInTheDocument();

		// Panels container should have "hidden" class now
		expect(panelsContainer).toHaveClass("hidden");

		// Click the restore button to toggle it back
		fireEvent.click(restoreButton);

		// Should be back to "Expandir"
		expect(screen.getByRole("button", { name: "Expandir" })).toBeInTheDocument();
		expect(panelsContainer).not.toHaveClass("hidden");
	});
});
