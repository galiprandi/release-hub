import { BaseDialog } from "./BaseDialog"
import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void
	variant?: "default" | "destructive"
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirmar",
	cancelLabel = "Cancelar",
	onConfirm,
	variant = "default"
}: ConfirmDialogProps) {
	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title={<><AlertTriangle className={`w-5 h-5 ${variant === 'destructive' ? 'text-destructive' : 'text-warning'}`} /> {title}</>}
			description={description}
			maxWidth="max-w-md"
		>
			<div className="flex flex-col gap-4 p-4">
				<p className="text-sm text-muted-foreground">
					{description}
				</p>
				<div className="flex justify-end gap-3 mt-4">
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={() => {
							onConfirm()
							onOpenChange(false)
						}}
						className={`px-4 py-2 text-sm font-medium rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-offset-1 ${
							variant === 'destructive'
								? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive'
								: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary'
						}`}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</BaseDialog>
	)
}
