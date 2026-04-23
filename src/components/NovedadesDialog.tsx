import { useState, useEffect } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Newspaper } from "lucide-react"
import { Streamdown } from "streamdown"
import novedadesContent from "../../NOVEDADES.md?raw"

export function NovedadesDialog() {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		// Add custom scrollbar styles
		const style = document.createElement('style')
		style.textContent = `
			.custom-scrollbar::-webkit-scrollbar {
				width: 8px;
			}
			.custom-scrollbar::-webkit-scrollbar-track {
				background: #f1f1f1;
				border-radius: 4px;
			}
			.custom-scrollbar::-webkit-scrollbar-thumb {
				background: #888;
				border-radius: 4px;
			}
			.custom-scrollbar::-webkit-scrollbar-thumb:hover {
				background: #555;
			}
			@media (prefers-color-scheme: dark) {
				.custom-scrollbar::-webkit-scrollbar-track {
					background: #1f2937;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: #4b5563;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: #6b7280;
				}
			}
		`
		document.head.appendChild(style)
		return () => {
			document.head.removeChild(style)
		}
	}, [])

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
				>
					<Newspaper className="w-4 h-4" />
					Novedades
				</button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-4xl max-h-[80vh] bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col">
					<Dialog.Description className="sr-only">
						Novedades del sistema ReleaseHub
					</Dialog.Description>

					{/* Header - only close button */}
					<div className="flex items-center justify-end mb-4 flex-shrink-0">
						<Dialog.Close asChild>
							<button
								type="button"
								className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
							>
								<X className="w-4 h-4" />
								<span className="sr-only">Cerrar</span>
							</button>
						</Dialog.Close>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto custom-scrollbar prose prose-sm max-w-none dark:prose-invert">
						<Streamdown>{novedadesContent}</Streamdown>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
