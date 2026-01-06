"""
Custom middleware for the Oneo platform.
"""
from django.conf import settings


class MediaCacheMiddleware:
    """
    Middleware to add cache headers to media file responses.

    This improves performance by allowing browsers to cache media files
    (images, documents, etc.) instead of re-fetching them on every request.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # Cache media files for 1 day in development, 1 week in production
        self.max_age = 86400 if settings.DEBUG else 604800

    def __call__(self, request):
        response = self.get_response(request)

        # Add cache headers for media files
        if request.path.startswith(f'/{settings.MEDIA_URL.strip("/")}'):
            # Check if it's a successful response
            if response.status_code == 200:
                response['Cache-Control'] = f'public, max-age={self.max_age}'
                # Add Vary header for content negotiation
                response['Vary'] = 'Accept-Encoding'

        return response
