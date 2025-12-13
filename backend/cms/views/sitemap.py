"""Sitemap generation views following Google's best practices.

Best practices implemented:
- Sitemap index as entry point with separate sitemaps per content type
- Only includes canonical, indexable URLs
- Uses lastmod with full ISO 8601 timestamps
- Omits priority and changefreq (Google ignores these)
- Proper XML escaping for special characters
- Image sitemap extension for content with images
- XSL stylesheet for human-readable formatting

References:
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://www.sitemaps.org/protocol.html
"""
from html import escape as html_escape
from django.http import HttpResponse, Http404
from django.utils import timezone
from django.db.models import Max
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from cms.models import Page, BlogPost, GlossaryTerm, CaseStudy, SiteSettings, PageSEO
from jobs.models import Job
from candidates.models import CandidateProfile
from companies.models import Company


# Sitemap types configuration - {url_name: display_name}
SITEMAP_TYPES = [
    'page',       # Static pages + CMS pages
    'post',       # Blog posts
    'job',        # Job listings
    'candidate',  # Public candidate profiles
    'company',    # Company profiles
    'glossary',   # Glossary terms
    'case-study', # Case studies
]


def get_sitemap_settings():
    """Get sitemap settings from SiteSettings."""
    settings = SiteSettings.objects.first()
    if not settings:
        settings = SiteSettings.objects.create()
    return settings


def escape_xml(text: str) -> str:
    """Escape special characters for XML."""
    if not text:
        return text
    return html_escape(text, quote=True)


def format_lastmod(dt) -> str:
    """Format datetime for sitemap lastmod field (ISO 8601 with timezone)."""
    if dt is None:
        return None
    # Format as ISO 8601 with timezone: 2025-12-02T11:09:02+00:00
    return dt.strftime('%Y-%m-%dT%H:%M:%S+00:00')


def make_absolute_url(relative_url: str, base_url: str) -> str:
    """Convert a relative URL to absolute URL."""
    if not relative_url:
        return None
    if relative_url.startswith('http://') or relative_url.startswith('https://'):
        return relative_url
    if relative_url.startswith('/'):
        return f"{base_url}{relative_url}"
    return f"{base_url}/{relative_url}"


def get_base_url(request, settings):
    """Get the base URL for sitemaps."""
    base_url = settings.site_url.rstrip('/') if settings.site_url else request.build_absolute_uri('/').rstrip('/')
    if '/api/' in base_url:
        base_url = base_url.split('/api/')[0]
    return base_url


# =============================================================================
# URL collectors for each sitemap type
# =============================================================================

def collect_pages_urls(base_url: str, settings) -> list:
    """Collect static pages (from PageSEO) and CMS legal pages."""
    urls = []

    # Get static/app pages from PageSEO entries (configurable from CMS)
    # Only include pages marked as include_in_sitemap, active, and not noindex
    # Exclude wildcard patterns (e.g., /jobs/*) as those are covered by specific sitemaps
    page_seo_entries = PageSEO.objects.filter(
        is_active=True,
        include_in_sitemap=True,
        noindex=False,
    ).exclude(
        path__endswith='*'  # Exclude wildcards - those are for SEO meta only
    ).only('path', 'sitemap_priority', 'updated_at')

    for entry in page_seo_entries:
        # Normalize path (ensure it starts with /)
        path = entry.path if entry.path.startswith('/') else f'/{entry.path}'
        urls.append({
            'loc': f"{base_url}{path}",
            'lastmod': format_lastmod(entry.updated_at),
        })

    # CMS Legal Pages - served at root level (e.g., /privacy-policy not /pages/privacy-policy)
    if settings.sitemap_include_pages:
        pages = Page.objects.filter(status='published').only('slug', 'updated_at')
        for page in pages:
            urls.append({
                'loc': f"{base_url}/{page.slug}",
                'lastmod': format_lastmod(page.updated_at),
            })

    return urls


def collect_blog_urls(base_url: str, settings) -> list:
    """Collect blog post URLs with images."""
    urls = []

    if not settings.sitemap_include_blog:
        return urls

    posts = BlogPost.objects.filter(
        status='published'
    ).only('slug', 'updated_at', 'featured_image', 'title')

    for post in posts:
        url_entry = {
            'loc': f"{base_url}/blog/{post.slug}",
            'lastmod': format_lastmod(post.updated_at),
        }
        if post.featured_image:
            image_url = post.featured_image.url if hasattr(post.featured_image, 'url') else str(post.featured_image)
            url_entry['images'] = [{
                'loc': make_absolute_url(image_url, base_url),
                'title': post.title,
            }]
        urls.append(url_entry)

    return urls


def collect_jobs_urls(base_url: str, settings) -> list:
    """Collect active job listing URLs."""
    from django.db.models import Q

    urls = []

    if not settings.sitemap_include_jobs:
        return urls

    # Include jobs that are published AND either:
    # - Have no deadline (open indefinitely), OR
    # - Have a future deadline
    jobs = Job.objects.filter(
        status='published'
    ).filter(
        Q(application_deadline__isnull=True) | Q(application_deadline__gte=timezone.now())
    ).only('slug', 'updated_at')

    for job in jobs:
        urls.append({
            'loc': f"{base_url}/jobs/{job.slug}",
            'lastmod': format_lastmod(job.updated_at),
        })

    return urls


def collect_candidates_urls(base_url: str, settings) -> list:
    """Collect public candidate profile URLs."""
    urls = []

    if not settings.sitemap_include_candidates:
        return urls

    candidates = CandidateProfile.objects.filter(
        visibility='public_sanitised'
    ).only('slug', 'updated_at')

    for candidate in candidates:
        urls.append({
            'loc': f"{base_url}/candidates/{candidate.slug}",
            'lastmod': format_lastmod(candidate.updated_at),
        })

    return urls


def collect_companies_urls(base_url: str, settings) -> list:
    """Collect company profile URLs with logos."""
    urls = []

    if not settings.sitemap_include_companies:
        return urls

    companies = Company.objects.filter(
        is_published=True
    ).only('slug', 'updated_at', 'logo', 'name')

    for company in companies:
        url_entry = {
            'loc': f"{base_url}/companies/{company.slug}",
            'lastmod': format_lastmod(company.updated_at),
        }
        if company.logo:
            logo_url = company.logo.url if hasattr(company.logo, 'url') else str(company.logo)
            url_entry['images'] = [{
                'loc': make_absolute_url(logo_url, base_url),
                'title': f"{company.name} logo",
            }]
        urls.append(url_entry)

    return urls


def collect_glossary_urls(base_url: str, settings) -> list:
    """Collect glossary term URLs."""
    urls = []

    if not settings.sitemap_include_glossary:
        return urls

    terms = GlossaryTerm.objects.filter(is_active=True).only('slug', 'updated_at')

    for term in terms:
        urls.append({
            'loc': f"{base_url}/glossary/{term.slug}",
            'lastmod': format_lastmod(term.updated_at),
        })

    return urls


def collect_case_studies_urls(base_url: str, settings) -> list:
    """Collect case study URLs."""
    urls = []

    if not settings.sitemap_include_case_studies:
        return urls

    studies = CaseStudy.objects.filter(status='published').only('slug', 'updated_at')

    for study in studies:
        urls.append({
            'loc': f"{base_url}/case-studies/{study.slug}",
            'lastmod': format_lastmod(study.updated_at),
        })

    return urls


# Map sitemap types to their collectors
SITEMAP_COLLECTORS = {
    'page': collect_pages_urls,
    'post': collect_blog_urls,
    'job': collect_jobs_urls,
    'candidate': collect_candidates_urls,
    'company': collect_companies_urls,
    'glossary': collect_glossary_urls,
    'case-study': collect_case_studies_urls,
}


# =============================================================================
# Last modified date helpers
# =============================================================================

def get_sitemap_lastmod(sitemap_type: str, settings) -> str:
    """Get the last modified date for a sitemap type."""
    lastmod = None

    if sitemap_type == 'page':
        # Get most recent from both PageSEO entries and CMS legal pages
        page_seo_result = PageSEO.objects.filter(
            is_active=True,
            include_in_sitemap=True,
            noindex=False,
        ).exclude(
            path__endswith='*'
        ).aggregate(Max('updated_at'))
        page_seo_lastmod = page_seo_result.get('updated_at__max')

        cms_page_lastmod = None
        if settings.sitemap_include_pages:
            cms_result = Page.objects.filter(status='published').aggregate(Max('updated_at'))
            cms_page_lastmod = cms_result.get('updated_at__max')

        # Return the most recent of the two
        if page_seo_lastmod and cms_page_lastmod:
            lastmod = max(page_seo_lastmod, cms_page_lastmod)
        else:
            lastmod = page_seo_lastmod or cms_page_lastmod

    elif sitemap_type == 'post' and settings.sitemap_include_blog:
        result = BlogPost.objects.filter(status='published').aggregate(Max('updated_at'))
        lastmod = result.get('updated_at__max')

    elif sitemap_type == 'job' and settings.sitemap_include_jobs:
        from django.db.models import Q
        result = Job.objects.filter(
            status='published'
        ).filter(
            Q(application_deadline__isnull=True) | Q(application_deadline__gte=timezone.now())
        ).aggregate(Max('updated_at'))
        lastmod = result.get('updated_at__max')

    elif sitemap_type == 'candidate' and settings.sitemap_include_candidates:
        result = CandidateProfile.objects.filter(
            visibility='public_sanitised'
        ).aggregate(Max('updated_at'))
        lastmod = result.get('updated_at__max')

    elif sitemap_type == 'company' and settings.sitemap_include_companies:
        result = Company.objects.filter(is_published=True).aggregate(Max('updated_at'))
        lastmod = result.get('updated_at__max')

    elif sitemap_type == 'glossary' and settings.sitemap_include_glossary:
        result = GlossaryTerm.objects.filter(is_active=True).aggregate(Max('updated_at'))
        lastmod = result.get('updated_at__max')

    elif sitemap_type == 'case-study' and settings.sitemap_include_case_studies:
        result = CaseStudy.objects.filter(status='published').aggregate(Max('updated_at'))
        lastmod = result.get('updated_at__max')

    return format_lastmod(lastmod)


def is_sitemap_enabled(sitemap_type: str, settings) -> bool:
    """Check if a sitemap type is enabled."""
    if sitemap_type == 'page':
        return True  # Always include static pages
    elif sitemap_type == 'post':
        return settings.sitemap_include_blog
    elif sitemap_type == 'job':
        return settings.sitemap_include_jobs
    elif sitemap_type == 'candidate':
        return settings.sitemap_include_candidates
    elif sitemap_type == 'company':
        return settings.sitemap_include_companies
    elif sitemap_type == 'glossary':
        return settings.sitemap_include_glossary
    elif sitemap_type == 'case-study':
        return settings.sitemap_include_case_studies
    return False


# =============================================================================
# XML generators
# =============================================================================

def generate_sitemap_xml(urls: list, base_url: str) -> str:
    """Generate XML sitemap from URL list (Yoast-style format)."""
    has_images = any('images' in url for url in urls)

    # XML declaration with XSL stylesheet
    xml_parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<?xml-stylesheet type="text/xsl" href="{base_url}/sitemap.xsl"?>',
    ]

    # Urlset with namespaces and schema locations
    if has_images:
        xml_parts.append(
            '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" '
            'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 '
            'http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd '
            'http://www.google.com/schemas/sitemap-image/1.1 '
            'http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" '
            'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        )
    else:
        xml_parts.append(
            '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 '
            'http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" '
            'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        )

    for url in urls:
        xml_parts.append('\t<url>')
        xml_parts.append(f'\t\t<loc>{escape_xml(url["loc"])}</loc>')

        if url.get('lastmod'):
            xml_parts.append(f'\t\t<lastmod>{url["lastmod"]}</lastmod>')

        for image in url.get('images', []):
            xml_parts.append('\t\t<image:image>')
            xml_parts.append(f'\t\t\t<image:loc>{escape_xml(image["loc"])}</image:loc>')
            xml_parts.append('\t\t</image:image>')

        xml_parts.append('\t</url>')

    xml_parts.append('</urlset>')
    return '\n'.join(xml_parts)


def generate_sitemap_index_xml(sitemaps: list, base_url: str) -> str:
    """Generate sitemap index XML (Yoast-style format)."""
    xml_parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<?xml-stylesheet type="text/xsl" href="{base_url}/sitemap.xsl"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for sitemap in sitemaps:
        xml_parts.append('\t<sitemap>')
        xml_parts.append(f'\t\t<loc>{escape_xml(sitemap["loc"])}</loc>')
        if sitemap.get('lastmod'):
            xml_parts.append(f'\t\t<lastmod>{sitemap["lastmod"]}</lastmod>')
        xml_parts.append('\t</sitemap>')

    xml_parts.append('</sitemapindex>')
    return '\n'.join(xml_parts)


# =============================================================================
# View functions
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def sitemap_index(request):
    """Return the sitemap index listing all individual sitemaps."""
    settings = get_sitemap_settings()

    if not settings.sitemap_enabled:
        return HttpResponse(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>',
            content_type='application/xml',
        )

    base_url = get_base_url(request, settings)
    sitemaps = []

    for sitemap_type in SITEMAP_TYPES:
        if is_sitemap_enabled(sitemap_type, settings):
            lastmod = get_sitemap_lastmod(sitemap_type, settings)
            sitemaps.append({
                'loc': f"{base_url}/{sitemap_type}-sitemap.xml",
                'lastmod': lastmod,
            })

    xml_content = generate_sitemap_index_xml(sitemaps, base_url)

    response = HttpResponse(xml_content, content_type='application/xml')
    response['Cache-Control'] = 'public, max-age=3600'
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def sitemap_by_type(request, sitemap_type: str):
    """Return a sitemap for a specific content type."""
    settings = get_sitemap_settings()

    if not settings.sitemap_enabled:
        raise Http404("Sitemap is disabled")

    if sitemap_type not in SITEMAP_COLLECTORS:
        raise Http404(f"Unknown sitemap type: {sitemap_type}")

    if not is_sitemap_enabled(sitemap_type, settings):
        raise Http404(f"Sitemap type '{sitemap_type}' is disabled")

    base_url = get_base_url(request, settings)
    collector = SITEMAP_COLLECTORS[sitemap_type]
    urls = collector(base_url, settings)

    xml_content = generate_sitemap_xml(urls, base_url)

    response = HttpResponse(xml_content, content_type='application/xml')
    response['Cache-Control'] = 'public, max-age=3600'
    return response


# Keep backward compatibility - sitemap.xml now serves the index
@api_view(['GET'])
@permission_classes([AllowAny])
def sitemap_xml(request):
    """Redirect to sitemap index for backward compatibility."""
    return sitemap_index(request)


@api_view(['GET'])
@permission_classes([AllowAny])
def sitemap_xsl(request):
    """Return XSL stylesheet for human-readable sitemap formatting."""
    xsl_content = '''<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>

<xsl:template match="/">
<html>
<head>
    <title>XML Sitemap</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #1a1a1a;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 10px;
        }
        .description {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #3b82f6;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background: #1e293b;
            color: white;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        tr:hover td {
            background: #f1f5f9;
        }
        a {
            color: #3b82f6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .count {
            color: #64748b;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <h1>XML Sitemap</h1>
    <div class="description">
        <p>This is an XML sitemap, meant for consumption by search engines.</p>
        <p>You can find more information about XML sitemaps at <a href="https://sitemaps.org">sitemaps.org</a>.</p>
    </div>

    <xsl:choose>
        <xsl:when test="sitemap:sitemapindex">
            <p class="count">This sitemap index contains <strong><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></strong> sitemaps.</p>
            <table>
                <tr>
                    <th>Sitemap</th>
                    <th>Last Modified</th>
                </tr>
                <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                    <tr>
                        <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                        <td><xsl:value-of select="sitemap:lastmod"/></td>
                    </tr>
                </xsl:for-each>
            </table>
        </xsl:when>
        <xsl:otherwise>
            <p class="count">This sitemap contains <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs.</p>
            <table>
                <tr>
                    <th>URL</th>
                    <th>Last Modified</th>
                    <th>Images</th>
                </tr>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                    <tr>
                        <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                        <td><xsl:value-of select="sitemap:lastmod"/></td>
                        <td><xsl:value-of select="count(image:image)"/></td>
                    </tr>
                </xsl:for-each>
            </table>
        </xsl:otherwise>
    </xsl:choose>
</body>
</html>
</xsl:template>
</xsl:stylesheet>'''

    response = HttpResponse(xsl_content, content_type='application/xslt+xml')
    response['Cache-Control'] = 'public, max-age=86400'  # 24 hour cache
    return response
