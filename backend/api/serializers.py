from rest_framework import serializers
from users.models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Base serializer for User model with common fields.
    """
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'avatar',
            'role',
            'is_verified',
            'date_joined',
        ]
        read_only_fields = ['id', 'email', 'is_verified', 'date_joined']


class UserMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal user serializer for nested representations.
    """
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'avatar']
        read_only_fields = fields
