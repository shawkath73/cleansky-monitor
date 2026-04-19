import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import MapPage from "../../map/page";
import { createCityMetadata } from "../seo";

export async function generateMetadata({
	params,
}: {
	params: { city: string };
}): Promise<Metadata> {
	return await createCityMetadata(
		params.city,
		"[City] Live AQI Map",
		"Monitor station-level AQI patterns and geospatial pollution shifts with the live map view for [City].",
		"/map",
	);
}

export default function CityMapRoute({
	params,
}: {
	params: { city: string };
}) {
	return (
		<>
			<JsonLd citySlug={params.city} section="map" />
			<MapPage />
		</>
	);
}
