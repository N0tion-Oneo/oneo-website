import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from .services import parse_resume
from .import_service import import_resume_data

logger = logging.getLogger(__name__)


class ResumeParseView(APIView):
    """
    Parse an uploaded resume (PDF/DOCX) and return structured profile data.

    The resume file is saved to the candidate's profile and then parsed
    using OpenAI's GPT-5-nano model to extract:
    - Profile information (name, title, summary, location)
    - Work experiences with technologies and skills
    - Education history
    - Aggregated technologies and skills lists
    """
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('file')

        if not file:
            return Response({"error": "No file provided"}, status=400)

        # Validate file type
        allowed_types = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        if file.content_type not in allowed_types:
            return Response(
                {"error": "Only PDF and DOCX files are supported"},
                status=400
            )

        # Validate file size (5MB max)
        if file.size > 5 * 1024 * 1024:
            return Response(
                {"error": "File too large. Maximum size is 5MB"},
                status=400
            )

        # Get candidate profile
        try:
            candidate_profile = request.user.candidate_profile
        except AttributeError:
            return Response(
                {"error": "No candidate profile found"},
                status=400
            )

        try:
            parsed_data = parse_resume(file, candidate_profile)
            return Response(parsed_data)
        except ValueError as e:
            logger.error(f"Configuration error parsing resume: {e}")
            return Response(
                {"error": "Resume parsing is not configured. Please contact support."},
                status=500
            )
        except Exception as e:
            logger.exception(f"Error parsing resume for user {request.user.id}")
            return Response(
                {"error": "Failed to parse resume. Please try again."},
                status=500
            )


class ResumeImportView(APIView):
    """
    Import parsed resume data into the candidate's profile.

    Accepts the parsed data from ResumeParseView and:
    - Updates User (first_name, last_name)
    - Updates CandidateProfile (title, headline, summary, location)
    - Creates Experience records with fuzzy-matched technologies and skills
    - Creates Education records
    """
    parser_classes = [JSONParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        parsed_data = request.data

        if not parsed_data:
            return Response({"error": "No data provided"}, status=400)

        # Get candidate profile
        try:
            candidate_profile = request.user.candidate_profile
        except AttributeError:
            return Response(
                {"error": "No candidate profile found"},
                status=400
            )

        try:
            results = import_resume_data(candidate_profile, parsed_data)
            return Response({
                "success": True,
                "message": "Resume data imported successfully",
                "results": results
            })
        except Exception as e:
            logger.exception(f"Error importing resume data for user {request.user.id}")
            return Response(
                {"error": "Failed to import resume data. Please try again."},
                status=500
            )
