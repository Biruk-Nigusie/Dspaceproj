import { HomeIcon, LogInIcon, LogOutIcon, UploadIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const navLinks = [
	{ to: "/", label: "Home", icon: HomeIcon },
	{ to: "/editor", label: "Upload", icon: UploadIcon },
];

const Navbar = () => {
	const location = useLocation();
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	return (
		<nav className="bg-primary text-primary-foreground">
			<div className="container mx-auto flex items-center justify-between py-2">
				{/* Logo / Brand */}
				<Link to="/" className="flex flex-col leading-tight group">
					<img src="/images/crrsa-logo.jpg" alt="CRRSA logo" className="h-12" />
				</Link>

				{/* Navigation Links */}
				<ul className="flex items-center gap-1 mr-auto ml-auto">
					{navLinks.map(({ to, label, icon: Icon }) => {
						const isActive = location.pathname === to;
						return (
							<li key={to}>
								<Link
									to={to}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-out",
										isActive
											? "bg-primary-foreground/15 text-primary-foreground"
											: "hover:bg-primary-foreground/10 text-primary-foreground/80",
									)}
								>
									<Icon className="w-4 h-4" strokeWidth={1.8} />
									<span>{label}</span>
								</Link>
							</li>
						);
					})}
				</ul>

				{/* Buttons */}
				<div className="flex items-center gap-2">
					{user ? (
						<Button variant="secondary" onClick={logout}>
							<LogOutIcon />
							Log Out
						</Button>
					) : (
						<Button variant="secondary" onClick={() => navigate("/signin")}>
							<LogInIcon />
							Log In
						</Button>
					)}
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
