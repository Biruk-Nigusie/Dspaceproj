from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout, authenticate
from django.views.decorators.csrf import csrf_exempt
from .models import User, UserProfile
from resources.universal_auth import UniversalAuthService

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    data = request.data
    if data['password'] != data['confirm_password']:
        return Response({'error': "Passwords don't match"}, status=400)
    
    # Check if user already exists
    if User.objects.filter(username=data['username']).exists():
        return Response({'error': 'Username already exists'}, status=400)
    if User.objects.filter(email=data['email']).exists():
        return Response({'error': 'Email already exists'}, status=400)
    
    try:
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            password=data['password']
        )
        UserProfile.objects.create(user=user)
        return Response({'message': 'User created successfully'}, status=201)
    except Exception as e:
        return Response({'error': 'Registration failed'}, status=400)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    # Try to find user by email
    try:
        user_obj = User.objects.get(email=email)
        user = authenticate(username=user_obj.username, password=password)
    except User.DoesNotExist:
        user = None
    
    if user and user.is_active:
        token, created = Token.objects.get_or_create(user=user)
        
        # Create universal session
        universal_auth = UniversalAuthService()
        universal_session = universal_auth.create_universal_session(user)
        
        return Response({
            'message': 'Login successful',
            'token': token.key,
            'universal_token': universal_session['universal_token'],
            'system_status': universal_session['system_status'],
            'redirect_to': '/admin-choice' if user.is_staff else '/',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_staff': user.is_staff
            }
        })
    return Response({'error': 'Invalid credentials'}, status=400)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    if hasattr(request.user, 'auth_token'):
        request.user.auth_token.delete()
    logout(request)
    return Response({'message': 'Logout successful'})

@api_view(['GET'])
@permission_classes([AllowAny])
def profile(request):
    if request.user.is_authenticated:
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'role': request.user.role
        })
    return Response({'error': 'Not authenticated'}, status=401)