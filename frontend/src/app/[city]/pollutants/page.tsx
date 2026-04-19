import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PollutantsPage from "../../pollutants/page";
import { createCityMetadata } from "../seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ city: string }>;
}): Promise<Metadata> {
	const { city } = await params;
	return await createCityMetadata(
		city,
		"[City] Pollutant Analysis",
		"Explore pollutant-level diagnostics, source attribution signals, and concentration status in [City].",
		"/pollutants",
	);
}

export default async function CityPollutantsRoute({
	params,
}: {
	params: Promise<{ city: string }>;
}) {
	const { city } = await params;
	return (
		<>
			<JsonLd citySlug={city} section="pollutants" />
			<PollutantsPage />
		</>
	);
}
