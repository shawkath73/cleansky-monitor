import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import MapPage from "../../map/page";
import { createCityMetadata } from "../seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ city: string }>;
}): Promise<Metadata> {
	const { city } = await params;
	return await createCityMetadata(
		city,
		"[City] Live AQI Map",
		"Monitor station-level AQI patterns and geospatial pollution shifts with the live map view for [City].",
		"/map",
	);
}

export default async function CityMapRoute({
	params,
}: {
	params: Promise<{ city: string }>;
}) {
	const { city } = await params;
	return (
		<>
			<JsonLd citySlug={city} section="map" />
			<MapPage />
		</>
	);
}
