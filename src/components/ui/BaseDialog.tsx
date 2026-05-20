import * as Dialog from "@radix-ui/react-dialog"
import { DialogCloseButton } from "./DialogCloseButton"

interface BaseDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: React.ReactNode
	description?: string
	maxWidth?: string
	maxHeight?: string
	className?: string
	children: React.ReactNode
	headerExtra?: React.ReactNode
}

export function BaseDialog({
	open,
	onOpenChange,
	title,
	description,
	maxWidth = "max-w-lg",
	maxHeight = "max-h-[80vh]",
	className = "",
	children,
	headerExtra
}: BaseDialogProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className={`fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full z-50 ${maxWidth} ${maxHeight} bg-background rounded-lg shadow-lg border p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden flex flex-col transition-all duration-200 ${className}`}>
					<Dialog.Description className="sr-only">
						{description || "Contenido del diálogo"}
					</Dialog.Description>

					{/* Header */}
					<div className="flex items-center justify-between p-2 flex-shrink-0">
						<Dialog.Title className="text-lg font-semibold flex items-center gap-2">
							{title}
						</Dialog.Title>
						<div className="flex items-center gap-2">
							{headerExtra}
							<DialogCloseButton />
						</div>
					</div>

					{/* Content */}
					{children}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
