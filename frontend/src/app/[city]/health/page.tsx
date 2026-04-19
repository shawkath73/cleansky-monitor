import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import HealthPage from "../../health/page";
import { createCityMetadata } from "../seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ city: string }>;
}): Promise<Metadata> {
	const { city } = await params;
	return await createCityMetadata(
		city,
		"[City] Air Quality Health Advisory",
		"Review risk guidance, sensitive-group alerts, and mitigation actions based on live AQI conditions in [City].",
		"/health",
	);
}

export default async function CityHealthRoute({
	params,
}: {
	params: Promise<{ city: string }>;
}) {
	const { city } = await params;
	return (
		<>
			<JsonLd citySlug={city} section="health" />
			<HealthPage />
		</>
	);
}
