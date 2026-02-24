import { LogIn } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";

export default function SignIn() {
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const { login } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await login(formData.email, formData.password);
			if (result?.success) {
				// Successfully logged in, navigate to home
				navigate("/");
			} else {
				throw new Error("Login failed");
			}
		} catch (err) {
			setError(
				err.message || "Failed to sign in. Please check your credentials.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<Card className="max-w-md w-full">
				<CardHeader>
					<div>
						<div className="mx-auto size-12 bg-primary rounded-full flex items-center justify-center">
							<LogIn className="size-6 text-primary-foreground" />
						</div>
						<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
							Sign in to your account
						</h2>
					</div>
				</CardHeader>
				<CardContent>
					<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
						{error && (
							<div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm text-center">
								{error}
							</div>
						)}
						<div className="rounded-md shadow-sm -space-y-px">
							<div>
								<Input
									id="email-address"
									name="email"
									type="email"
									autoComplete="email"
									className="rounded-t rounded-b-none h-10 text-lg"
									required
									placeholder="Email address or Username"
									value={formData.email}
									onChange={(e) =>
										setFormData({ ...formData, email: e.target.value })
									}
								/>
							</div>
							<div>
								<Input
									id="password"
									name="password"
									type="password"
									autoComplete="current-password"
									required
									className="rounded-t-none rounded-b h-10 text-lg"
									placeholder="Password"
									value={formData.password}
									onChange={(e) =>
										setFormData({ ...formData, password: e.target.value })
									}
								/>
							</div>
						</div>

						<div>
							<Button
								type="submit"
								disabled={loading}
								className="w-full py-4"
								size="lg"
							>
								{loading ? "Signing in..." : "Sign in"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
