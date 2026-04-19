import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import ForecastPage from "../../forecast/page";
import { createCityMetadata } from "../seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ city: string }>;
}): Promise<Metadata> {
	const { city } = await params;
	return await createCityMetadata(
		city,
		"[City] 48-Hour AQI Forecast",
		"View short-horizon AQI projections, trend windows, and expected pollution changes for [City].",
		"/forecast",
	);
}

export default async function CityForecastRoute({
	params,
}: {
	params: Promise<{ city: string }>;
}) {
	const { city } = await params;
	return (
		<>
			<JsonLd citySlug={city} section="forecast" />
			<ForecastPage />
		</>
	);
}
