import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export const FilterOperatorSelect = ({ value, onChange, operators }) => {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-fit text-xs! hover:bg-transparent! bg-transparent! border-none text-blue-400 font-medium cursor-pointer focus:ring-0 p-0 shadow-none">
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="p-2">
				{operators.map((op) => (
					<SelectItem key={op.value} value={op.value} className="text-xs!">
						{op.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
