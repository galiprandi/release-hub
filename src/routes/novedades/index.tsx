import { createFileRoute } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";
import { Streamdown } from "streamdown";
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
						<Newspaper className="w-4 h-4 text-primary" />
						<span>Novedades</span>
					</div>
				),
			}}
		>
			<div className="border border-border rounded-md bg-card p-6">
				<Streamdown>{novedadesContent}</Streamdown>
			</div>
		</PageLayout>
	);
}
