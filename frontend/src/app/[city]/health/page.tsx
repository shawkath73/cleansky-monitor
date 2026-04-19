import type { Metadata } from "next";
import { createCityMetadata } from "../seo";

export async function generateMetadata({
	params,
}: {
	params: { city: string };
}): Promise<Metadata> {
	return await createCityMetadata(
		params.city,
		"[City] Air Quality Health Advisory",
		"Review risk guidance, sensitive-group alerts, and mitigation actions based on live AQI conditions in [City].",
		"/health",
	);
}

export { default } from "../../health/page";
