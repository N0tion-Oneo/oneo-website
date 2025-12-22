# Re-export all models and enums for backward compatibility
# External code can still import: from jobs.models import Job, Application, etc.

from .job import (
    Job,
    JobStatus,
    JobType,
    WorkMode,
    Department,
)

from .application import (
    Application,
    ApplicationStatus,
    RejectionReason,
    ApplicationSource,
)

from .activity import (
    ActivityLog,
    ActivityNote,
    ActivityType,
)

from .questions import (
    QuestionType,
    ApplicationQuestion,
    ApplicationAnswer,
    QuestionTemplate,
    TemplateQuestion,
)

from .stages import (
    StageType,
    STAGE_TYPE_DEFAULTS,
    ApplicationStage,
    InterviewStageTemplate,
    StageInstanceStatus,
    ApplicationStageInstance,
)

from .feedback import (
    StageFeedback,
    StageFeedbackType,
)

from .shortlist_questions import (
    ShortlistQuestionTemplate,
    ShortlistTemplateQuestion,
    ShortlistQuestion,
    ShortlistAnswer,
)

from .replacement import (
    ReplacementRequest,
    ReplacementStatus,
    ReplacementReasonCategory,
)

__all__ = [
    # Job domain
    'Job',
    'JobStatus',
    'JobType',
    'WorkMode',
    'Department',
    # Application domain
    'Application',
    'ApplicationStatus',
    'RejectionReason',
    'ApplicationSource',
    # Activity domain
    'ActivityLog',
    'ActivityNote',
    'ActivityType',
    # Questions domain
    'QuestionType',
    'ApplicationQuestion',
    'ApplicationAnswer',
    'QuestionTemplate',
    'TemplateQuestion',
    # Stages domain
    'StageType',
    'STAGE_TYPE_DEFAULTS',
    'ApplicationStage',
    'InterviewStageTemplate',
    'StageInstanceStatus',
    'ApplicationStageInstance',
    # Feedback domain
    'StageFeedback',
    'StageFeedbackType',
    # Shortlist screening domain
    'ShortlistQuestionTemplate',
    'ShortlistTemplateQuestion',
    'ShortlistQuestion',
    'ShortlistAnswer',
    # Replacement domain
    'ReplacementRequest',
    'ReplacementStatus',
    'ReplacementReasonCategory',
]
