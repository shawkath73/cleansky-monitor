import type { Metadata } from "next";
import { createCityMetadata } from "../seo";

export async function generateMetadata({
	params,
}: {
	params: { city: string };
}): Promise<Metadata> {
	return await createCityMetadata(
		params.city,
		"[City] 48-Hour AQI Forecast",
		"View short-horizon AQI projections, trend windows, and expected pollution changes for [City].",
		"/forecast",
	);
}

export { default } from "../../forecast/page";
