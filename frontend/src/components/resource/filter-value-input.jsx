import { Input } from "@/components/ui/input";

export const FilterValueInput = ({
	id,
	value,
	onChange,
	placeholder,
	type = "text",
}) => {
	return (
		<Input
			id={id}
			type={type}
			placeholder={placeholder}
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
};
