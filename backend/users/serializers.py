from rest_framework import serializers
from .models import RecruiterProfile
from candidates.models import Industry
from companies.models import Country, City


class IndustrySerializer(serializers.ModelSerializer):
    """Simple serializer for Industry (for nested display)."""
    class Meta:
        model = Industry
        fields = ['id', 'name']


class CountrySerializer(serializers.ModelSerializer):
    """Simple serializer for Country."""
    class Meta:
        model = Country
        fields = ['id', 'name', 'code']


class CitySerializer(serializers.ModelSerializer):
    """Simple serializer for City."""
    country = CountrySerializer(read_only=True)

    class Meta:
        model = City
        fields = ['id', 'name', 'country']


class RecruiterProfileSerializer(serializers.ModelSerializer):
    """Serializer for reading RecruiterProfile data."""
    industries = IndustrySerializer(many=True, read_only=True)
    country = CountrySerializer(read_only=True)
    city = CitySerializer(read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)

    class Meta:
        model = RecruiterProfile
        fields = [
            'id',
            'user_name',
            'user_email',
            'user_avatar',
            'user_phone',
            'professional_title',
            'bio',
            'linkedin_url',
            'years_of_experience',
            'country',
            'city',
            'timezone',
            'industries',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RecruiterProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating RecruiterProfile data."""
    industry_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='List of industry IDs',
    )
    industries = IndustrySerializer(many=True, read_only=True)

    country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.filter(is_active=True),
        source='country',
        write_only=True,
        required=False,
        allow_null=True,
    )
    city_id = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.filter(is_active=True),
        source='city',
        write_only=True,
        required=False,
        allow_null=True,
    )
    country = CountrySerializer(read_only=True)
    city = CitySerializer(read_only=True)

    class Meta:
        model = RecruiterProfile
        fields = [
            'id',
            'professional_title',
            'bio',
            'linkedin_url',
            'years_of_experience',
            'country',
            'country_id',
            'city',
            'city_id',
            'timezone',
            'industries',
            'industry_ids',
        ]
        read_only_fields = ['id']

    def validate_linkedin_url(self, value):
        """Validate LinkedIn URL format."""
        if value and 'linkedin.com' not in value.lower():
            raise serializers.ValidationError('Please provide a valid LinkedIn URL')
        return value

    def validate_industry_ids(self, value):
        """Validate that all industry IDs exist."""
        if value:
            existing_ids = set(Industry.objects.filter(id__in=value).values_list('id', flat=True))
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(f'Invalid industry IDs: {invalid_ids}')
        return value

    def validate(self, attrs):
        """Validate that city belongs to the selected country."""
        country = attrs.get('country')
        city = attrs.get('city')

        if city and country and city.country_id != country.id:
            raise serializers.ValidationError({
                'city_id': 'City must belong to the selected country.'
            })

        return attrs

    def update(self, instance, validated_data):
        industry_ids = validated_data.pop('industry_ids', None)

        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update M2M industries if provided
        if industry_ids is not None:
            instance.industries.set(industry_ids)

        return instance
