import type { DiffMode } from '@/utils/diffEngine';
import { Fingerprint, Terminal, FileText, Code2, FileJson, FileCode, Hash, Type, type LucideIcon } from 'lucide-react';
import { IndustrialTabs } from '@/components/shared/IndustrialTabs';

interface DiffControlsProps {
	mode: DiffMode;
	onModeChange: (mode: DiffMode) => void;
}

export function DiffControls({ mode, onModeChange }: DiffControlsProps) {
	const modes: { id: DiffMode; label: string; icon: LucideIcon }[] = [
		{ id: 'json', label: 'JSON', icon: FileJson },
		{ id: 'jwt', label: 'JWT', icon: Fingerprint },
		{ id: 'curl', label: 'cURL', icon: Terminal },
		{ id: 'javascript', label: 'JS', icon: FileCode },
		{ id: 'typescript', label: 'TS', icon: Type },
		{ id: 'html', label: 'HTML', icon: Code2 },
		{ id: 'css', label: 'CSS', icon: Hash },
		{ id: 'python', label: 'PY', icon: FileCode },
		{ id: 'text', label: 'Text', icon: FileText },
	];

	const options = modes.map(m => ({
		id: m.id,
		label: (
			<div className="flex items-center gap-1.5">
				<m.icon className={`w-3.5 h-3.5 ${mode === m.id ? 'text-primary' : 'text-muted-foreground/60'}`} />
				<span>{m.label}</span>
			</div>
		)
	}));

	return (
		<IndustrialTabs
			options={options}
			activeId={mode}
			onChange={onModeChange}
			className="max-w-[80vw] overflow-x-auto no-scrollbar scrollbar-hide"
		/>
	);
}
