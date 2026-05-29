import { Plug, Activity } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

interface PortForwardControlProps {
	value: string
	placeholder?: string
	onChange: (value: string) => void
	onConnect: (port: number) => void | Promise<void>
	onDisconnect: () => void | Promise<void>
	status: "idle" | "loading" | "success" | "error"
	error?: string
}

export function PortForwardControl({ value, placeholder = "8080", onChange, onConnect, onDisconnect, status, error }: PortForwardControlProps) {
	const isActive = status === "success"
	const isLoading = status === "loading"

	const { data: hasHealth } = useQuery({
		queryKey: ["health", "port-forward", value],
		queryFn: async () => {
			const url = `http://localhost:${value}`
			const res = await fetch(`/health-proxy?url=${encodeURIComponent(url)}`)
			return res.ok
		},
		enabled: isActive && !!value,
		refetchInterval: 30000,
		retry: 1,
	})

	const handleToggle = async () => {
		if (isActive) {
			await onDisconnect()
		} else {
			if (!value) return
			await onConnect(parseInt(value))
		}
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-1.5">
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={isActive || isLoading}
					placeholder={placeholder}
					className={`w-[4.2rem] px-1.5 py-0.5 text-xs rounded border bg-background text-center ${
						isActive
							? "border-success/50 text-success opacity-70 cursor-not-allowed"
							: "border-input text-foreground placeholder:text-muted-foreground"
					} focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1`}
				/>
				<button
					type="button"
					onClick={handleToggle}
					disabled={!isActive && !value}
					className={`p-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 ${
						isActive
							? "text-destructive hover:bg-destructive/10"
							: "text-primary hover:bg-primary/10"
					} disabled:opacity-30 disabled:cursor-not-allowed`}
					aria-label={isActive ? "Desconectar" : "Conectar"}
				>
					<Plug className={`w-3.5 h-3.5 ${isActive ? "rotate-180" : ""}`} />
				</button>
				{hasHealth && (
					<a
						href={`http://localhost:${value}/health`}
						target="_blank"
						rel="noopener noreferrer"
						className="p-1 rounded text-info hover:bg-info/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
						aria-label="Abrir servicio en nueva pestaña"
						title="Servicio con /health disponible"
					>
						<Activity className="w-3.5 h-3.5" />
					</a>
				)}
			</div>
			{error && (
				<span className="text-[10px] text-destructive font-medium truncate max-w-[120px]">
					{error}
				</span>
			)}
		</div>
	)
}
