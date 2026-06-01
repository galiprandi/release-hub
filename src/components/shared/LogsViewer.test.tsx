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

vi.mock('./XTermLogs', () => ({
	XTermLogs: ({ logs }: { logs: string }) => (
		<pre data-testid="xterm-logs">{logs}</pre>
	),
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

	it('highlights search term and calculates match count', async () => {
		renderLogsViewer();
		await waitFor(() => expect(screen.getByText(/Log 1/)).toBeTruthy());

		const searchInput = screen.getByLabelText(/Buscar logs/);
		fireEvent.change(searchInput, { target: { value: 'ERROR' } });

		// Since we no longer hide non-matching lines, Log 1 must still be present
		expect(screen.getByText(/Log 1/)).toBeTruthy();
		// Match counter should show 1/1
		expect(screen.getByText('1/1')).toBeTruthy();
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
        // Radix Dialog renders in a portal, so we search globally
        const dialog = await screen.findByRole('dialog');
        expect(dialog).toBeTruthy();
    });

	it('toggles word wrap option', async () => {
		renderLogsViewer();
		const wrapButton = screen.getByRole('button', { name: /Ajuste de línea/i });
		expect(wrapButton.getAttribute('data-active')).toBeNull();

		fireEvent.click(wrapButton);
		expect(wrapButton.getAttribute('data-active')).toBe('true');
	});

	it('toggles line numbers option', async () => {
		renderLogsViewer();
		await waitFor(() => expect(screen.getByText(/Log 1/)).toBeTruthy());

		const hashButton = screen.getByRole('button', { name: /Mostrar números de línea/i });
		expect(hashButton.getAttribute('data-active')).toBeNull();

		fireEvent.click(hashButton);
		expect(hashButton.getAttribute('data-active')).toBe('true');
	});

	it('toggles custom highlighter option and accepts input', async () => {
		renderLogsViewer();
		const highlightButton = screen.getByRole('button', { name: /Resaltado personalizado/i });
		expect(highlightButton.getAttribute('data-active')).toBeNull();

		fireEvent.click(highlightButton);
		expect(highlightButton.getAttribute('data-active')).toBe('true');

		const highlightInput = screen.getByLabelText(/Término para resaltar/i);
		fireEvent.change(highlightInput, { target: { value: 'custom-term' } });
		expect(highlightInput.getAttribute('value')).toBe('custom-term');
	});

	it('toggles expand/collapse full screen option in modal mode', async () => {
		renderLogsViewer({ asModal: true });
		
		const dialog = await screen.findByRole('dialog');
		expect(dialog).toBeTruthy();

		// Initially, we should find the button "Expandir a pantalla completa"
		const expandButton = screen.getByRole('button', { name: /Expandir a pantalla completa/i });
		expect(expandButton).toBeTruthy();

		// Click to expand
		fireEvent.click(expandButton);

		// Now, the button should have name "Contraer tamaño"
		const contractButton = screen.getByRole('button', { name: /Contraer tamaño/i });
		expect(contractButton).toBeTruthy();

		// Click to collapse/contract
		fireEvent.click(contractButton);
		expect(screen.getByRole('button', { name: /Expandir a pantalla completa/i })).toBeTruthy();
	});

	it('persists options to and loads them from localStorage', async () => {
		const store: Record<string, string> = {
			"release_hub_logs_word_wrap": "true",
			"release_hub_logs_line_numbers": "true",
			"release_hub_logs_expanded": "true"
		};

		vi.spyOn(localStorage, 'getItem').mockImplementation((key) => store[key] || null);
		vi.spyOn(localStorage, 'setItem').mockImplementation((key, val) => {
			store[key] = val;
		});

		const { unmount } = renderLogsViewer({ asModal: true });

		const wrapButton = screen.getByRole('button', { name: /Ajuste de línea/i });
		const hashButton = screen.getByRole('button', { name: /Mostrar números de línea/i });
		const contractButton = screen.getByRole('button', { name: /Contraer tamaño/i });

		expect(wrapButton.getAttribute('data-active')).toBe('true');
		expect(hashButton.getAttribute('data-active')).toBe('true');
		expect(contractButton).toBeTruthy();

		fireEvent.click(wrapButton);
		expect(wrapButton.getAttribute('data-active')).toBeNull();
		expect(store["release_hub_logs_word_wrap"]).toBe("false");

		unmount();
		vi.restoreAllMocks();
	});
});
