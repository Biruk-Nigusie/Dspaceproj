import axios from "axios";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import dspaceService, {
	deleteCookie,
	getCookie,
	setCookie,
} from "../services/dspaceService";

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
	const [user, setUser] = useState(() => {
		try {
			const savedUser = getCookie("dspaceUser");
			return savedUser ? JSON.parse(savedUser) : null;
		} catch {
			return null;
		}
	});
	const [loading, setLoading] = useState(!user);

	const deleteAuthCookies = useCallback(() => {
		[
			"DSPACE-XSRF-COOKIE",
			"DSPACE-XSRF-TOKEN",
			"csrftoken",
			"sessionid",
			"dsAuthInfo",
			"dspaceAuthToken",
			"djangoToken",
			"dspaceUser",
		].forEach(deleteCookie);
	}, []);

	const checkAuth = useCallback(async () => {
		try {
			const storedToken = getCookie("dspaceAuthToken");
			if (storedToken) {
				// Also update service state
				dspaceService.authToken = storedToken;
				dspaceService.isAuthenticated = true;

				const status = await dspaceService.checkAuthStatus();
				if (status.authenticated) {
					const userInfo = {
						username: status.email || "User",
						authenticated: true,
						id: status.id || status.uuid,
						...status,
					};
					setUser(userInfo);
					setCookie("dspaceUser", JSON.stringify(userInfo));
				} else {
					deleteAuthCookies();
					setUser(null);
				}
			} else {
				setUser(null);
				deleteCookie("dspaceUser");
			}
		} catch (error) {
			console.error("Auth check failed", error);
			deleteAuthCookies();
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, [deleteAuthCookies]);

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	const login = async (email, password) => {
		try {
			// 1. Login to DSpace
			const result = await dspaceService.login(email, password);

			if (
				result.authenticated ||
				result === true ||
				dspaceService.isAuthenticated
			) {
				// Store the DSpace auth token in cookie
				if (dspaceService.authToken) {
					setCookie("dspaceAuthToken", dspaceService.authToken);
				}

				// 2. ALSO Login to our Django Backend to get a local token for cataloging/uploading
				try {
					const djangoResponse = await axios.post("/api/auth/login/", {
						email: email,
						password: password,
					});

					if (djangoResponse.data?.token) {
						setCookie("djangoToken", djangoResponse.data.token);
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
				setCookie("dspaceUser", JSON.stringify(userInfo));

				return { success: true };
			} else {
				throw new Error("Login failed");
			}
		} catch (error) {
			console.error("Login error:", error);
			throw error;
		}
	};

	const logout = async () => {
		try {
			await dspaceService.logout();
			deleteAuthCookies();
			setUser(null);
		} catch (error) {
			console.error("Logout error:", error);
			deleteAuthCookies();
			setUser(null);
		}
	};

	const value = {
		user,
		token: dspaceService.authToken || getCookie("dspaceAuthToken"),
		djangoToken: getCookie("djangoToken"),
		login,
		logout,
		loading,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
