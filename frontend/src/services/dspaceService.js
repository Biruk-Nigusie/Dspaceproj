const DSPACE_API_URL = "/api/dspace";

class DSpaceService {
	constructor() {
		this.isAuthenticated = false;
		this.authToken = null;
		this.csrfToken = null;
	}

	async getCsrfToken() {
		try {
			const response = await fetch(`${DSPACE_API_URL}/security/csrf`, {
				method: "GET",
				credentials: "include",
				headers: { Accept: "application/json" },
			});

			if (response.status !== 200 && response.status !== 204) {
				return false;
			}

			const headerNames = [
				"DSPACE-XSRF-TOKEN",
				"XSRF-TOKEN",
				"X-XSRF-TOKEN",
				"dspace-xsrf-token",
				"xsrf-token",
				"x-xsrf-token",
			];

			for (const headerName of headerNames) {
				try {
					const token = response.headers.get(headerName);
					if (token) {
						this.csrfToken = token;
						return true;
					}
				} catch (e) {}
			}

			await new Promise((resolve) => setTimeout(resolve, 200));

			const cookies = document.cookie.split(";");
			for (const cookie of cookies) {
				const [name, value] = cookie.trim().split("=");
				if (
					name === "DSPACE-XSRF-COOKIE" ||
					name === "XSRF-TOKEN" ||
					name === "DSPACE-XSRF-TOKEN"
				) {
					this.csrfToken = decodeURIComponent(value);
					return true;
				}
			}

			try {
				const body = await response.json();
				if (body.token || body.csrfToken || body.xsrfToken) {
					this.csrfToken = body.token || body.csrfToken || body.xsrfToken;
					return true;
				}
			} catch (e) {}

			return false;
		} catch (error) {
			return false;
		}
	}

	getCsrfHeaders(additionalHeaders = {}) {
		const headers = { ...additionalHeaders };
		if (this.csrfToken) {
			headers["X-XSRF-TOKEN"] = this.csrfToken;
			// headers["DSPACE-XSRF-TOKEN"] = this.csrfToken;
		}
		return headers;
	}

	async login(username, password) {
		try {
			if (!(await this.getCsrfToken())) {
				throw new Error("Failed to get CSRF token.");
			}

			const formData = new URLSearchParams();
			formData.append("user", username);
			formData.append("password", password);

			const headers = this.getCsrfHeaders({
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			});

			const response = await fetch(`${DSPACE_API_URL}/authn/login`, {
				method: "POST",
				headers: headers,
				body: formData.toString(),
				credentials: "include",
			});
			console.log("🚀 ~ DSpaceService ~ login ~ response:", response);

			const newToken =
				response.headers.get("DSPACE-XSRF-TOKEN") ||
				response.headers.get("XSRF-TOKEN") ||
				response.headers.get("X-XSRF-TOKEN");
			console.log("🚀 ~ DSpaceService ~ login ~ newToken:", newToken);
			if (newToken) {
				this.csrfToken = newToken;
			}

			const authHeader =
				response.headers.get("Authorization") ||
				response.headers.get("authorization");
			console.log("🚀 ~ DSpaceService ~ login ~ authHeader:", authHeader);
			if (authHeader) {
				this.authToken = authHeader;
			}

			if (response.status === 200) {
				this.isAuthenticated = true;
				return await response.json().catch(() => ({ authenticated: true }));
			}

			if (response.status === 401) {
				throw new Error("Invalid email or password.");
			}

			throw new Error(`Login failed: ${response.status}`);
		} catch (error) {
			console.error("DSpace login error:", error);
			this.isAuthenticated = false;
			throw error;
		}
	}

	async checkAuthStatus() {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const response = await fetch(`${DSPACE_API_URL}/authn/status`, {
				credentials: "include",
				headers: headers,
			});

			if (response.ok) {
				const data = await response.json();
				this.isAuthenticated = data.authenticated;
				return data;
			}
			return { authenticated: false };
		} catch {
			return { authenticated: false };
		}
	}

	async getCollections() {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const response = await fetch(`${DSPACE_API_URL}/core/collections`, {
				credentials: "include",
				headers: headers,
			});

			if (response.ok) {
				const data = await response.json();
				return data._embedded?.collections || [];
			}
			return [];
		} catch {
			return [];
		}
	}

	async getOwningCollection(url) {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}
			const response = await fetch(`${DSPACE_API_URL}${url}`, {
				credentials: "include",
				headers: headers,
			});

			if (response.ok) {
				const data = await response.json();
				return data;
			}
			return [];
		} catch {
			return [];
		}
	}

	async getParentCommunity(url) {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}
			const response = await fetch(`${DSPACE_API_URL}${url}`, {
				credentials: "include",
				headers: headers,
			});

			if (response.ok) {
				const data = await response.json();
				return data;
			}
			return [];
		} catch {
			return [];
		}
	}

	async getSubmitAuthorizedCollections(page = 0, size = 20) {
		try {
			const headers = this.getCsrfHeaders({
				Accept: "application/json",
				"Content-Type": "application/json",
			});
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}
			const response = await fetch(
				`${DSPACE_API_URL}/core/collections/search/findSubmitAuthorized?page=${page}&size=${size}&query=&embed=parentCommunity`,
				{
					headers: headers,
					credentials: "include",
				},
			);

			if (response.ok) {
				const data = await response.json();
				return {
					collections: data._embedded?.collections || [],
					page: data.page || {
						number: 0,
						size: size,
						totalPages: 1,
						totalElements: 0,
					},
				};
			}
			return {
				collections: [],
				page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
			};
		} catch {
			return {
				collections: [],
				page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
			};
		}
	}

	getStoredToken() {
		if (this.authToken) return this.authToken;
		try {
			const raw = localStorage.getItem("dsAuthInfo");
			if (raw) {
				const obj = JSON.parse(raw);
				if (obj?.accessToken) return obj.accessToken;
			}
		} catch (e) {}
		try {
			const m = document.cookie.match(/(?:^|;\s*)dsAuthInfo=([^;]+)/);
			if (m) {
				const decoded = decodeURIComponent(m[1]);
				const obj = JSON.parse(decoded);
				if (obj?.accessToken) return obj.accessToken;
			}
		} catch (e) {}
		return null;
	}

	buildMetadataListFromForm(metadata) {
		const out = [];
		const add = (key, raw) => {
			if (!raw) return;
			const vals = Array.isArray(raw) ? raw : [raw];
			for (const v of vals) {
				const value = String(v).trim();
				if (!value) continue;
				out.push({ key, value, language: null });
			}
		};
		const author = metadata.author || "";
		const dateIssued = metadata.dateIssued || metadata.publicationDate || "";

		add("dc.title", metadata.title);
		add("dc.contributor.author", author);
		add("dc.title.alternative", metadata.otherTitles);
		add("dc.subject", metadata.subjectKeywords);
		add("dc.description.abstract", metadata.abstract || metadata.description);
		add("dc.description.sponsorship", metadata.sponsors);
		add("dc.description", metadata.customField);
		add("dc.publisher", metadata.publisher);
		add("dc.identifier.citation", metadata.citation);
		add("dc.relation.ispartofseries", metadata.series);
		add("dc.identifier.other", metadata.reportNo);
		add("dc.date.issued", dateIssued);
		add("dc.language", metadata.language);
		add("dc.identifier.isbn", metadata.isbn);
		add("dc.identifier.issn", metadata.issn);
		add("dc.rights", metadata.rights);
		add("dc.identifier.uri", metadata.uri);
		add("dc.type", metadata.type);

		return out;
	}

	async createItem(collectionId, metadata) {
		const headers = this.getCsrfHeaders({
			Accept: "application/json",
			"Content-Type": "application/json",
		});

		const token = this.getStoredToken();
		if (token) {
			headers.Authorization = token.startsWith("Bearer ")
				? token
				: `Bearer ${token}`;
		}

		const metadataList = this.buildMetadataListFromForm(metadata || {});
		if (!metadataList.length) {
			throw new Error("No metadata provided.");
		}

		const url1 = `${DSPACE_API_URL}/core/collections/${collectionId}/items`;
		const res1 = await fetch(url1, {
			method: "POST",
			headers,
			credentials: "include",
			body: JSON.stringify({ metadata: metadataList }),
		});

		if (res1.ok || res1.status === 201) {
			return await res1.json();
		}

		if (res1.status === 404 || res1.status === 405) {
			const url2 = `${DSPACE_API_URL}/core/items`;
			const res2 = await fetch(url2, {
				method: "POST",
				headers,
				credentials: "include",
				body: JSON.stringify({
					metadata: metadataList,
					owningCollection: { uuid: collectionId },
				}),
			});

			if (res2.ok || res2.status === 201) {
				return await res2.json();
			}
		}

		throw new Error(`Failed to create item: ${res1.status}`);
	}

	async createWorkspaceItem(collectionId) {
		try {
			const headers = this.getCsrfHeaders({
				Accept: "application/json",
				"Content-Type": "application/json",
			});

			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}

			const response = await fetch(
				`${DSPACE_API_URL}/submission/workspaceitems?owningCollection=${collectionId}`,
				{
					method: "POST",
					headers: headers,
					credentials: "include",
				},
			);

			if (response.ok || response.status === 201) {
				return await response.json();
			}
			throw new Error(`Workspace item creation failed: ${response.status}`);
		} catch (error) {
			throw error;
		}
	}

	async updateMetadata(workspaceItemId, metadataFields) {
		const metadataUpdates = [];

		for (const [field, raw] of Object.entries(metadataFields)) {
			if (!raw) continue;
			const vals = Array.isArray(raw) ? raw : [raw];
			const cleaned = vals.map((v) => String(v).trim()).filter(Boolean);

			if (cleaned.length > 0) {
				metadataUpdates.push({
					op: "add",
					path: `/sections/traditionalpageone/${field}`,
					value: cleaned.map((v) => ({ value: v })),
				});
			}
		}

		if (metadataUpdates.length === 0) return true;

		try {
			const token = this.getStoredToken();
			const baseHeaders = this.getCsrfHeaders({
				"Content-Type": "application/json-patch+json",
				Accept: "application/json",
			});
			if (token) {
				baseHeaders.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}

			const FIELD_SECTION_MAP = {
				"crvs.family.count": "traditionalpagetwo",
				"crvs.description.summary": "traditionalpagetwo",
			};

			const batch = metadataUpdates.map((p) => {
				const fieldName = p.path.split("/").pop();
				let actualField = fieldName;
				if (fieldName === "dc.language") actualField = "dc.language.iso";
				const section = FIELD_SECTION_MAP[actualField] || "traditionalpageone";
				return { ...p, path: `/sections/${section}/${actualField}` };
			});

			await fetch(
				`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
				{
					method: "PATCH",
					headers: baseHeaders,
					credentials: "include",
					body: JSON.stringify(batch),
				},
			).catch(() => {});

			return true;
		} catch {
			return true;
		}
	}

	async uploadFile(workspaceItemId, file) {
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("name", file.name);

			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}

			const response = await fetch(
				`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
				{
					method: "POST",
					credentials: "include",
					headers: headers,
					body: formData,
				},
			);

			return response.ok;
		} catch {
			return false;
		}
	}

	async acceptWorkspaceLicense(workspaceItemId) {
		try {
			const headers = this.getCsrfHeaders({
				"Content-Type": "application/json-patch+json",
				Accept: "application/json",
			});
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}

			const response = await fetch(
				`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
				{
					method: "PATCH",
					credentials: "include",
					headers: headers,
					body: JSON.stringify([
						{ op: "replace", path: "/sections/license/granted", value: true },
					]),
				},
			);

			return response.ok;
		} catch {
			return false;
		}
	}

	async submitWorkspaceItem(workspaceItemId) {
		try {
			const headers = this.getCsrfHeaders({
				Accept: "application/json",
				"Content-Type": "text/uri-list",
			});
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}

			const id =
				typeof workspaceItemId === "object"
					? workspaceItemId.id || workspaceItemId.uuid
					: workspaceItemId;
			const workspaceUri = `${window.location.protocol}//${window.location.host}/server/api/submission/workspaceitems/${id}`;

			const response = await fetch(`${DSPACE_API_URL}/workflow/workflowitems`, {
				method: "POST",
				credentials: "include",
				headers: headers,
				body: workspaceUri,
			});
			console.log(
				"🚀 ~ DSpaceService ~ submitWorkspaceItem ~ response:",
				response,
			);

			if (response.ok || response.status === 201 || response.status === 202) {
				return await response.json().catch(() => ({ id: workspaceItemId }));
			}
			throw new Error(`Submission failed: ${response.status}`);
		} catch (error) {
			throw error;
		}
	}

	async searchItems(query, limit = 100) {
		try {
			const params = new URLSearchParams({
				query: query || "*",
				page: "0",
				size: String(limit),
				dsoType: "item",
			});
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}
			const response = await fetch(
				`${DSPACE_API_URL}/discover/search/objects?${params}`,
				{
					credentials: "include",
					headers: headers,
				},
			);

			if (response.ok) {
				const data = await response.json();
				return data._embedded?.searchResult?._embedded?.objects || [];
			}
			return [];
		} catch {
			return [];
		}
	}

	async getMySubmissions(userUuid) {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}
			const response = await fetch(
				`${DSPACE_API_URL}/submission/workspaceitems/search/findBySubmitter?uuid=${userUuid}`,
				{
					credentials: "include",
					headers: headers,
				},
			);

			return response.ok ? await response.json() : null;
		} catch {
			return null;
		}
	}

	async getItem(itemId) {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const response = await fetch(`${DSPACE_API_URL}/core/items/${itemId}`, {
				credentials: "include",
				headers: headers,
			});
			return response.ok ? await response.json() : null;
		} catch (error) {
			return null;
		}
	}

	async logout() {
		try {
			const headers = this.getCsrfHeaders({
				"Content-Type": "application/x-www-form-urlencoded",
			});
			await fetch(`${DSPACE_API_URL}/authn/logout`, {
				method: "POST",
				credentials: "include",
				headers: headers,
			});
		} catch {
		} finally {
			this.isAuthenticated = false;
			this.authToken = null;
			this.csrfToken = null;
		}
	}

	async getSubmissionForms(formName) {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}
			const response = await fetch(
				`${DSPACE_API_URL}/config/submissionforms/${formName}`,
				{
					credentials: "include",
					headers: headers,
				},
			);
			return response.ok ? await response.json() : null;
		} catch {
			return null;
		}
	}

	async getVocabularies(vocab) {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const token = this.getStoredToken();
			if (token) {
				headers.Authorization = token.startsWith("Bearer ")
					? token
					: `Bearer ${token}`;
			}
			const response = await fetch(
				`${DSPACE_API_URL}/submission/vocabularies/${vocab}/entries`,
				{
					credentials: "include",
					headers: headers,
				},
			);
			return response.ok ? await response.json() : null;
		} catch {
			return null;
		}
	}
}

export default new DSpaceService();
