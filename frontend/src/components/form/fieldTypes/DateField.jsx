export default function DateField({ field, value, onChange }) {
	return (
		<input
			id={field.label}
			type="date"
			className="mt-1 block w-full p-2 border border-border rounded-md"
			value={value}
			required={field.mandatory}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}
