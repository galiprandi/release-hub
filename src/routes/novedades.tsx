import { createFileRoute } from "@tanstack/react-router";
import { Streamdown } from "streamdown";
import { PageLayout } from "../layouts/PageLayout";
import novedadesContent from "../../NOVEDADES.md?raw";

export const Route = createFileRoute("/novedades")({
	component: NovedadesPage,
});

function NovedadesPage() {
	return (
		<PageLayout>
			<Streamdown>{novedadesContent}</Streamdown>
		</PageLayout>
	);
}
