import type { Metadata } from "next";
import { createCityMetadata } from "./seo";

export async function generateMetadata({
	params,
}: {
	params: { city: string };
}): Promise<Metadata> {
	return await createCityMetadata(
		params.city,
		"[City] Air Quality & AQI",
		"Track current AQI, station confidence, historical trends, and forecast intelligence for [City].",
	);
}

export { default } from "./DashboardPage";
