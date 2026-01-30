#!/usr/bin/env python3
from dspace_client import create_authenticated_client

def test_login():
    """Test DSpace login with current credentials"""
    print("=== TESTING DSPACE LOGIN ===")
    
    # Try to create authenticated client
    c = create_authenticated_client()
    
    if c:
        print("✅ Login successful!")
        print(f"Base URL: {c.base_url}")
        print(f"Logged in: {c.logged_in}")
        print(f"CSRF Token: {c.csrf_token}")
        print(f"Auth Token: {c.auth_token[:50]}..." if c.auth_token else "No auth token")
        
        # Test a simple API call
        try:
            response = c.session.get(f"{c.base_url}/core/collections", 
                                   headers=c._get_csrf_headers({"Accept": "application/json"}))
            print(f"API Test: {response.status_code} - {'✅ Working' if response.status_code == 200 else '❌ Failed'}")
        except Exception as e:
            print(f"API Test: ❌ Error - {e}")
        
        return True
    else:
        print("❌ Login failed!")
        return False

if __name__ == "__main__":
    test_login()