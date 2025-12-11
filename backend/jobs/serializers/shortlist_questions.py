from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Max

from ..models import (
    ShortlistQuestionTemplate,
    ShortlistTemplateQuestion,
    ShortlistQuestion,
    ShortlistAnswer,
)

User = get_user_model()


# ============================================================================
# Template Question Serializers
# ============================================================================

class ShortlistTemplateQuestionSerializer(serializers.ModelSerializer):
    """Serializer for reading template questions."""

    class Meta:
        model = ShortlistTemplateQuestion
        fields = [
            'id',
            'template',
            'question_text',
            'description',
            'is_required',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'template', 'created_at', 'updated_at']


class ShortlistTemplateQuestionCreateSerializer(serializers.Serializer):
    """Serializer for creating/updating template questions."""
    id = serializers.UUIDField(required=False)  # For updates
    question_text = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    is_required = serializers.BooleanField(default=False)
    order = serializers.IntegerField(default=0)


# ============================================================================
# Template Serializers
# ============================================================================

class ShortlistQuestionTemplateListSerializer(serializers.ModelSerializer):
    """Serializer for listing shortlist templates."""
    questions_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ShortlistQuestionTemplate
        fields = [
            'id',
            'company',
            'name',
            'description',
            'is_active',
            'questions_count',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_by', 'created_at', 'updated_at']

    def get_questions_count(self, obj):
        return obj.questions.count()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.email
        return None


class ShortlistQuestionTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for reading template with full question details."""
    questions = ShortlistTemplateQuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ShortlistQuestionTemplate
        fields = [
            'id',
            'company',
            'name',
            'description',
            'is_active',
            'questions',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.email
        return None


class ShortlistQuestionTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating templates with nested questions."""
    questions = ShortlistTemplateQuestionCreateSerializer(many=True, required=False, default=list)

    class Meta:
        model = ShortlistQuestionTemplate
        fields = ['name', 'description', 'is_active', 'questions']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        template = ShortlistQuestionTemplate.objects.create(**validated_data)

        for i, question_data in enumerate(questions_data):
            question_data.pop('id', None)
            if 'order' not in question_data or question_data['order'] == 0:
                question_data['order'] = i + 1
            ShortlistTemplateQuestion.objects.create(template=template, **question_data)

        return template


class ShortlistQuestionTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating templates (replaces questions)."""
    questions = ShortlistTemplateQuestionCreateSerializer(many=True, required=False)

    class Meta:
        model = ShortlistQuestionTemplate
        fields = ['name', 'description', 'is_active', 'questions']

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)

        # Update template fields
        instance = super().update(instance, validated_data)

        # Replace questions if provided
        if questions_data is not None:
            instance.questions.all().delete()
            for i, question_data in enumerate(questions_data):
                question_data.pop('id', None)
                if 'order' not in question_data or question_data['order'] == 0:
                    question_data['order'] = i + 1
                ShortlistTemplateQuestion.objects.create(template=instance, **question_data)

        return instance


# ============================================================================
# Job-Level Question Serializers
# ============================================================================

class ShortlistQuestionSerializer(serializers.ModelSerializer):
    """Serializer for reading job shortlist questions."""

    class Meta:
        model = ShortlistQuestion
        fields = [
            'id',
            'job',
            'question_text',
            'description',
            'is_required',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'job', 'created_at', 'updated_at']


class ShortlistQuestionCreateSerializer(serializers.Serializer):
    """Serializer for creating/updating job shortlist questions."""
    id = serializers.UUIDField(required=False)
    question_text = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    is_required = serializers.BooleanField(default=False)
    order = serializers.IntegerField(default=0)


class ShortlistQuestionBulkSerializer(serializers.Serializer):
    """Serializer for bulk creating/updating job shortlist questions."""
    questions = ShortlistQuestionCreateSerializer(many=True)

    def validate_questions(self, value):
        """Validate question orders are unique."""
        orders = [q.get('order', 0) for q in value]
        if len(orders) != len(set(orders)):
            raise serializers.ValidationError('Question orders must be unique.')
        return value


# ============================================================================
# Answer Serializers
# ============================================================================

class ShortlistAnswerSerializer(serializers.ModelSerializer):
    """Serializer for reading shortlist answers."""
    question = ShortlistQuestionSerializer(read_only=True)
    reviewer_name = serializers.SerializerMethodField()
    reviewer_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ShortlistAnswer
        fields = [
            'id',
            'application',
            'question',
            'reviewer',
            'reviewer_name',
            'reviewer_avatar',
            'score',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'application', 'reviewer', 'created_at', 'updated_at']

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return obj.reviewer.full_name or obj.reviewer.email
        return None

    def get_reviewer_avatar(self, obj):
        if obj.reviewer and obj.reviewer.avatar:
            return obj.reviewer.avatar.url
        return None


class ShortlistAnswerCreateSerializer(serializers.Serializer):
    """Serializer for creating/updating a single answer."""
    question_id = serializers.UUIDField()
    score = serializers.IntegerField(min_value=1, max_value=5)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class ShortlistAnswersBulkCreateSerializer(serializers.Serializer):
    """Serializer for bulk creating/updating reviewer answers."""
    answers = ShortlistAnswerCreateSerializer(many=True)

    def validate_answers(self, value):
        """Validate all question IDs exist."""
        question_ids = [a['question_id'] for a in value]
        existing_ids = ShortlistQuestion.objects.filter(id__in=question_ids).values_list('id', flat=True)
        existing_ids_set = set(str(id) for id in existing_ids)

        for qid in question_ids:
            if str(qid) not in existing_ids_set:
                raise serializers.ValidationError(f'Question {qid} does not exist.')

        return value


# ============================================================================
# Summary Serializer (Aggregated Scores)
# ============================================================================

class ShortlistReviewSummarySerializer(serializers.Serializer):
    """Serializer for aggregated shortlist review summary."""
    total_reviewers = serializers.IntegerField()
    average_overall_score = serializers.FloatField(allow_null=True)
    questions = serializers.ListField(
        child=serializers.DictField(),
        help_text='Per-question averages',
    )
    reviews = serializers.ListField(
        child=serializers.DictField(),
        help_text='Per-reviewer summaries',
    )

    @classmethod
    def build_summary(cls, application_id):
        """Build the summary data for an application."""
        answers = ShortlistAnswer.objects.filter(application_id=application_id)

        if not answers.exists():
            return {
                'total_reviewers': 0,
                'average_overall_score': None,
                'questions': [],
                'reviews': [],
            }

        # Total unique reviewers
        reviewer_ids = answers.values_list('reviewer', flat=True).distinct()
        total_reviewers = len(set(rid for rid in reviewer_ids if rid))

        # Average overall score
        average_overall = answers.aggregate(avg=Avg('score'))['avg']

        # Per-question stats
        question_stats = answers.values('question', 'question__question_text').annotate(
            average_score=Avg('score'),
            response_count=Count('id'),
        ).order_by('question__order')

        questions = [
            {
                'question_id': str(stat['question']),
                'question_text': stat['question__question_text'],
                'average_score': round(stat['average_score'], 2) if stat['average_score'] else None,
                'response_count': stat['response_count'],
            }
            for stat in question_stats
        ]

        # Per-reviewer stats
        reviewer_stats = answers.values('reviewer').annotate(
            average_score=Avg('score'),
            answered_at=Max('created_at'),
        ).order_by('-answered_at')

        # Get reviewer details
        reviewer_details = {
            str(u.id): u
            for u in User.objects.filter(id__in=[s['reviewer'] for s in reviewer_stats if s['reviewer']])
        }

        reviews = []
        for stat in reviewer_stats:
            reviewer_id = stat['reviewer']
            if reviewer_id and str(reviewer_id) in reviewer_details:
                user = reviewer_details[str(reviewer_id)]
                reviews.append({
                    'reviewer_id': str(reviewer_id),
                    'reviewer_name': user.full_name or user.email,
                    'reviewer_avatar': user.avatar.url if user.avatar else None,
                    'average_score': round(stat['average_score'], 2) if stat['average_score'] else None,
                    'answered_at': stat['answered_at'].isoformat() if stat['answered_at'] else None,
                })

        return {
            'total_reviewers': total_reviewers,
            'average_overall_score': round(average_overall, 2) if average_overall else None,
            'questions': questions,
            'reviews': reviews,
        }
