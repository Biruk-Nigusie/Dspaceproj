const DSPACE_API_URL = "/api/dspace";

// Cookie Helpers
export const setCookie = (name, value, days = 7) => {
	const expires = new Date(Date.now() + days * 864e5).toUTCString();
	document.cookie = `${name}=${encodeURIComponent(
		value,
	)}; expires=${expires}; path=/; SameSite=Lax`;
};

export const getCookie = (name) => {
	const nameEQ = `${name}=`;
	const ca = document.cookie.split(";");
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === " ") c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0)
			return decodeURIComponent(c.substring(nameEQ.length, c.length));
	}
	return null;
};

export const deleteCookie = (name) => {
	const hostname = window.location.hostname;
	const paths = ["/"];
	const domains = [hostname, `.${hostname}`, ""];

	for (const path of paths) {
		for (const domain of domains) {
			const domainPart = domain ? `; domain=${domain}` : "";
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domainPart};`;
		}
	}
};

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
				} catch {}
			}

			await new Promise((resolve) => setTimeout(resolve, 200));

			const token =
				getCookie("DSPACE-XSRF-COOKIE") ||
				getCookie("XSRF-TOKEN") ||
				getCookie("DSPACE-XSRF-TOKEN");
			if (token) {
				this.csrfToken = token;
				return true;
			}

			try {
				const body = await response.json();
				if (body.token || body.csrfToken || body.xsrfToken) {
					this.csrfToken = body.token || body.csrfToken || body.xsrfToken;
					return true;
				}
			} catch {}

			return false;
		} catch {
			return false;
		}
	}

	getCsrfHeaders(additionalHeaders = {}) {
		const headers = { ...additionalHeaders };
		if (this.csrfToken) {
			headers["X-XSRF-TOKEN"] = this.csrfToken;
		}

		const token = this.getStoredToken();
		if (token) {
			headers.Authorization = token.startsWith("Bearer ")
				? token
				: `Bearer ${token}`;
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

			const newToken =
				response.headers.get("DSPACE-XSRF-TOKEN") ||
				response.headers.get("XSRF-TOKEN") ||
				response.headers.get("X-XSRF-TOKEN");
			if (newToken) {
				this.csrfToken = newToken;
			}

			const authHeader =
				response.headers.get("Authorization") ||
				response.headers.get("authorization");
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
			const token = getCookie("dspaceAuthToken");
			if (token) return token;

			const m = document.cookie.match(/(?:^|;\s*)dsAuthInfo=([^;]+)/);
			if (m) {
				const decoded = decodeURIComponent(m[1]);
				if (decoded.startsWith("{")) {
					const obj = JSON.parse(decoded);
					if (obj?.accessToken) return obj.accessToken;
				}
				return decoded;
			}
		} catch {}
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
			const baseHeaders = this.getCsrfHeaders({
				"Content-Type": "application/json-patch+json",
				Accept: "application/json",
			});

			const FIELD_SECTION_MAP = {
				"crvs.family.count": "traditionalpagetwo",
				"dc.description": "traditionalpagetwo",
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

			const response = await fetch(
				`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
				{
					method: "POST",
					credentials: "include",
					headers: headers,
					body: formData,
				},
			);

			if (response.ok) {
				const data = await response.json();

				// In DSpace 9, the response is the WorkspaceItem.
				// The bitstream info is inside sections.upload.files
				const files = data.sections?.upload?.files;
				if (files && files.length > 0) {
					// The most recently uploaded file is usually the last one
					const latestFile = files[files.length - 1];
					return latestFile;
				}
				return data;
			} else {
				const errorText = await response.text().catch(() => "No error body");
				console.error(
					`Upload failed with status ${response.status}:`,
					errorText,
				);
			}
			return null;
		} catch {
			return false;
		}
	}

	async updateBitstreamMetadata(bitstreamUuid, metadata) {
		try {
			const headers = this.getCsrfHeaders({
				"Content-Type": "application/json-patch+json",
				Accept: "application/json",
			});

			// Standard DSpace 7/8/9 BITSTREAM metadata update via PATCH
			const patch = [];
			if (metadata.documentType) {
				patch.push({
					op: "add",
					path: "/metadata/crvs.documentType",
					value: [
						{
							value: metadata.documentType,
							language: null,
							authority: null,
							confidence: -1,
						},
					],
				});
			}
			if (metadata.documentStatus) {
				patch.push({
					op: "add",
					path: "/metadata/crvs.document.status",
					value: [
						{
							value: metadata.documentStatus,
							language: null,
							authority: null,
							confidence: -1,
						},
					],
				});
			}

			if (patch.length === 0) return true;

			const url = `${DSPACE_API_URL}/core/bitstreams/${bitstreamUuid}`;

			const response = await fetch(url, {
				method: "PATCH",
				credentials: "include",
				headers: headers,
				body: JSON.stringify(patch),
			});

			if (!response.ok) {
				console.error(
					`Failed to update bitstream metadata: ${response.status}`,
				);
			}
			return response.ok;
		} catch (error) {
			console.error("Error updating bitstream metadata:", error);
			return false;
		}
	}

	async acceptWorkspaceLicense(workspaceItemId) {
		try {
			const headers = this.getCsrfHeaders({
				"Content-Type": "application/json-patch+json",
				Accept: "application/json",
			});

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

			if (response.ok || response.status === 201 || response.status === 202) {
				return await response.json().catch(() => ({ id: workspaceItemId }));
			}
			throw new Error(`Submission failed: ${response.status}`);
		} catch (error) {
			throw error;
		}
	}

	async searchItems(filters = {}, page = 0, size = 10) {
		try {
			const params = new URLSearchParams({
				page: String(page),
				size: String(size),
				dsoType: "item",
				embed: "bundles,owningCollection/parentCommunity",
			});

			Object.entries(filters).forEach(([key, filter]) => {
				if (filter?.value) {
					const value = filter.value;
					const operator = filter.operator || "contains";
					params.append(`f.${key}`, `${value},${operator}`);
				}
			});

			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const url = `${DSPACE_API_URL}/discover/search/objects?${params}`;
			const response = await fetch(url, {
				credentials: "include",
				headers: headers,
			});

			if (response.ok) {
				const data = await response.json();
				return {
					objects: data?._embedded?.searchResult?._embedded?.objects || [],
					page: data?._embedded?.searchResult?.page || {
						number: 0,
						size: size,
						totalPages: 1,
						totalElements: 0,
					},
				};
			}
			return {
				objects: [],
				page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
			};
		} catch {
			return {
				objects: [],
				page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
			};
		}
	}

	async getMySubmissions(userUuid) {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
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
		} catch {
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

	async getBitstreams(bundleId) {
		try {
			const headers = this.getCsrfHeaders({ Accept: "application/json" });
			const [primaryRes, bundledRes] = await Promise.all([
				fetch(`${DSPACE_API_URL}/core/bundles/${bundleId}/primaryBitstream`, {
					credentials: "include",
					headers: headers,
				}),
				fetch(`${DSPACE_API_URL}/core/bundles/${bundleId}/bitstreams`, {
					credentials: "include",
					headers: headers,
				}),
			]);

			const primaryBitstream =
				primaryRes.ok && primaryRes.status !== 204
					? await primaryRes.json()
					: null;
			const bundledBitstreams = bundledRes.ok ? await bundledRes.json() : null;
			return { primaryBitstream, bundledBitstreams };
		} catch {
			return null;
		}
	}
}

export default new DSpaceService();
