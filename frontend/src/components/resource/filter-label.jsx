import { Label } from "@/components/ui/label";

export default function FilterLabel({ htmlFor, label }) {
	return (
		<Label
			htmlFor={htmlFor}
			className="block text-xs font-medium text-muted-foreground/80"
		>
			{label}
		</Label>
	);
}
