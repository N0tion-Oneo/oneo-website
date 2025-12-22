# Re-export all serializers for backward compatibility
# External code can still import: from jobs.serializers import JobListSerializer, etc.

from .jobs import (
    JobListSerializer,
    JobDetailSerializer,
    InterviewStageSerializer,
    JobCreateSerializer,
    JobUpdateSerializer,
    JobStatusUpdateSerializer,
)

from .applications import (
    ApplicationListSerializer,
    ApplicationSerializer,
    ApplicationCreateSerializer,
    ApplicationStageUpdateSerializer,
    OfferDetailsSerializer,
    MakeOfferSerializer,
    AcceptOfferSerializer,
    RejectApplicationSerializer,
    CandidateApplicationListSerializer,
)

from .activity import (
    ActivityNoteSerializer,
    ActivityNoteCreateSerializer,
    ActivityLogSerializer,
)

from .questions import (
    ApplicationQuestionSerializer,
    ApplicationQuestionCreateSerializer,
    ApplicationAnswerSerializer,
    ApplicationAnswerCreateSerializer,
    TemplateQuestionSerializer,
    TemplateQuestionCreateSerializer,
    QuestionTemplateListSerializer,
    QuestionTemplateDetailSerializer,
    QuestionTemplateCreateSerializer,
    QuestionTemplateUpdateSerializer,
)

from .stages import (
    InterviewStageTemplateSerializer,
    InterviewStageTemplateCreateSerializer,
    InterviewStageTemplateBulkSerializer,
    BookingTokenSerializer,
    ApplicationStageInstanceSerializer,
    ScheduleStageSerializer,
    RescheduleStageSerializer,
    AssignAssessmentSerializer,
    SubmitAssessmentSerializer,
    CompleteStageSerializer,
)

from .feedback import (
    StageFeedbackSerializer,
    StageFeedbackCreateSerializer,
    StageFeedbackUpdateSerializer,
)

from .shortlist_questions import (
    ShortlistTemplateQuestionSerializer,
    ShortlistTemplateQuestionCreateSerializer,
    ShortlistQuestionTemplateListSerializer,
    ShortlistQuestionTemplateDetailSerializer,
    ShortlistQuestionTemplateCreateSerializer,
    ShortlistQuestionTemplateUpdateSerializer,
    ShortlistQuestionSerializer,
    ShortlistQuestionCreateSerializer,
    ShortlistQuestionBulkSerializer,
    ShortlistAnswerSerializer,
    ShortlistAnswerCreateSerializer,
    ShortlistAnswersBulkCreateSerializer,
    ShortlistReviewSummarySerializer,
)

from .replacement import (
    ReplacementRequestListSerializer,
    ReplacementRequestDetailSerializer,
    ReplacementRequestCreateSerializer,
    ReplacementApproveSerializer,
    ReplacementRejectSerializer,
    ReplacementEligibilitySerializer,
)

__all__ = [
    # Job serializers
    'JobListSerializer',
    'JobDetailSerializer',
    'InterviewStageSerializer',
    'JobCreateSerializer',
    'JobUpdateSerializer',
    'JobStatusUpdateSerializer',
    # Application serializers
    'ApplicationListSerializer',
    'ApplicationSerializer',
    'ApplicationCreateSerializer',
    'ApplicationStageUpdateSerializer',
    'OfferDetailsSerializer',
    'MakeOfferSerializer',
    'AcceptOfferSerializer',
    'RejectApplicationSerializer',
    'CandidateApplicationListSerializer',
    # Activity serializers
    'ActivityNoteSerializer',
    'ActivityNoteCreateSerializer',
    'ActivityLogSerializer',
    # Question serializers
    'ApplicationQuestionSerializer',
    'ApplicationQuestionCreateSerializer',
    'ApplicationAnswerSerializer',
    'ApplicationAnswerCreateSerializer',
    'TemplateQuestionSerializer',
    'TemplateQuestionCreateSerializer',
    'QuestionTemplateListSerializer',
    'QuestionTemplateDetailSerializer',
    'QuestionTemplateCreateSerializer',
    'QuestionTemplateUpdateSerializer',
    # Stage serializers
    'InterviewStageTemplateSerializer',
    'InterviewStageTemplateCreateSerializer',
    'InterviewStageTemplateBulkSerializer',
    'BookingTokenSerializer',
    'ApplicationStageInstanceSerializer',
    'ScheduleStageSerializer',
    'RescheduleStageSerializer',
    'AssignAssessmentSerializer',
    'SubmitAssessmentSerializer',
    'CompleteStageSerializer',
    # Feedback serializers
    'StageFeedbackSerializer',
    'StageFeedbackCreateSerializer',
    'StageFeedbackUpdateSerializer',
    # Shortlist screening serializers
    'ShortlistTemplateQuestionSerializer',
    'ShortlistTemplateQuestionCreateSerializer',
    'ShortlistQuestionTemplateListSerializer',
    'ShortlistQuestionTemplateDetailSerializer',
    'ShortlistQuestionTemplateCreateSerializer',
    'ShortlistQuestionTemplateUpdateSerializer',
    'ShortlistQuestionSerializer',
    'ShortlistQuestionCreateSerializer',
    'ShortlistQuestionBulkSerializer',
    'ShortlistAnswerSerializer',
    'ShortlistAnswerCreateSerializer',
    'ShortlistAnswersBulkCreateSerializer',
    'ShortlistReviewSummarySerializer',
    # Replacement serializers
    'ReplacementRequestListSerializer',
    'ReplacementRequestDetailSerializer',
    'ReplacementRequestCreateSerializer',
    'ReplacementApproveSerializer',
    'ReplacementRejectSerializer',
    'ReplacementEligibilitySerializer',
]
