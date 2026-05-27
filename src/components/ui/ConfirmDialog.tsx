import { BaseDialog } from "./BaseDialog";
import { AlertTriangle } from "lucide-react";
import { ActionButton } from "./ActionButton";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  variant = "default",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
}: ConfirmDialogProps) {
  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <span>{title}</span>
        </div>
      }
      description={description}
      maxWidth="max-w-md"
    >
      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {cancelLabel}
          </button>
          <ActionButton
            action={{
              icon: AlertTriangle,
              label: confirmLabel,
              color: variant === "destructive" ? "destructive" : "primary",
            }}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            showLabel
            className="font-bold uppercase tracking-tight"
          />
        </div>
      </div>
    </BaseDialog>
  );
}
