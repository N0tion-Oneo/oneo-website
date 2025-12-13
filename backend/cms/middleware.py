"""CMS Middleware - Redirect handling."""
import re
from django.db.models import F
from django.http import (
    HttpResponsePermanentRedirect,
    HttpResponseRedirect,
    HttpResponseGone,
)
from django.core.cache import cache

from .models import Redirect


class RedirectMiddleware:
    """
    Middleware that handles URL redirects from the CMS.

    Checks incoming requests against the Redirect table and returns
    appropriate 301/302/410 responses when matches are found.

    Redirects are cached for performance.
    """

    CACHE_KEY = 'cms_redirects'
    CACHE_TIMEOUT = 300  # 5 minutes

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip for admin and API paths (performance optimization)
        path = request.path
        if path.startswith('/admin/') or path.startswith('/api/'):
            return self.get_response(request)

        # Check for redirect
        redirect = self.get_redirect(path)
        if redirect:
            # Increment hit count asynchronously (fire and forget)
            self.increment_hit_count(redirect['id'])

            # Return appropriate response
            if redirect['type'] == '410':
                return HttpResponseGone(
                    content='<h1>410 Gone</h1><p>This page has been permanently removed.</p>',
                    content_type='text/html'
                )
            elif redirect['type'] == '301':
                return HttpResponsePermanentRedirect(redirect['destination'])
            else:  # 302
                return HttpResponseRedirect(redirect['destination'])

        return self.get_response(request)

    def get_redirect(self, path):
        """Get redirect for a path, checking cache first."""
        redirects = self.get_cached_redirects()

        # First, check exact matches
        for r in redirects:
            if not r['is_regex'] and r['source'] == path:
                return r

        # Then, check regex matches
        for r in redirects:
            if r['is_regex']:
                try:
                    if re.match(r['source'], path):
                        # For regex, we might need to do substitution
                        destination = re.sub(r['source'], r['destination'], path)
                        return {
                            'id': r['id'],
                            'destination': destination,
                            'type': r['type'],
                        }
                except re.error:
                    # Invalid regex, skip
                    continue

        return None

    def get_cached_redirects(self):
        """Get all active redirects from cache or database."""
        redirects = cache.get(self.CACHE_KEY)

        if redirects is None:
            # Fetch from database
            redirect_qs = Redirect.objects.filter(is_active=True).values(
                'id', 'source_path', 'destination_url', 'redirect_type', 'is_regex'
            )
            redirects = [
                {
                    'id': str(r['id']),
                    'source': r['source_path'],
                    'destination': r['destination_url'],
                    'type': r['redirect_type'],
                    'is_regex': r['is_regex'],
                }
                for r in redirect_qs
            ]
            cache.set(self.CACHE_KEY, redirects, self.CACHE_TIMEOUT)

        return redirects

    def increment_hit_count(self, redirect_id):
        """Increment the hit count for a redirect."""
        try:
            # Use update() to avoid race conditions
            Redirect.objects.filter(id=redirect_id).update(
                hit_count=F('hit_count') + 1
            )
        except Exception:
            # Don't let hit count failures break the redirect
            pass

    @classmethod
    def clear_cache(cls):
        """Clear the redirect cache. Call this when redirects are modified."""
        cache.delete(cls.CACHE_KEY)
