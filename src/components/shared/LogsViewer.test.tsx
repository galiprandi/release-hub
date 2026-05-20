import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogsViewer } from './LogsViewer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks
vi.mock('@galiprandi/react-tools', () => ({
	LazyRender: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	useAISummarize: () => ({
		data: '',
		status: 'idle',
		error: null,
		summarize: vi.fn(),
		reset: vi.fn(),
	}),
}));

vi.mock('@/hooks/useAIErrorProcessor', () => ({
	useAIErrorProcessor: () => ({
		processError: vi.fn().mockResolvedValue('Processed Error'),
	}),
}));

vi.mock('@/components/AISummaryCard', () => ({
	AISummaryCard: () => <div data-testid="ai-summary-card" />,
}));

describe('LogsViewer', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		// Mock ResizeObserver
		global.ResizeObserver = vi.fn().mockImplementation(() => ({
			observe: vi.fn(),
			unobserve: vi.fn(),
			disconnect: vi.fn(),
		}));

		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
	});

	const renderLogsViewer = (props = {}) => {
		const defaultProps = {
			fetchFn: vi.fn().mockResolvedValue('2024-04-30 INFO Log 1\n2024-04-30 ERROR Log 2'),
			onClose: vi.fn(),
			asModal: false,
		};
		return render(
			<QueryClientProvider client={queryClient}>
				<LogsViewer {...defaultProps} {...props} />
			</QueryClientProvider>
		);
	};

	it('renders logs correctly', async () => {
		renderLogsViewer();
		await waitFor(() => {
			expect(screen.getByText(/Log 1/)).toBeTruthy();
			expect(screen.getByText(/Log 2/)).toBeTruthy();
		});
	});

	it('filters logs by text', async () => {
		renderLogsViewer();
		await waitFor(() => expect(screen.getByText(/Log 1/)).toBeTruthy());

		const searchInput = screen.getByLabelText(/Buscar logs/);
		fireEvent.change(searchInput, { target: { value: 'ERROR' } });

		expect(screen.queryByText(/Log 1/)).toBeNull();
		expect(screen.getByText(/Log 2/)).toBeTruthy();
	});

	it('filters logs by level', async () => {
		renderLogsViewer();
		await waitFor(() => expect(screen.getByText(/Log 1/)).toBeTruthy());

		const levelSelect = screen.getByLabelText(/Filtrar por nivel/);
		fireEvent.change(levelSelect, { target: { value: 'ERROR' } });

		expect(screen.queryByText(/Log 1/)).toBeNull();
		expect(screen.getByText(/Log 2/)).toBeTruthy();
	});

	it('toggles auto-scroll', async () => {
		renderLogsViewer();
		const pauseButton = screen.getByRole('button', { name: /Detener scroll automático/i });
		fireEvent.click(pauseButton);

		expect(screen.getByRole('button', { name: /Activar scroll automático/i })).toBeTruthy();
	});

	it('disables auto-scroll on manual scroll', async () => {
		renderLogsViewer();
		// Initially, it should have the pause button (indicating auto-scroll is enabled)
		expect(screen.getByRole('button', { name: /Detener scroll automático/i })).toBeTruthy();

		// Simulate manual scroll away from bottom
		const container = screen.getByRole('log', { name: /Panel de logs/i });
		Object.defineProperty(container, 'scrollHeight', { value: 200, configurable: true });
		Object.defineProperty(container, 'clientHeight', { value: 100, configurable: true });
		Object.defineProperty(container, 'scrollTop', { value: 50, configurable: true });

		fireEvent.scroll(container);

		// Now, it should have the play button (indicating auto-scroll is disabled)
		await waitFor(() => {
			expect(screen.getByRole('button', { name: /Activar scroll automático/i })).toBeTruthy();
		});
	});

	it('enables auto-scroll when clicking play button', async () => {
		renderLogsViewer();
		const pauseButton = screen.getByRole('button', { name: /Detener scroll automático/i });
		fireEvent.click(pauseButton);

		const playButton = screen.getByRole('button', { name: /Activar scroll automático/i });
		fireEvent.click(playButton);

		expect(screen.getByRole('button', { name: /Detener scroll automático/i })).toBeTruthy();
	});

	it('calls onResourceChange when resource is selected', async () => {
		const onResourceChange = vi.fn();
		const resources = [
			{ id: '1', name: 'Pod 1', type: 'pod' },
			{ id: '2', name: 'Pod 2', type: 'pod' },
		];

		renderLogsViewer({ resources, onResourceChange, selectedResourceId: '1' });

		const resourceSelect = screen.getByLabelText(/Seleccionar recurso/);
		fireEvent.change(resourceSelect, { target: { value: '2' } });

		expect(onResourceChange).toHaveBeenCalledWith('2');
	});

    it('shows empty message when no logs', async () => {
        renderLogsViewer({ fetchFn: vi.fn().mockResolvedValue('') });
        await waitFor(() => {
            expect(screen.getByText(/No hay logs disponibles/i)).toBeTruthy();
        });
    });

    it('copies logs to clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: { writeText }
        });

        renderLogsViewer();
        await waitFor(() => expect(screen.getByText(/Log 1/)).toBeTruthy());

        const copyButton = screen.getByRole('button', { name: /Copiar logs/i });
        fireEvent.click(copyButton);

        expect(writeText).toHaveBeenCalledWith('2024-04-30 INFO Log 1\n2024-04-30 ERROR Log 2');
    });

    it('renders as modal when asModal is true', async () => {
        renderLogsViewer({ asModal: true });
        // Radix Dialog renders into a portal
        // We look for the dialog role
        const dialog = await screen.findByRole('dialog');
        expect(dialog).toBeTruthy();
        // The title is in an h2 inside the dialog
        const title = screen.getByRole('heading', { name: /Logs/i });
        expect(title).toBeTruthy();
    });
});
