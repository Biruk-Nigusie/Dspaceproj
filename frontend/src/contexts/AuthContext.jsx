import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import dspaceService from "../services/dspaceService";

// Configure axios defaults
axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName = "X-CSRFToken";
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		checkAuth();
	}, []);

	const checkAuth = async () => {
		try {
			// Check if we have a stored auth token
			const storedToken = localStorage.getItem("dspaceAuthToken");
			if (storedToken) {
				dspaceService.authToken = storedToken;
				dspaceService.isAuthenticated = true;

				// Try to get auth status
				const status = await dspaceService.checkAuthStatus();
				if (status.authenticated) {
					const userInfo = {
						username: status.email || "User",
						authenticated: true,
						id: status.id || status.uuid,
						...status,
					};
					setUser(userInfo);
				} else {
					// Token might be expired
					localStorage.removeItem("dspaceAuthToken");
					setUser(null);
				}
			} else {
				setUser(null);
			}
		} catch (error) {
			console.error("Auth check failed", error);
			setUser(null);
			localStorage.removeItem("dspaceAuthToken");
		} finally {
			setLoading(false);
		}
	};

	const login = async (email, password) => {
		try {
			// 1. Login to DSpace
			const result = await dspaceService.login(email, password);

			if (
				result.authenticated ||
				result === true ||
				dspaceService.isAuthenticated
			) {
				// Store the DSpace auth token
				if (dspaceService.authToken) {
					localStorage.setItem("dspaceAuthToken", dspaceService.authToken);
				}

				// 2. ALSO Login to our Django Backend to get a local token for cataloging/uploading
				try {
					const djangoResponse = await axios.post("/api/auth/login/", {
						email: email,
						password: password,
					});

					if (djangoResponse.data?.token) {
						localStorage.setItem("djangoToken", djangoResponse.data.token);
					}
				} catch (djangoErr) {
					console.warn(
						"Django backend login failed, but DSpace succeeded:",
						djangoErr,
					);
					// We continue anyway as DSpace is the primary source
				}

				// Set user immediately after successful login
				const userInfo = {
					username: email.split("@")[0] || "User",
					email: email,
					authenticated: true,
				};
				setUser(userInfo);

				return { success: true };
			} else {
				throw new Error("Login failed");
			}
		} catch (error) {
			console.error("Login error:", error);
			throw error;
		}
	};

	const register = async (userData) => {
		console.warn("Registration not fully implemented for DSpace direct mode");
		return { success: false, message: "Use DSpace UI to register" };
	};

	const logout = async () => {
		try {
			await dspaceService.logout();
			localStorage.removeItem("dspaceAuthToken");
			localStorage.removeItem("djangoToken");
			setUser(null);
		} catch (error) {
			console.error("Logout error:", error);
			localStorage.removeItem("dspaceAuthToken");
			localStorage.removeItem("djangoToken");
			setUser(null);
		}
	};

	const value = {
		user,
		token: dspaceService.authToken || localStorage.getItem("dspaceAuthToken"),
		djangoToken: localStorage.getItem("djangoToken"),
		login,
		register,
		logout,
		loading,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
