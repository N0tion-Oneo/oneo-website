from rest_framework import serializers

from ..models import (
    ApplicationQuestion, ApplicationAnswer, QuestionType,
    QuestionTemplate, TemplateQuestion,
)


class ApplicationQuestionSerializer(serializers.ModelSerializer):
    """Serializer for application questions."""

    class Meta:
        model = ApplicationQuestion
        fields = [
            'id',
            'job',
            'question_text',
            'question_type',
            'options',
            'placeholder',
            'helper_text',
            'is_required',
            'order',
        ]
        read_only_fields = ['id', 'job']


class ApplicationQuestionCreateSerializer(serializers.Serializer):
    """Serializer for creating questions when creating/updating a job."""
    question_text = serializers.CharField(max_length=500)
    question_type = serializers.ChoiceField(choices=QuestionType.choices, default=QuestionType.TEXT)
    options = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    placeholder = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    helper_text = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    is_required = serializers.BooleanField(default=False)
    order = serializers.IntegerField(default=0)

    def validate(self, data):
        """Validate that select types have options."""
        question_type = data.get('question_type')
        options = data.get('options', [])
        if question_type in [QuestionType.SELECT, QuestionType.MULTI_SELECT] and not options:
            raise serializers.ValidationError({
                'options': 'Options are required for select/multi-select questions.'
            })
        return data


class ApplicationAnswerSerializer(serializers.ModelSerializer):
    """Serializer for application answers (read)."""
    question = ApplicationQuestionSerializer(read_only=True)

    class Meta:
        model = ApplicationAnswer
        fields = [
            'id',
            'application',
            'question',
            'answer_text',
            'answer_file',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'application', 'created_at', 'updated_at']


class ApplicationAnswerCreateSerializer(serializers.Serializer):
    """Serializer for submitting answers when applying."""
    question_id = serializers.UUIDField()
    answer_text = serializers.CharField(required=False, allow_blank=True, default='')
    answer_file = serializers.FileField(required=False, allow_null=True)

    def validate_answer_file(self, value):
        """Validate file type and size."""
        if value:
            # Max 25MB
            max_size = 25 * 1024 * 1024
            if value.size > max_size:
                raise serializers.ValidationError('File size must be less than 25MB.')

            # Allowed extensions
            allowed_extensions = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'zip']
            ext = value.name.split('.')[-1].lower() if '.' in value.name else ''
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f'File type not allowed. Allowed types: {", ".join(allowed_extensions)}'
                )
        return value


# ==================== Question Templates Serializers ====================


class TemplateQuestionSerializer(serializers.ModelSerializer):
    """Serializer for template questions."""

    class Meta:
        model = TemplateQuestion
        fields = [
            'id',
            'template',
            'question_text',
            'question_type',
            'options',
            'placeholder',
            'helper_text',
            'is_required',
            'order',
        ]
        read_only_fields = ['id', 'template']


class TemplateQuestionCreateSerializer(serializers.Serializer):
    """Serializer for creating/updating template questions."""
    id = serializers.UUIDField(required=False)  # For updates
    question_text = serializers.CharField(max_length=500)
    question_type = serializers.ChoiceField(choices=QuestionType.choices, default=QuestionType.TEXT)
    options = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    placeholder = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    helper_text = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    is_required = serializers.BooleanField(default=False)
    order = serializers.IntegerField(default=0)

    def validate(self, data):
        """Validate that select types have options."""
        question_type = data.get('question_type')
        options = data.get('options', [])
        if question_type in [QuestionType.SELECT, QuestionType.MULTI_SELECT] and not options:
            raise serializers.ValidationError({
                'options': 'Options are required for select/multi-select questions.'
            })
        return data


class QuestionTemplateListSerializer(serializers.ModelSerializer):
    """Serializer for listing question templates."""
    questions_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuestionTemplate
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


class QuestionTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for question template detail (with questions)."""
    questions = TemplateQuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuestionTemplate
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


class QuestionTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a question template."""
    questions = TemplateQuestionCreateSerializer(many=True, required=False, default=list)

    class Meta:
        model = QuestionTemplate
        fields = [
            'name',
            'description',
            'is_active',
            'questions',
        ]

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        template = QuestionTemplate.objects.create(**validated_data)

        for i, question_data in enumerate(questions_data):
            question_data.pop('id', None)  # Remove id if present
            if 'order' not in question_data or question_data['order'] == 0:
                question_data['order'] = i + 1
            TemplateQuestion.objects.create(template=template, **question_data)

        return template


class QuestionTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a question template."""
    questions = TemplateQuestionCreateSerializer(many=True, required=False)

    class Meta:
        model = QuestionTemplate
        fields = [
            'name',
            'description',
            'is_active',
            'questions',
        ]

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)

        # Update template fields
        instance = super().update(instance, validated_data)

        # Update questions if provided
        if questions_data is not None:
            # Delete existing questions
            instance.questions.all().delete()

            # Create new questions
            for i, question_data in enumerate(questions_data):
                question_data.pop('id', None)  # Remove id if present
                if 'order' not in question_data or question_data['order'] == 0:
                    question_data['order'] = i + 1
                TemplateQuestion.objects.create(template=instance, **question_data)

        return instance
