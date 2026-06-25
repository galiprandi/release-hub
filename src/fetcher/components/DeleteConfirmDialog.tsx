import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface DeleteConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	itemName?: string;
	isDeleting?: boolean;
}

/**
 * DeleteConfirmDialog - Diálogo especializado para eliminación
 *
 * Wrapper alrededor de ConfirmDialog con configuración predefinida
 * para acciones destructivas. Simplifica el uso en el módulo Fetcher.
 *
 * @example
 * ```tsx
 * <DeleteConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleDelete}
 *   itemName="esta query (curl -X POST...)"
 *   isDeleting={isDeleting}
 * />
 * ```
 */
export function DeleteConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	itemName = "este item",
	isDeleting = false,
}: DeleteConfirmDialogProps) {
	return (
		<ConfirmDialog
			open={open}
			onOpenChange={onOpenChange}
			onConfirm={onConfirm}
			title="Confirmar Eliminación"
			description={
				<>
					<p className="text-sm text-muted-foreground mb-2">
						¿Estás seguro de que quieres eliminar {itemName} del historial?
					</p>
					<p className="text-sm text-muted-foreground">
						Esta acción no se puede deshacer.
					</p>
				</>
			}
			variant="destructive"
			customIcon={<Trash2 className="w-5 h-5 text-destructive" />}
			isLoading={isDeleting}
			actions={{
				confirmText: "Eliminar",
			}}
		/>
	);
}
