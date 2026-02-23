import {
	Baby,
	Fingerprint,
	Heart,
	Skull,
	Unlink,
	UserIcon,
	UserPlus,
	Users,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";

export function StatsCard({ title, value, icon: CategoryIcon }) {
	return (
		<Card className="w-full">
			<CardHeader className="pb-2 flex flex-row items-center gap-4">
				{CategoryIcon && (
					<div className="rounded-lg p-2">
						<CategoryIcon className="size-8" />
					</div>
				)}
			</CardHeader>
			<CardContent className="flex-1">
				<div className="flex items-center gap-3">
					<div className="text-3xl font-bold">{value}</div>
				</div>
			</CardContent>
			<CardFooter>{title}</CardFooter>
		</Card>
	);
}

/**
 * Pre‑defined stat entries for the CRVS dashboard.
 * Each entry carries the data + visual config used by StatsCard.
 */
export const statsData = [
	{
		title: "Registered Residents",
		value: "3.2M",
		icon: Users,
	},
	{
		title: "Digital ID",
		value: "2.7M",
		icon: Fingerprint,
	},
	{
		title: "Married",
		value: "347.1K",
		icon: Heart,
	},
	{
		title: "Non Marital",
		value: "377.6K",
		icon: UserIcon,
	},
	{
		title: "Birth Certificates",
		value: "1.3M",
		icon: Baby,
	},
	{
		title: "Death",
		value: "84.6K",
		icon: Skull,
	},
	{
		title: "Divorce",
		value: "24.9K",
		icon: Unlink,
	},
	{
		title: "Adoption",
		value: "2.1K",
		icon: UserPlus,
	},
];
