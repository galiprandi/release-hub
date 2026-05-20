import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StatusCard } from "./StatusCard";

describe("StatusCard", () => {
	it("renders loading state correctly", () => {
		const { container } = render(<StatusCard type="loading" message="Loading data..." />);
		expect(screen.getByText("Loading data...")).toBeInTheDocument();
		const icon = container.querySelector('svg');
		expect(icon).toHaveClass("animate-spin");
	});

	it("renders error state with retry button", () => {
		const onRetry = vi.fn();
		render(<StatusCard type="error" message="Error occurred" onRetry={onRetry} />);
		expect(screen.getByText("Error occurred")).toBeInTheDocument();
		const retryButton = screen.getByRole("button", { name: /reintentar/i });
		expect(retryButton).toHaveClass("text-destructive");

		fireEvent.click(retryButton);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("renders warn state with retry button", () => {
		const onRetry = vi.fn();
		render(<StatusCard type="warn" message="Warning message" onRetry={onRetry} />);
		const text = screen.getByText("Warning message");
		expect(text).toHaveClass("text-warning");
        const retryButton = screen.getByRole("button", { name: /reintentar/i });
		expect(retryButton).toHaveClass("text-warning");
	});

	it("renders offline state correctly", () => {
		render(<StatusCard type="offline" message="You are offline" />);
		expect(screen.getByText("You are offline")).toBeInTheDocument();
	});

	it("calls onClose when close button is clicked", () => {
		const onClose = vi.fn();
		render(<StatusCard type="loading" message="Loading..." onClose={onClose} />);
		const closeButton = screen.getByRole("button", { name: /cerrar/i });

		fireEvent.click(closeButton);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("does not render retry button if onRetry is not provided", () => {
		render(<StatusCard type="error" message="Error" />);
		expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
	});

	it("does not render close button if onClose is not provided", () => {
		render(<StatusCard type="loading" message="Loading" />);
		expect(screen.queryByRole("button", { name: /cerrar/i })).not.toBeInTheDocument();
	});

    it("renders custom retry button styles for non-error/warn types", () => {
        const onRetry = vi.fn();
        render(<StatusCard type="loading" message="Loading" onRetry={onRetry} />);
        const retryButton = screen.getByRole("button", { name: /reintentar/i });
        expect(retryButton).toHaveClass("bg-muted");
    });

    it("applies hover and transition classes to retry button", () => {
        const onRetry = vi.fn();
        render(<StatusCard type="error" message="Error" onRetry={onRetry} />);
        const retryButton = screen.getByRole("button", { name: /reintentar/i });
        expect(retryButton).toHaveClass("hover:bg-destructive/20");
        expect(retryButton).toHaveClass("transition-colors");
    });

    it("applies focus ring classes to buttons", () => {
        const onRetry = vi.fn();
        const onClose = vi.fn();
        render(<StatusCard type="error" message="Error" onRetry={onRetry} onClose={onClose} />);

        const retryButton = screen.getByRole("button", { name: /reintentar/i });
        const closeButton = screen.getByRole("button", { name: /cerrar/i });

        expect(retryButton).toHaveClass("focus-visible:ring-2");
        expect(closeButton).toHaveClass("focus-visible:ring-2");
    });

    it("handles long messages with truncate class", () => {
        render(<StatusCard type="loading" message="This is a very long message that should be truncated to prevent UI breaking and ensure resonance" />);
        const text = screen.getByText(/This is a very long message/);
        expect(text).toHaveClass("truncate");
    });
});
