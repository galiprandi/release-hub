import { Loader2, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { BaseDialog } from "@/components/ui/BaseDialog";

/**
 * Variantes visuales disponibles para el diálogo
 */
export type ConfirmDialogVariant = "default" | "destructive" | "warning" | "success";

/**
 * Configuración de los botones de acción
 */
export interface ConfirmDialogActions {
	/** Texto del botón de confirmación */
	confirmText?: string;
	/** Texto del botón de cancelación */
	cancelText?: string;
	/** Deshabilitar botones durante loading */
	disabled?: boolean;
}

/**
 * Props del componente ConfirmDialog
 */
export interface ConfirmDialogProps {
	/** Controla si el diálogo está abierto */
	open: boolean;
	/** Callback cuando cambia el estado abierto/cerrado */
	onOpenChange: (open: boolean) => void;
	/** Callback cuando se confirma la acción */
	onConfirm: () => void | Promise<void>;
	/** Título del diálogo */
	title: React.ReactNode;
	/** Descripción o mensaje principal */
	description?: React.ReactNode;
	/** Contenido adicional personalizado */
	children?: React.ReactNode;
	/** Variante visual del diálogo */
	variant?: ConfirmDialogVariant;
	/** Configuración de los botones de acción */
	actions?: ConfirmDialogActions;
	/** Estado de loading para el botón de confirmación */
	isLoading?: boolean;
	/** Icono personalizado (sobrescribe el icono de la variante) */
	customIcon?: React.ReactNode;
	/** Ancho máximo del diálogo */
	maxWidth?: string;
}

/**
 * Mapeo de variantes a estilos y iconos
 */
const VARIANT_CONFIG = {
	default: {
		icon: Info,
		iconColor: "text-info",
		buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
	},
	destructive: {
		icon: AlertTriangle,
		iconColor: "text-destructive",
		buttonClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
	},
	warning: {
		icon: AlertTriangle,
		iconColor: "text-warning",
		buttonClass: "bg-warning text-white hover:bg-warning/90",
	},
	success: {
		icon: CheckCircle,
		iconColor: "text-success",
		buttonClass: "bg-success text-white hover:bg-success/90",
	},
} as const;

/**
 * ConfirmDialog - Componente genérico de confirmación
 *
 * Diálogo reutilizable para confirmaciones, alertas y acciones destructivas.
 * Sigue los tokens visuales del sistema y patrones de Radix UI.
 *
 * @example Uso básico con variante destructive
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleDelete}
 *   title="Eliminar elemento"
 *   description="¿Estás seguro de que quieres eliminar este elemento?"
 *   variant="destructive"
 * />
 * ```
 *
 * @example Con acciones personalizadas
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleAction}
 *   title="Confirmar acción"
 *   description="Esta acción no se puede deshacer"
 *   variant="warning"
 *   actions={{
 *     confirmText: "Sí, continuar",
 *     cancelText: "No, cancelar"
 *   }}
 * />
 * ```
 *
 * @example Con contenido personalizado y loading
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={async () => {
 *     await someAsyncOperation();
 *   }}
 *   title="Procesando"
 *   description="Esto puede tomar unos segundos"
 *   isLoading={isProcessing}
 * >
 *   <div className="mt-4 p-4 bg-muted rounded">
 *     <p>Información adicional</p>
 *   </div>
 * </ConfirmDialog>
 * ```
 *
 * @example Con icono personalizado
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleConfirm}
 *   title="Custom Icon"
 *   customIcon={<CustomIcon className="w-5 h-5" />}
 *   description="Mensaje con icono personalizado"
 * />
 * ```
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	title,
	description,
	children,
	variant = "default",
	actions = {},
	isLoading = false,
	customIcon,
	maxWidth = "max-w-md",
}: ConfirmDialogProps) {
	const config = VARIANT_CONFIG[variant];
	const IconComponent = config.icon;
	const {
		confirmText = variant === "destructive" ? "Eliminar" : "Confirmar",
		cancelText = "Cancelar",
		disabled = isLoading,
	} = actions;

	const handleConfirm = async () => {
		await onConfirm();
	};

	return (
		<BaseDialog
			open={open}
			onOpenChange={onOpenChange}
			title={
				<>
					{customIcon || <IconComponent className={`w-5 h-5 ${config.iconColor}`} />}
					{title}
				</>
			}
			description={typeof description === "string" ? description : "Confirmación"}
			maxWidth={maxWidth}
		>
			<div className="flex flex-col flex-1 overflow-y-auto">
				{description && typeof description === "string" && (
					<p className="text-sm text-muted-foreground mb-4">{description}</p>
				)}
				{description && typeof description !== "string" && (
					<div className="mb-4">{description}</div>
				)}
				{children && <div className="mb-4">{children}</div>}

				<div className="mt-6 pt-4 border-t flex justify-end gap-2 flex-shrink-0">
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						disabled={disabled}
						className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:outline-none"
					>
						{cancelText}
					</button>
					<button
						onClick={handleConfirm}
						disabled={disabled}
						className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:outline-none ${config.buttonClass}`}
					>
						{isLoading ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Procesando...
							</>
						) : (
							confirmText
						)}
					</button>
				</div>
			</div>
		</BaseDialog>
	);
}
