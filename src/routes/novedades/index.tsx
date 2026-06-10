import { createFileRoute } from "@tanstack/react-router";
import { Streamdown } from "streamdown";
import { PageLayout } from "../../layouts/PageLayout";
import novedadesContent from "../../../NOVEDADES.md?raw";
import { Newspaper } from "lucide-react";

export const Route = createFileRoute("/novedades/")({
	component: NovedadesPage,
});

function NovedadesPage() {
	return (
		<PageLayout
			header={{
				title: (
					<div className="flex items-center gap-2">
						<Newspaper className="w-4 h-4 text-primary" />
						<span>Novedades del Sistema</span>
					</div>
				),
			}}
		>
			<div className="max-w-4xl mx-auto w-full py-4">
				<div className="bg-muted/10 border border-border/40 rounded-xl overflow-hidden shadow-sm">
					<div className="px-8 py-6 border-b border-border/40 bg-muted/20">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-primary/10">
								<Newspaper className="w-5 h-5 text-primary" />
							</div>
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 block mb-0.5">Bitácora</span>
								<h2 className="text-xl font-bold tracking-tight text-foreground">Últimas Actualizaciones</h2>
							</div>
						</div>
					</div>
					<div className="px-8 py-10 prose prose-zinc dark:prose-invert max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-p:text-muted-foreground/90">
						<Streamdown>{novedadesContent}</Streamdown>
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
