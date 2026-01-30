import requests
from datetime import datetime, timedelta

class UniversalAuthService:
    """Universal authentication service for Koha, DSpace, and VuFind"""
    
    def __init__(self):
        self.koha_client_id = "0d7136be-4bee-4086-b36a-22f1d89600a0"
        self.koha_client_secret = "d022ced0-f36f-41bd-8f47-a9a367c451ca"
        self.dspace_email = "dspace@example.com"
        self.dspace_password = "dspace"
        
        self.tokens = {}
    
    def authenticate_all_systems(self, user_credentials=None):
        """Authenticate with all external systems"""
        results = {
            'koha': self.authenticate_koha(),
            'dspace': self.authenticate_dspace(),
            'vufind': self.test_vufind_connection()
        }
        
        # Store tokens for user session
        if user_credentials:
            self.tokens[user_credentials.get('user_id')] = {
                'koha_token': results['koha'].get('token'),
                'dspace_token': results['dspace'].get('token'),
                'expires_at': datetime.now() + timedelta(hours=1)
            }
        
        return results
    
    def authenticate_koha(self):
        """Get Koha OAuth2 token"""
        try:
            response = requests.post(
                "http://127.0.0.1:8085/api/v1/oauth/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.koha_client_id,
                    "client_secret": self.koha_client_secret
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                return {
                    'success': True,
                    'token': token_data.get('access_token'),
                    'expires_in': token_data.get('expires_in', 3600)
                }
            
            return {'success': False, 'error': f"HTTP {response.status_code}"}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def authenticate_dspace(self):
        """Get DSpace JWT token"""
        try:
            response = requests.post(
                "http://localhost:8080/server/api/authn/login",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "user": self.dspace_email,
                    "password": self.dspace_password
                }
            )
            
            if response.status_code == 200:
                # DSpace returns JWT in Authorization header
                auth_header = response.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header[7:]
                    return {
                        'success': True,
                        'token': token,
                        'expires_in': 3600
                    }
            
            return {'success': False, 'error': f"HTTP {response.status_code}"}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_vufind_connection(self):
        """Test VuFind connection"""
        try:
            response = requests.get("http://localhost:8090/api/v1/search", timeout=5)
            return {
                'success': response.status_code == 200,
                'status': 'online' if response.status_code == 200 else 'offline'
            }
        except:
            return {'success': False, 'status': 'offline'}
    
    def get_user_tokens(self, user_id):
        """Get stored tokens for user"""
        user_tokens = self.tokens.get(user_id)
        
        if not user_tokens:
            return None
        
        # Check if tokens expired
        if datetime.now() > user_tokens['expires_at']:
            del self.tokens[user_id]
            return None
        
        return user_tokens
    
    def refresh_tokens(self, user_id):
        """Refresh expired tokens"""
        # Remove old tokens
        if user_id in self.tokens:
            del self.tokens[user_id]
        
        # Get new tokens
        return self.authenticate_all_systems({'user_id': user_id})
    
    def create_universal_session(self, django_user):
        """Create universal session for user across all systems"""
        user_data = {
            'user_id': django_user.id,
            'username': django_user.username,
            'email': django_user.email,
            'is_staff': django_user.is_staff
        }
        
        # Authenticate with all systems
        auth_results = self.authenticate_all_systems(user_data)
        
        # Create universal session data
        universal_token = f"universal_{django_user.id}_{int(datetime.now().timestamp())}"
        
        return {
            'universal_token': universal_token,
            'system_status': {
                'koha': 'online' if auth_results['koha']['success'] else 'offline',
                'dspace': 'online' if auth_results['dspace']['success'] else 'offline', 
                'vufind': 'online' if auth_results['vufind']['success'] else 'offline'
            }
        }