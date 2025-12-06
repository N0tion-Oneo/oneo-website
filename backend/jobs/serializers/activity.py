from rest_framework import serializers

from ..models import ActivityLog, ActivityNote


class ActivityNoteSerializer(serializers.ModelSerializer):
    """Serializer for activity notes (threaded comments)."""
    author_name = serializers.SerializerMethodField()
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ActivityNote
        fields = [
            'id',
            'author',
            'author_name',
            'author_email',
            'author_avatar',
            'content',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        """Get the author's full name."""
        if obj.author:
            return obj.author.full_name or obj.author.email
        return 'Unknown'

    def get_author_avatar(self, obj):
        """Get the author's avatar URL."""
        if obj.author and hasattr(obj.author, 'avatar') and obj.author.avatar:
            return obj.author.avatar.url
        return None


class ActivityNoteCreateSerializer(serializers.Serializer):
    """Serializer for creating a note on an activity."""
    content = serializers.CharField(required=True, min_length=1)


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for activity log entries with nested notes."""
    performed_by_name = serializers.SerializerMethodField()
    performed_by_email = serializers.EmailField(source='performed_by.email', read_only=True)
    performed_by_avatar = serializers.SerializerMethodField()
    notes = ActivityNoteSerializer(many=True, read_only=True)
    notes_count = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'application',
            'performed_by',
            'performed_by_name',
            'performed_by_email',
            'performed_by_avatar',
            'activity_type',
            'previous_status',
            'new_status',
            'previous_stage',
            'new_stage',
            'stage_name',
            'metadata',
            'created_at',
            'notes',
            'notes_count',
        ]
        read_only_fields = fields

    def get_performed_by_name(self, obj):
        """Get the performer's full name."""
        if obj.performed_by:
            return obj.performed_by.full_name or obj.performed_by.email
        return 'System'

    def get_performed_by_avatar(self, obj):
        """Get the performer's avatar URL."""
        if obj.performed_by and hasattr(obj.performed_by, 'avatar') and obj.performed_by.avatar:
            return obj.performed_by.avatar.url
        return None

    def get_notes_count(self, obj):
        """Get the count of notes on this activity."""
        return obj.notes.count()
