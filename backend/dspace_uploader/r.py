#!/usr/bin/env python3
import requests
import json
from config import DSPACE_URL

def create_user():
    """Create a new DSpace user (requires admin login)"""
    print("=== CREATING DSPACE USER ===")
    
    base_url = f"{DSPACE_URL}/server"
    
    # User data
    user_data = {
        "email": "biruknigusie98@gmail.com",
        "firstName": "Biruk",
        "lastName": "Nigusie",
        "password": "Biruk@0115439",
        "canLogIn": True,
        "requireCertificate": False
    }
    
    try:
        session = requests.Session()
        
        # Get CSRF token
        csrf_response = session.get(f"{base_url}/api/security/csrf")
        csrf_token = csrf_response.headers.get('DSPACE-XSRF-TOKEN')
        
        if not csrf_token:
            print("❌ Failed to get CSRF token")
            return False
        
        print(f"✓ Got CSRF token: {csrf_token}")
        
        # Login as admin first
        admin_login = {
            'user': 'biruk11011@gmail.com',  # Use existing admin account
            'password': 'Biruk@0115439'
        }
        
        login_headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'X-XSRF-TOKEN': csrf_token,
            'DSPACE-XSRF-TOKEN': csrf_token
        }
        
        login_response = session.post(
            f"{base_url}/api/authn/login",
            data=admin_login,
            headers=login_headers
        )
        
        if login_response.status_code != 200:
            print(f"❌ Admin login failed: {login_response.status_code}")
            return False
            
        print("✓ Admin login successful")
        
        # Update CSRF token from login response
        new_csrf = login_response.headers.get('DSPACE-XSRF-TOKEN')
        if new_csrf:
            csrf_token = new_csrf
        
        # Get auth token
        auth_token = login_response.headers.get('Authorization')
        
        # Create user with admin privileges
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-XSRF-TOKEN': csrf_token,
            'DSPACE-XSRF-TOKEN': csrf_token,
            'Authorization': auth_token
        }
        
        response = session.post(
            f"{base_url}/api/eperson/epersons",
            json=user_data,
            headers=headers
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response body: {response.text}")
        
        if response.status_code in [200, 201]:
            user_info = response.json()
            print(f"✅ User created successfully!")
            print(f"User ID: {user_info.get('id', 'N/A')}")
            print(f"Email: {user_info.get('email', 'N/A')}")
            print(f"Name: {user_info.get('firstName', '')} {user_info.get('lastName', '')}")
            return True
        else:
            print(f"❌ Failed to create user: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return False

if __name__ == "__main__":
    create_user()