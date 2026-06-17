import { createFileRoute } from "@tanstack/react-router";
import { Streamdown } from "streamdown";
import { Newspaper } from "lucide-react";
import { PageLayout } from "../../layouts/PageLayout";
import novedadesContent from "../../../NOVEDADES.md?raw";

export const Route = createFileRoute("/novedades/")({
	component: NovedadesPage,
});

function NovedadesPage() {
	return (
		<PageLayout
			header={{
				title: (
					<div className="flex items-center gap-2">
						<Newspaper className="w-4 h-4" />
						<span>Novedades</span>
					</div>
				),
			}}
		>
			<div className="bg-muted/10 border border-border/40 rounded-xl p-8">
				<Streamdown>{novedadesContent}</Streamdown>
			</div>
		</PageLayout>
	);
}
