import type { ActionDefinition } from "./ActionButton"
import {
	Terminal,
	Play,
	RefreshCw,
	Square,
	ExternalLink,
	Star,
	Trash2,
	Copy,
	ClipboardCopy,
	Check,
	X,
	Settings,
	Search,
	Loader2,
	GitCommit,
	Tag,
	MessageSquare,
	User,
	Clock,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	Sparkles,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	FolderOpen,
	FolderPlus,
	Lock,
	Unlock,
	Rocket,
	Send,
	Download,
	LogIn,
	Layout,
	Activity,
	Bell,
	Link,
	Github,
	GitPullRequestCreateArrow,
} from "lucide-react"

export const ACTION_DEFINITIONS: Record<string, ActionDefinition> = {
	// Docker actions
	viewLogs: { icon: Terminal, label: "Ver logs", color: "default" },
	startContainer: { icon: Play, label: "Iniciar contenedor", color: "success" },
	restartContainer: { icon: RefreshCw, label: "Reiniciar contenedor", color: "default" },
	stopContainer: { icon: Square, label: "Detener contenedor", color: "destructive" },
	openPort: { icon: ExternalLink, label: "Abrir puerto", color: "primary" },

	// GitHub/Repo actions
	viewRepo: { icon: ExternalLink, label: "Ver repositorio", color: "primary" },
	starRepo: { icon: Star, label: "Favorito", color: "default" },
	unstarRepo: { icon: Star, label: "Quitar favorito", color: "default" },
	forkRepo: { icon: GitCommit, label: "Fork", color: "default" },
	viewCommits: { icon: GitCommit, label: "Ver commits", color: "default" },
	viewPRs: { icon: GitCommit, label: "Ver Pull Requests", color: "default" },

	// General actions
	copy: { icon: Copy, label: "Copiar", color: "default" },
	clipboardCopy: { icon: ClipboardCopy, label: "Copiar", color: "default" },
	copyCurl: { icon: ClipboardCopy, label: "Copiar cURL", color: "default" },
	delete: { icon: Trash2, label: "Eliminar", color: "destructive" },
	settings: { icon: Settings, label: "Configuración", color: "default" },
	search: { icon: Search, label: "Buscar", color: "default" },
	refresh: { icon: RefreshCw, label: "Actualizar", color: "default" },
	loading: { icon: Loader2, label: "Cargando...", color: "default" },
	close: { icon: X, label: "Cerrar", color: "default" },
	confirm: { icon: Check, label: "Confirmar", color: "success" },

	// Status/Feedback actions
	warning: { icon: AlertTriangle, label: "Advertencia", color: "warning" },
	success: { icon: CheckCircle2, label: "Éxito", color: "success" },
	error: { icon: XCircle, label: "Error", color: "destructive" },
	info: { icon: Activity, label: "Información", color: "info" },

	// AI actions
	aiSummarize: { icon: Sparkles, label: "Resumir con IA", color: "primary" },
	aiGenerate: { icon: Sparkles, label: "Generar con IA", color: "primary" },

	// Navigation actions
	expand: { icon: ChevronDown, label: "Expandir", color: "default" },
	collapse: { icon: ChevronUp, label: "Colapsar", color: "default" },
	next: { icon: ChevronRight, label: "Siguiente", color: "default" },
	back: { icon: ChevronRight, label: "Atrás", color: "default" },

	// File/Folder actions
	openFolder: { icon: FolderOpen, label: "Abrir carpeta", color: "default" },
	newFolder: { icon: FolderPlus, label: "Nueva carpeta", color: "default" },

	// Security actions
	lock: { icon: Lock, label: "Bloquear", color: "warning" },
	unlock: { icon: Unlock, label: "Desbloquear", color: "success" },

	// Deployment actions
	deploy: { icon: Rocket, label: "Desplegar", color: "primary" },
	promote: { icon: Rocket, label: "Promover", color: "success" },

	// Communication actions
	send: { icon: Send, label: "Enviar", color: "primary" },
	notify: { icon: Bell, label: "Notificar", color: "default" },

	// Utility actions
	download: { icon: Download, label: "Descargar", color: "default" },
	login: { icon: LogIn, label: "Iniciar sesión", color: "primary" },
	link: { icon: Link, label: "Abrir enlace", color: "primary" },

	// Metadata actions
	viewAuthor: { icon: User, label: "Ver autor", color: "default" },
	viewTime: { icon: Clock, label: "Ver tiempo", color: "default" },
	viewTags: { icon: Tag, label: "Ver tags", color: "default" },
	viewComments: { icon: MessageSquare, label: "Ver comentarios", color: "default" },
	viewLayout: { icon: Layout, label: "Ver layout", color: "default" },

	// GitHub actions
	openGitHub: { icon: Github, label: "Abrir en GitHub", color: "primary" },
	viewPendingCommits: { icon: GitPullRequestCreateArrow, label: "Ver commits pendientes", color: "warning" },
	addFavorite: { icon: Star, label: "Agregar a favoritos", color: "default" },
	removeFavorite: { icon: Star, label: "Eliminar de favoritos", color: "warning" },
	freezeBranch: { icon: Lock, label: "Bloquear", color: "warning" },
	unfreezeBranch: { icon: Unlock, label: "Desbloquear", color: "success" },
	promoteToProd: { icon: Rocket, label: "Promocionar a producción", color: "destructive" },
	forceRedeploy: { icon: RefreshCw, label: "Redeploy", color: "primary" },
}
