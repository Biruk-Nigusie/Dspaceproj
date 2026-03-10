import {
	BabyIcon,
	CalendarIcon,
	HeartIcon,
	HouseIcon,
	MapPinIcon,
	SkullIcon,
	UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "@/components/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import dspaceService from "@/services/dspaceService";

const Hero = () => {
	const [collections, setCollections] = useState([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const res = await dspaceService.fetchCollectionStats();
				const list = res || [];
				if (mounted) {
					setCollections(list);
					setSelectedIndex(0);
				}
			} catch (err) {
				console.warn("Hero: could not load collection stats", err);
			} finally {
				if (mounted) setLoading(false);
			}
		};

		load();
		return () => (mounted = false);
	}, []);

	const selected = collections[selectedIndex] || null;

	const entityType =
		selected?.entityType ||
		(selected?.houseStats
			? "House"
			: selected?.vitalEventStats
				? "VitalEvent"
				: null);

	return (
		<section className="bg-primary text-primary-foreground">
			<div className="container mx-auto py-10 px-4 md:px-0">
				{/* Selection / empty / loading */}
				{loading ? (
					<div className="mb-4 p-4 rounded-md bg-muted/40 animate-pulse text-center text-sm">
						Loading collections…
					</div>
				) : collections.length === 0 ? (
					<div className="mb-4 p-4 rounded-md bg-muted/20 text-center">
						<div className="text-sm text-primary-foreground/70 mb-2">
							No collections available
						</div>
						<div className="text-xs text-primary-foreground/50 mb-4">
							You don't have access to any collection yet.
						</div>
						<div className="flex justify-center">
							<Link to="/editor">
								<Button variant="secondary">Upload first dataset</Button>
							</Link>
						</div>
					</div>
				) : collections.length > 1 ? (
					<Select
						value={String(selectedIndex)}
						onValueChange={(v) => setSelectedIndex(Number(v))}
					>
						<SelectTrigger className="mb-4 hover:bg-transparent! bg-transparent! border-none text-primary-foreground/50 hover:text-primary-foreground p-0 hover:[&>svg]:text-primary-foreground [&>svg]:text-primary-foreground/50 focus:ring-0 shadow-none">
							<SelectValue placeholder="Select a collection" />
						</SelectTrigger>
						<SelectContent className="p-2">
							{collections.map((c, i) => (
								<SelectItem key={c.collectionId || i} value={String(i)}>
									{c.collectionName || `Collection ${i + 1}`}
									{c.entityType ? ` (${c.entityType})` : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<div className="text-sm text-primary-foreground/80 mb-3">
						{selected?.collectionName ?? "No collection available"}
					</div>
				)}

				{/* Metric cards */}
				<div className="flex flex-wrap gap-4 flex-col md:flex-row">
					{loading ? (
						<>
							<div className="flex-1 h-32 rounded-lg bg-muted/40 animate-pulse" />
							<div className="flex-1 h-32 rounded-lg bg-muted/40 animate-pulse" />
							<div className="flex-1 h-32 rounded-lg bg-muted/40 animate-pulse" />
							<div className="flex-1 h-32 rounded-lg bg-muted/40 animate-pulse" />
						</>
					) : entityType === "House" ? (
						<>
							<DashboardCard
								label="Woredas"
								value={collections.length}
								icon={<MapPinIcon size={20} />}
								subtitle="Woredas you have access to"
							/>

							<DashboardCard
								label="Houses"
								value={selected?.houseStats?.totalRegisteredHouses ?? 0}
								icon={<HouseIcon size={20} />}
								subtitle="Total registered houses (selected)"
							/>

							<DashboardCard
								label="Residents"
								value={selected?.houseStats?.totalRegisteredCitizens ?? 0}
								icon={<UsersIcon size={20} />}
								subtitle="Total registered residents (selected)"
							/>

							<DashboardCard
								label="Family Size"
								value={selected?.houseStats?.averageFamilySizePerHouse ?? 0}
								icon={<UsersIcon size={20} />}
								subtitle="Average family size (selected)"
							/>
						</>
					) : entityType === "VitalEvent" ? (
						<>
							<DashboardCard
								label="Vital Events"
								value={selected?.vitalEventStats?.totalVitalEvents ?? 0}
								icon={<CalendarIcon size={20} />}
								subtitle="Total registered vital events (selected)"
							/>

							<DashboardCard
								label="Birth"
								value={selected?.vitalEventStats?.birthRecords ?? 0}
								icon={<BabyIcon size={20} />}
								subtitle="Total registered births (selected)"
							/>

							<DashboardCard
								label="Marriage"
								value={selected?.vitalEventStats?.marriageRecords ?? 0}
								icon={<HeartIcon size={20} />}
								subtitle="Total registered marriages / divorces (selected)"
							/>

							<DashboardCard
								label="Death"
								value={selected?.vitalEventStats?.deathRecords ?? 0}
								icon={<SkullIcon size={20} />}
								subtitle="Total registered deaths (selected)"
							/>
						</>
					) : (
						<div className="text-sm text-primary-foreground/50">
							No metrics available.
						</div>
					)}
				</div>

				{/* Details / breakdown */}
				<div>
					{loading ? (
						<div className="mt-4 p-4 rounded bg-muted/40 animate-pulse h-8" />
					) : selected ? (
						<div className="space-y-3 text-sm">
							{entityType === "House" && (
								<div className="pt-6 border-t border-t-border/20 mt-6">
									<div className="text-xs text-primary-foreground/50 mb-1">
										House Types
									</div>
									<div className="flex flex-wrap gap-2">
										{selected.houseStats?.distributionByHouseType ? (
											Object.entries(
												selected.houseStats.distributionByHouseType,
											).map(([k, v]) => (
												<Badge
													key={k}
													className="bg-primary-foreground/10 text-primary-foreground text-md p-3"
												>
													{k}: {v}
												</Badge>
											))
										) : (
											<div className="text-xs text-primary-foreground/50">
												No breakdown
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="text-sm text-primary-foreground/50">
							No statistics available.
						</div>
					)}
				</div>
			</div>
		</section>
	);
};

export default Hero;
