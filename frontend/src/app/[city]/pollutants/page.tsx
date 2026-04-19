import type { Metadata } from "next";
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

export { default } from "../../pollutants/page";
