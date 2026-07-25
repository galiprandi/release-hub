import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import * as Dialog from "@radix-ui/react-dialog"
import { DialogCloseButton } from "./DialogCloseButton"

describe("DialogCloseButton", () => {
	it("should render the button with X icon", () => {
		render(
			<Dialog.Root open>
				<DialogCloseButton />
			</Dialog.Root>
		)
		const button = screen.getByRole("button")
		expect(button).toBeInTheDocument()
	})

	it("should have screen reader text 'Cerrar'", () => {
		render(
			<Dialog.Root open>
				<DialogCloseButton />
			</Dialog.Root>
		)
		const srText = screen.getByText("Cerrar")
		expect(srText).toBeInTheDocument()
		expect(srText).toHaveClass("sr-only")
	})

	it("should apply custom className when provided", () => {
		const { container } = render(
			<Dialog.Root open>
				<DialogCloseButton className="custom-class" />
			</Dialog.Root>
		)
		const button = container.querySelector("button")
		expect(button).toHaveClass("custom-class")
	})

	it("should have proper accessibility attributes", () => {
		render(
			<Dialog.Root open>
				<DialogCloseButton />
			</Dialog.Root>
		)
		const button = screen.getByRole("button")
		expect(button).toHaveClass("focus-visible:ring-2", "focus-visible:ring-primary/30", "focus-visible:ring-offset-1")
	})
})
