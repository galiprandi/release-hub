import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { DiscordNotification } from "./DiscordNotification"

describe("DiscordNotification", () => {
	const defaultProps = {
		webhookUrl: "https://discord.com/api/webhooks/12345",
		onWebhookChange: vi.fn(),
		enabled: false,
		onEnabledChange: vi.fn(),
	}

	it("should render the component with title and label", () => {
		render(<DiscordNotification {...defaultProps} />)
		expect(screen.getByText("Notificar en Discord")).toBeInTheDocument()
		expect(screen.getByText("Webhook de Discord")).toBeInTheDocument()
	})

	it("should have correct ARIA attributes on the switch", () => {
		render(<DiscordNotification {...defaultProps} enabled={true} />)
		const switchBtn = screen.getByRole("switch")
		expect(switchBtn).toBeInTheDocument()
		expect(switchBtn).toHaveAttribute("aria-checked", "true")
		expect(switchBtn).toHaveAttribute("aria-label", "Notificar en Discord")
	})

	it("should call onEnabledChange when clicked and webhook is present", () => {
		const onEnabledChange = vi.fn()
		render(<DiscordNotification {...defaultProps} onEnabledChange={onEnabledChange} />)
		const switchBtn = screen.getByRole("switch")
		fireEvent.click(switchBtn)
		expect(onEnabledChange).toHaveBeenCalledWith(true)
	})

	it("should be disabled and not toggle when webhook is empty", () => {
		const onEnabledChange = vi.fn()
		render(<DiscordNotification {...defaultProps} webhookUrl="" onEnabledChange={onEnabledChange} />)
		const switchBtn = screen.getByRole("switch")
		expect(switchBtn).toBeDisabled()
		fireEvent.click(switchBtn)
		expect(onEnabledChange).not.toHaveBeenCalled()
	})

	it("should toggle webhook visibility between password and text type", () => {
		render(<DiscordNotification {...defaultProps} />)
		const input = screen.getByLabelText("Webhook de Discord")
		expect(input).toBeInTheDocument()
		expect(input).toHaveAttribute("type", "password")

		const toggleBtn = screen.getByRole("button", { name: "Mostrar webhook" })
		expect(toggleBtn).toBeInTheDocument()

		fireEvent.click(toggleBtn)
		expect(input).toHaveAttribute("type", "text")
		expect(screen.getByRole("button", { name: "Ocultar webhook" })).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Ocultar webhook" }))
		expect(input).toHaveAttribute("type", "password")
	})

	it("should not show the webhook input when readonly", () => {
		render(<DiscordNotification {...defaultProps} readonly={true} />)
		expect(screen.queryByLabelText("Webhook de Discord")).not.toBeInTheDocument()
	})

	it("should call onWebhookChange when typing in the input", () => {
		const onWebhookChange = vi.fn()
		render(<DiscordNotification {...defaultProps} onWebhookChange={onWebhookChange} />)
		const input = screen.getByLabelText("Webhook de Discord")
		fireEvent.change(input, { target: { value: "https://discord.com/api/webhooks/updated" } })
		expect(onWebhookChange).toHaveBeenCalledWith("https://discord.com/api/webhooks/updated")
	})
})
