import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { BaseDialog } from "./BaseDialog"

describe("BaseDialog", () => {
	it("should render dialog when open is true", () => {
		render(
			<BaseDialog open={true} onOpenChange={vi.fn()} title="Test Dialog">
				<div>Dialog Content</div>
			</BaseDialog>
		)
		const content = screen.getByText("Dialog Content")
		expect(content).toBeInTheDocument()
	})

	it("should not render dialog when open is false", () => {
		render(
			<BaseDialog open={false} onOpenChange={vi.fn()} title="Test Dialog">
				<div>Dialog Content</div>
			</BaseDialog>
		)
		const content = screen.queryByText("Dialog Content")
		expect(content).not.toBeInTheDocument()
	})

	it("should render title", () => {
		render(
			<BaseDialog open={true} onOpenChange={vi.fn()} title="Test Title">
				<div>Content</div>
			</BaseDialog>
		)
		const title = screen.getByText("Test Title")
		expect(title).toBeInTheDocument()
	})

	it("should render description when provided", () => {
		render(
			<BaseDialog open={true} onOpenChange={vi.fn()} title="Test Dialog" description="Test Description">
				<div>Content</div>
			</BaseDialog>
		)
		const description = screen.getByText("Test Description")
		expect(description).toBeInTheDocument()
		expect(description).toHaveClass("sr-only")
	})

	it("should call onOpenChange when close button is clicked", () => {
		const onOpenChange = vi.fn()
		render(
			<BaseDialog open={true} onOpenChange={onOpenChange} title="Test Dialog">
				<div>Content</div>
			</BaseDialog>
		)
		const closeButtons = screen.getAllByText("Cerrar")
		closeButtons[0].click()
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it("should accept maxWidth prop", () => {
		render(
			<BaseDialog open={true} onOpenChange={vi.fn()} title="Test Dialog" maxWidth="max-w-xl">
				<div>Content</div>
			</BaseDialog>
		)
		// Component renders without errors when maxWidth is provided
		const content = screen.getByText("Content")
		expect(content).toBeInTheDocument()
	})

	it("should render children", () => {
		render(
			<BaseDialog open={true} onOpenChange={vi.fn()} title="Test Dialog">
				<div>Custom Child Content</div>
			</BaseDialog>
		)
		const childContent = screen.getByText("Custom Child Content")
		expect(childContent).toBeInTheDocument()
	})

	it("should have proper accessibility attributes", () => {
		render(
			<BaseDialog open={true} onOpenChange={vi.fn()} title="Test Dialog" description="Accessible Dialog">
				<div>Content</div>
			</BaseDialog>
		)
		const title = screen.getByText("Test Dialog")
		expect(title).toHaveClass("text-lg", "font-semibold")
	})
})
