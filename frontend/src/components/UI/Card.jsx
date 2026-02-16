export default function Card({ children, className = "", ...props }) {
	return (
		<div
			className={`bg-card rounded-lg border border-border shadow-sm p-6 h-fit ${className}`}
			{...props}
		>
			{children}
		</div>
	);
}
