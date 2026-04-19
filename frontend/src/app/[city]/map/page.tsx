import type { Metadata } from "next";
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

export { default } from "../../map/page";
