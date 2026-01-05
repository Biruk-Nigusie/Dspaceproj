import DSPACE_API_URL from "./utils/endpoints"

class DSpaceService {
  constructor() {
    this.isAuthenticated = false;
    this.authToken = null;
  }

  async login(username, password) {
    try {
      const body = `password=${encodeURIComponent(password)}&email=${encodeURIComponent(username)}`;
      
      const response = await fetch(`${DSPACE_API_URL}/authn/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: body,
        credentials: 'include'
      });
      
      if (response.ok) {
        const authStatus = await response.json();
        this.isAuthenticated = authStatus.authenticated;
        return authStatus;
      }
      throw new Error(`Login failed: ${response.status}`);
    } catch (error) {
      console.error('DSpace login error:', error);
      throw error;
    }
  }

  async checkAuthStatus() {
    try {
      const response = await fetch(`${DSPACE_API_URL}/authn/status`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.isAuthenticated = data.authenticated;
        return data;
      }
      return { authenticated: false };
    } catch (error) {
      console.error('Auth check error:', error);
      return { authenticated: false };
    }
  }

  async getCollections() {
    try {
      const response = await fetch(`${DSPACE_API_URL}/core/collections`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data._embedded?.collections || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching collections:', error);
      return [];
    }
  }

  async createWorkspaceItem(collectionId) {
    try {
      const response = await fetch(`${DSPACE_API_URL}/submission/workspaceitems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          collection: `${DSPACE_API_URL}/core/collections/${collectionId}`
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create workspace item: ${response.status}`);
    } catch (error) {
      console.error('Error creating workspace item:', error);
      throw error;
    }
  }

  async updateMetadata(workspaceItemId, metadata) {
    const metadataUpdates = [];
    
    if (metadata.title) {
      metadataUpdates.push({
        op: 'add',
        path: '/sections/traditionalpageone/dc.title/0',
        value: { value: metadata.title }
      });
    }
    
    if (metadata.authors) {
      metadataUpdates.push({
        op: 'add',
        path: '/sections/traditionalpageone/dc.contributor.author/0',
        value: { value: metadata.authors }
      });
    }
    
    if (metadata.description) {
      metadataUpdates.push({
        op: 'add',
        path: '/sections/traditionalpageone/dc.description.abstract/0',
        value: { value: metadata.description }
      });
    }

    if (metadataUpdates.length === 0) return;

    try {
      const response = await fetch(`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(metadataUpdates)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error updating metadata:', error);
      return false;
    }
  }

  async uploadFile(workspaceItemId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}/sections/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error uploading file:', error);
      return false;
    }
  }

  async getWorkspaceItems() {
    try {
      const response = await fetch(`${DSPACE_API_URL}/submission/workspaceitems?size=10`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data._embedded?.workspaceitems || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching workspace items:', error);
      return [];
    }
  }

  async logout() {
    try {
      await fetch(`${DSPACE_API_URL}/authn/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.isAuthenticated = false;
      this.authToken = null;
    }
  }
}

export default new DSpaceService();