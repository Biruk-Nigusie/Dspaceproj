import { Card, CardContent } from "@/components/ui/card";

export default function DashboardCard({ label, value, icon, subtitle }) {
	return (
		<Card className="bg-primary-foreground/10 flex-1">
			<CardContent className="flex flex-col gap-8">
				<div className="flex justify-between items-center text-primary-foreground/90">
					<span className="text-sm">{label}</span>
					{icon}
				</div>
				<div className="flex flex-col gap-2">
					<span className="text-5xl font-semibold text-primary-foreground">
						{value}
					</span>
					{subtitle && (
						<span className="text-sm text-primary-foreground/60">
							{subtitle}
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
