import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PollutantsPage from "../../pollutants/page";
import { createCityMetadata } from "../seo";

export async function generateMetadata({
	params,
}: {
	params: { city: string };
}): Promise<Metadata> {
	return await createCityMetadata(
		params.city,
		"[City] Pollutant Analysis",
		"Explore pollutant-level diagnostics, source attribution signals, and concentration status in [City].",
		"/pollutants",
	);
}

export default function CityPollutantsRoute({
	params,
}: {
	params: { city: string };
}) {
	return (
		<>
			<JsonLd citySlug={params.city} section="pollutants" />
			<PollutantsPage />
		</>
	);
}
