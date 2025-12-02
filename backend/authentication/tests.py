from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User, UserRole


class RegistrationTests(APITestCase):
    """Tests for user registration endpoint."""

    def setUp(self):
        self.url = reverse('authentication:register')
        self.valid_data = {
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Test',
            'last_name': 'User',
        }

    def test_register_success(self):
        """Test successful user registration."""
        response = self.client.post(self.url, self.valid_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'newuser@example.com')
        self.assertEqual(response.data['user']['role'], UserRole.CANDIDATE)

        # Check user was created in database
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
        user = User.objects.get(email='newuser@example.com')
        self.assertEqual(user.role, UserRole.CANDIDATE)
        self.assertFalse(user.is_verified)

    def test_register_with_phone(self):
        """Test registration with optional phone number."""
        data = {**self.valid_data, 'phone': '+1234567890'}
        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='newuser@example.com')
        self.assertEqual(user.phone, '+1234567890')

    def test_register_duplicate_email(self):
        """Test registration fails with existing email."""
        User.objects.create_user(
            username='existing',
            email='newuser@example.com',
            password='password123'
        )

        response = self.client.post(self.url, self.valid_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_register_password_mismatch(self):
        """Test registration fails when passwords don't match."""
        data = {**self.valid_data, 'password_confirm': 'DifferentPass123!'}
        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)

    def test_register_weak_password(self):
        """Test registration fails with weak password."""
        data = {**self.valid_data, 'password': '123', 'password_confirm': '123'}
        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_required_fields(self):
        """Test registration fails without required fields."""
        required_fields = ['email', 'password', 'first_name', 'last_name']

        for field in required_fields:
            data = {**self.valid_data}
            del data[field]
            response = self.client.post(self.url, data, format='json')

            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
                f"Should fail without {field}"
            )

    def test_register_email_normalized(self):
        """Test email is normalized to lowercase."""
        data = {**self.valid_data, 'email': 'UPPER@EXAMPLE.COM'}
        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['email'], 'upper@example.com')

    def test_register_sets_auth_cookies(self):
        """Test registration sets httpOnly cookies."""
        response = self.client.post(self.url, self.valid_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)


class LoginTests(APITestCase):
    """Tests for user login endpoint."""

    def setUp(self):
        self.url = reverse('authentication:login')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User'
        )

    def test_login_success(self):
        """Test successful login."""
        response = self.client.post(self.url, {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'test@example.com')

    def test_login_invalid_password(self):
        """Test login fails with wrong password."""
        response = self.client.post(self.url, {
            'email': 'test@example.com',
            'password': 'WrongPassword!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_invalid_email(self):
        """Test login fails with non-existent email."""
        response = self.client.post(self.url, {
            'email': 'nonexistent@example.com',
            'password': 'SecurePass123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_user(self):
        """Test login fails for inactive user."""
        self.user.is_active = False
        self.user.save()

        response = self.client.post(self.url, {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_email_case_insensitive(self):
        """Test login works with different email case."""
        response = self.client.post(self.url, {
            'email': 'TEST@EXAMPLE.COM',
            'password': 'SecurePass123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_sets_auth_cookies(self):
        """Test login sets httpOnly cookies."""
        response = self.client.post(self.url, {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)


class LogoutTests(APITestCase):
    """Tests for user logout endpoint."""

    def setUp(self):
        self.url = reverse('authentication:logout')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User'
        )

    def test_logout_success(self):
        """Test successful logout."""
        # Login first
        login_response = self.client.post(reverse('authentication:login'), {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')

        # Use the access token for logout
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        response = self.client.post(self.url, {
            'refresh': login_response.data['refresh']
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Logout successful')

    def test_logout_clears_cookies(self):
        """Test logout clears auth cookies."""
        # Login first
        login_response = self.client.post(reverse('authentication:login'), {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        response = self.client.post(self.url, {
            'refresh': login_response.data['refresh']
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Cookies should be cleared (set to empty with past expiration)
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)

    def test_logout_requires_auth(self):
        """Test logout requires authentication."""
        response = self.client.post(self.url, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenRefreshTests(APITestCase):
    """Tests for token refresh endpoint."""

    def setUp(self):
        self.url = reverse('authentication:token_refresh')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User'
        )

    def test_token_refresh_success(self):
        """Test successful token refresh."""
        # Login first
        login_response = self.client.post(reverse('authentication:login'), {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')

        response = self.client.post(self.url, {
            'refresh': login_response.data['refresh']
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_token_refresh_invalid_token(self):
        """Test refresh fails with invalid token."""
        response = self.client.post(self.url, {
            'refresh': 'invalid-token'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_missing_token(self):
        """Test refresh fails without token."""
        response = self.client.post(self.url, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(APITestCase):
    """Tests for user profile endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User',
            role=UserRole.CANDIDATE
        )
        # Login and get token
        login_response = self.client.post(reverse('authentication:login'), {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')
        self.access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_get_profile(self):
        """Test getting current user profile."""
        response = self.client.get(reverse('authentication:me'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['first_name'], 'Test')
        self.assertEqual(response.data['last_name'], 'User')
        self.assertEqual(response.data['role'], UserRole.CANDIDATE)

    def test_get_profile_requires_auth(self):
        """Test profile endpoint requires authentication."""
        self.client.credentials()  # Clear credentials
        response = self.client.get(reverse('authentication:me'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile(self):
        """Test updating user profile."""
        response = self.client.patch(reverse('authentication:update_profile'), {
            'first_name': 'Updated',
            'last_name': 'Name',
            'phone': '+9876543210'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')
        self.assertEqual(response.data['last_name'], 'Name')
        self.assertEqual(response.data['phone'], '+9876543210')

    def test_update_profile_partial(self):
        """Test partial profile update."""
        response = self.client.patch(reverse('authentication:update_profile'), {
            'first_name': 'OnlyFirst'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'OnlyFirst')
        self.assertEqual(response.data['last_name'], 'User')  # Unchanged

    def test_update_profile_requires_auth(self):
        """Test profile update requires authentication."""
        self.client.credentials()  # Clear credentials
        response = self.client.patch(reverse('authentication:update_profile'), {
            'first_name': 'Updated'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordTests(APITestCase):
    """Tests for password change endpoint."""

    def setUp(self):
        self.url = reverse('authentication:change_password')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User'
        )
        # Login and get token
        login_response = self.client.post(reverse('authentication:login'), {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')
        self.access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_change_password_success(self):
        """Test successful password change."""
        response = self.client.post(self.url, {
            'old_password': 'SecurePass123!',
            'new_password': 'NewSecurePass456!',
            'new_password_confirm': 'NewSecurePass456!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify new password works
        self.client.credentials()  # Clear credentials
        login_response = self.client.post(reverse('authentication:login'), {
            'email': 'test@example.com',
            'password': 'NewSecurePass456!'
        }, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_change_password_wrong_old_password(self):
        """Test password change fails with wrong old password."""
        response = self.client.post(self.url, {
            'old_password': 'WrongOldPassword!',
            'new_password': 'NewSecurePass456!',
            'new_password_confirm': 'NewSecurePass456!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('old_password', response.data)

    def test_change_password_mismatch(self):
        """Test password change fails when new passwords don't match."""
        response = self.client.post(self.url, {
            'old_password': 'SecurePass123!',
            'new_password': 'NewSecurePass456!',
            'new_password_confirm': 'DifferentPass789!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password_confirm', response.data)

    def test_change_password_weak_new_password(self):
        """Test password change fails with weak new password."""
        response = self.client.post(self.url, {
            'old_password': 'SecurePass123!',
            'new_password': '123',
            'new_password_confirm': '123'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_requires_auth(self):
        """Test password change requires authentication."""
        self.client.credentials()  # Clear credentials
        response = self.client.post(self.url, {
            'old_password': 'SecurePass123!',
            'new_password': 'NewSecurePass456!',
            'new_password_confirm': 'NewSecurePass456!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserRoleTests(APITestCase):
    """Tests for user role functionality."""

    def test_new_users_are_candidates(self):
        """Test that newly registered users are candidates."""
        response = self.client.post(reverse('authentication:register'), {
            'email': 'newcandidate@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'Candidate',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], UserRole.CANDIDATE)

    def test_role_is_readonly_in_profile(self):
        """Test that role cannot be changed via profile update."""
        # Create and login user
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!',
            first_name='Test',
            last_name='User',
            role=UserRole.CANDIDATE
        )
        login_response = self.client.post(reverse('authentication:login'), {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }, format='json')
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        # Attempt to change role
        response = self.client.patch(reverse('authentication:update_profile'), {
            'role': UserRole.ADMIN
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Role should not have changed
        user.refresh_from_db()
        self.assertEqual(user.role, UserRole.CANDIDATE)


class StubEndpointTests(APITestCase):
    """Tests for stub endpoints (email verification, password reset)."""

    def test_verify_email_stub(self):
        """Test email verification stub endpoint."""
        response = self.client.post(reverse('authentication:verify_email'), {
            'token': 'test-token'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_forgot_password_stub(self):
        """Test forgot password stub endpoint."""
        response = self.client.post(reverse('authentication:forgot_password'), {
            'email': 'test@example.com'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should always return success to prevent email enumeration
        self.assertIn('message', response.data)

    def test_reset_password_stub(self):
        """Test reset password stub endpoint."""
        response = self.client.post(reverse('authentication:reset_password'), {
            'token': 'test-token',
            'new_password': 'NewSecurePass123!',
            'new_password_confirm': 'NewSecurePass123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
