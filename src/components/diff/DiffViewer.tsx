import React, { useState, useMemo, useRef } from 'react';
import type { DiffMode, DiffLine } from '@/utils/diffEngine';
import { computeDiff, normalizeJson, decodeAndNormalizeJwt, normalizeCurl } from '@/utils/diffEngine';
import { DiffPanel } from './DiffPanel';
import { clsx } from 'clsx';
import { GitCompare } from 'lucide-react';

interface DiffViewerProps {
	mode: DiffMode;
}

export function DiffViewer({ mode }: DiffViewerProps) {
	const [textA, setTextA] = useState('');
	const [textB, setTextB] = useState('');

	const leftScrollRef = useRef<HTMLDivElement>(null);
	const rightScrollRef = useRef<HTMLDivElement>(null);
	const diffScrollRef = useRef<HTMLDivElement>(null);

	// Synchronize scrolling
	const handleScroll = (source: 'left' | 'right' | 'diff') => (e: React.UIEvent<HTMLDivElement | HTMLTextAreaElement>) => {
		const target = e.currentTarget;
		const scrollTop = target.scrollTop;
		const scrollLeft = target.scrollLeft;

		if (source !== 'left' && leftScrollRef.current) {
			leftScrollRef.current.scrollTop = scrollTop;
			leftScrollRef.current.scrollLeft = scrollLeft;
		}
		if (source !== 'right' && rightScrollRef.current) {
			rightScrollRef.current.scrollTop = scrollTop;
			rightScrollRef.current.scrollLeft = scrollLeft;
		}
		if (source !== 'diff' && diffScrollRef.current) {
			diffScrollRef.current.scrollTop = scrollTop;
			diffScrollRef.current.scrollLeft = scrollLeft;
		}
	};

	const diff = useMemo(() => {
		let processedA = textA;
		let processedB = textB;

		if (textA && textB) {
			if (mode === 'json') {
				processedA = normalizeJson(textA);
				processedB = normalizeJson(textB);
			} else if (mode === 'jwt') {
				processedA = decodeAndNormalizeJwt(textA);
				processedB = decodeAndNormalizeJwt(textB);
			} else if (mode === 'curl') {
				processedA = normalizeCurl(textA);
				processedB = normalizeCurl(textB);
			}
		}

		return computeDiff(processedA, processedB);
	}, [textA, textB, mode]);

	return (
		<div className="flex flex-col gap-6 h-[calc(100vh-200px)]">
			<div className="grid grid-cols-2 gap-4 h-1/2">
				<DiffPanel
					title="Origen (Panel A)"
					value={textA}
					onChange={setTextA}
					placeholder={`Pega aquí el contenido ${mode.toUpperCase()}...`}
					scrollRef={leftScrollRef}
					onScroll={handleScroll('left')}
				/>
				<DiffPanel
					title="Destino (Panel B)"
					value={textB}
					onChange={setTextB}
					placeholder={`Pega aquí el contenido ${mode.toUpperCase()} a comparar...`}
					scrollRef={rightScrollRef}
					onScroll={handleScroll('right')}
				/>
			</div>

			<div className="flex-1 flex flex-col border rounded-xl bg-background shadow-sm overflow-hidden border-border/60">
				<div className="px-4 py-2 border-b bg-muted/20 border-border/60">
					<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
						Resultado de Comparación
					</h3>
				</div>
				<div
					ref={diffScrollRef}
					onScroll={handleScroll('diff')}
					className="flex-1 overflow-auto p-4 font-mono text-xs scrollbar-hide"
				>
					{!textA && !textB ? (
						<div className="h-full flex flex-col items-center justify-center text-muted-foreground italic gap-2">
							<GitCompare className="w-8 h-8 opacity-20" />
							<span>Esperando entrada en ambos paneles para comparar...</span>
						</div>
					) : (
						<div className="min-w-[800px] inline-block">
							{diff.map((line, idx) => (
								<DiffLineRow key={idx} line={line} />
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function DiffLineRow({ line }: { line: DiffLine }) {
	return (
		<div className="flex w-full group">
			{/* Left side */}
			<div className={clsx(
				"flex-1 flex border-r border-border/20",
				line.left?.type === 'removed' && "bg-destructive/10 text-destructive",
				line.left?.type === 'changed' && "bg-warning/10 text-warning",
				!line.left && "bg-muted/5 opacity-50"
			)}>
				<span className="w-8 shrink-0 text-right pr-2 text-muted-foreground/50 select-none">
					{line.left?.lineNumber || ''}
				</span>
				<span className="w-4 shrink-0 flex justify-center select-none font-bold">
					{line.left?.type === 'removed' ? '-' : line.left?.type === 'changed' ? '!' : ''}
				</span>
				<span className="whitespace-pre break-all px-1">
					{line.left?.value || ' '}
				</span>
			</div>

			{/* Right side */}
			<div className={clsx(
				"flex-1 flex",
				line.right?.type === 'added' && "bg-success/10 text-success",
				line.right?.type === 'changed' && "bg-warning/10 text-warning",
				!line.right && "bg-muted/5 opacity-50"
			)}>
				<span className="w-8 shrink-0 text-right pr-2 text-muted-foreground/50 select-none">
					{line.right?.lineNumber || ''}
				</span>
				<span className="w-4 shrink-0 flex justify-center select-none font-bold">
					{line.right?.type === 'added' ? '+' : line.right?.type === 'changed' ? '!' : ''}
				</span>
				<span className="whitespace-pre break-all px-1">
					{line.right?.value || ' '}
				</span>
			</div>
		</div>
	);
}
