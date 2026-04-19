import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import DashboardPage from "./DashboardPage";
import { createCityMetadata } from "./seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ city: string }>;
}): Promise<Metadata> {
	const { city } = await params;
	return await createCityMetadata(
		city,
		"[City] Air Quality & AQI",
		"Track current AQI, station confidence, historical trends, and forecast intelligence for [City].",
	);
}

export default async function CityDashboardRoute({
	params,
}: {
	params: Promise<{ city: string }>;
}) {
	const { city } = await params;
	return (
		<>
			<JsonLd citySlug={city} section="dashboard" />
			<DashboardPage />
		</>
	);
}
