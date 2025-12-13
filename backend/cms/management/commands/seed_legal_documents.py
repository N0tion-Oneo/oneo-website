"""
Management command to seed legal documents (Terms & Conditions, Privacy Policy, etc.).

Usage:
    python manage.py seed_legal_documents
    python manage.py seed_legal_documents --reset  # Delete and recreate all documents
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from cms.models import Page
from cms.models.pages import LegalDocumentType


class Command(BaseCommand):
    help = 'Seed legal documents (Terms & Conditions, Privacy Policy, etc.)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing legal documents and recreate',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Deleting existing legal documents...')
            deleted_count = Page.objects.all().delete()[0]
            self.stdout.write(f'Deleted {deleted_count} documents')

        documents = self.get_legal_documents()
        created_count = 0
        updated_count = 0

        for doc_data in documents:
            doc, created = Page.objects.update_or_create(
                slug=doc_data['slug'],
                defaults=doc_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully seeded legal documents: '
                f'{created_count} created, {updated_count} updated'
            )
        )

    def get_legal_documents(self):
        """Return the list of legal document definitions."""
        today = timezone.now().date()

        return [
            # Terms & Conditions
            {
                'title': 'Terms of Service',
                'slug': 'terms-of-service',
                'document_type': LegalDocumentType.TERMS,
                'version': '1.0',
                'effective_date': today,
                'status': 'published',
                'published_at': timezone.now(),
                'meta_title': 'Terms of Service | Oneo',
                'meta_description': 'Read our Terms of Service to understand the rules and regulations governing your use of Oneo recruitment platform.',
                'content': {
                    'time': int(timezone.now().timestamp() * 1000),
                    'version': '2.28.0',
                    'blocks': [
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Terms of Service',
                                'level': 1
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Last updated: ' + today.strftime('%B %d, %Y')
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Welcome to Oneo. These Terms of Service ("Terms") govern your access to and use of our recruitment platform, website, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '1. Acceptance of Terms',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'By creating an account or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Services.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '2. Eligibility',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'You must be at least 18 years of age to use our Services. By using the Services, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '3. User Accounts',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'To access certain features of our Services, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Provide accurate, current, and complete information during registration',
                                    'Update your information to keep it accurate and current',
                                    'Notify us immediately of any unauthorized access or use of your account',
                                    'Not share your account credentials with any third party'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '4. Acceptable Use',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'You agree to use the Services only for lawful purposes and in accordance with these Terms. You agree not to:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Use the Services in any way that violates any applicable law or regulation',
                                    'Impersonate or attempt to impersonate another person or entity',
                                    'Engage in any conduct that restricts or inhibits anyone\'s use of the Services',
                                    'Upload or transmit viruses, malware, or other malicious code',
                                    'Attempt to gain unauthorized access to our systems or other users\' accounts',
                                    'Use automated means to access or collect data from the Services without our permission'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '5. Intellectual Property',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'The Services and all content, features, and functionality are owned by Oneo and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our Services without our express written permission.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '6. User Content',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'You retain ownership of any content you submit through the Services ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content in connection with providing the Services.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '7. Termination',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We may terminate or suspend your account and access to the Services at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '8. Disclaimer of Warranties',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '9. Limitation of Liability',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, ONEO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '10. Changes to Terms',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the updated Terms on our website or through other communications. Your continued use of the Services after such changes constitutes acceptance of the new Terms.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '11. Contact Us',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'If you have any questions about these Terms, please contact us at legal@oneo.com.'
                            }
                        },
                    ]
                }
            },
            # Privacy Policy
            {
                'title': 'Privacy Policy',
                'slug': 'privacy-policy',
                'document_type': LegalDocumentType.PRIVACY,
                'version': '1.0',
                'effective_date': today,
                'status': 'published',
                'published_at': timezone.now(),
                'meta_title': 'Privacy Policy | Oneo',
                'meta_description': 'Learn how Oneo collects, uses, and protects your personal information when you use our recruitment platform.',
                'content': {
                    'time': int(timezone.now().timestamp() * 1000),
                    'version': '2.28.0',
                    'blocks': [
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Privacy Policy',
                                'level': 1
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Last updated: ' + today.strftime('%B %d, %Y')
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'At Oneo, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our recruitment platform and services.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '1. Information We Collect',
                                'level': 2
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Personal Information',
                                'level': 3
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We collect personal information that you voluntarily provide when using our Services, including:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Name, email address, phone number, and postal address',
                                    'Professional information including work history, education, skills, and qualifications',
                                    'Resume/CV and cover letters',
                                    'Profile photos and other media you upload',
                                    'Login credentials and account preferences',
                                    'Communication preferences and feedback'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Automatically Collected Information',
                                'level': 3
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'When you access our Services, we automatically collect certain information, including:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Device information (browser type, operating system, device identifiers)',
                                    'IP address and location data',
                                    'Usage data (pages visited, time spent, clicks, and interactions)',
                                    'Cookies and similar tracking technologies'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '2. How We Use Your Information',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We use the information we collect to:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Provide, operate, and maintain our Services',
                                    'Process job applications and facilitate the recruitment process',
                                    'Match candidates with relevant job opportunities',
                                    'Communicate with you about your account, applications, and our Services',
                                    'Send you relevant job alerts and updates (with your consent)',
                                    'Improve and personalize your experience',
                                    'Analyze usage patterns and trends to enhance our Services',
                                    'Detect, prevent, and address technical issues and security threats',
                                    'Comply with legal obligations'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '3. Information Sharing and Disclosure',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We may share your information with:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    '<b>Employers and Recruiters:</b> When you apply for jobs or make your profile visible, relevant information is shared with potential employers',
                                    '<b>Service Providers:</b> Third-party vendors who assist us in providing and improving our Services',
                                    '<b>Legal Requirements:</b> When required by law or to protect our rights and safety',
                                    '<b>Business Transfers:</b> In connection with a merger, acquisition, or sale of assets'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '4. Data Security',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '5. Data Retention',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required for legal or legitimate business purposes.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '6. Your Rights and Choices',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Depending on your location, you may have the following rights regarding your personal information:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    '<b>Access:</b> Request a copy of the personal information we hold about you',
                                    '<b>Correction:</b> Request correction of inaccurate or incomplete information',
                                    '<b>Deletion:</b> Request deletion of your personal information',
                                    '<b>Portability:</b> Request a portable copy of your data',
                                    '<b>Opt-out:</b> Unsubscribe from marketing communications at any time',
                                    '<b>Withdraw Consent:</b> Withdraw consent where processing is based on consent'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '7. Cookies and Tracking',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We use cookies and similar tracking technologies to collect information about your browsing activities. You can manage your cookie preferences through your browser settings. For more details, please refer to our Cookie Policy.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '8. International Data Transfers',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '9. Children\'s Privacy',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Our Services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child, we will take steps to delete such information.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '10. Changes to This Policy',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '11. Contact Us',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'If you have any questions about this Privacy Policy or our data practices, please contact our Data Protection Officer at privacy@oneo.com.'
                            }
                        },
                    ]
                }
            },
            # Cookie Policy
            {
                'title': 'Cookie Policy',
                'slug': 'cookie-policy',
                'document_type': LegalDocumentType.COOKIES,
                'version': '1.0',
                'effective_date': today,
                'status': 'published',
                'published_at': timezone.now(),
                'meta_title': 'Cookie Policy | Oneo',
                'meta_description': 'Learn about how Oneo uses cookies and similar technologies to improve your experience on our recruitment platform.',
                'content': {
                    'time': int(timezone.now().timestamp() * 1000),
                    'version': '2.28.0',
                    'blocks': [
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Cookie Policy',
                                'level': 1
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Last updated: ' + today.strftime('%B %d, %Y')
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'This Cookie Policy explains how Oneo uses cookies and similar tracking technologies when you visit our website and use our services. By continuing to use our website, you consent to our use of cookies as described in this policy.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '1. What Are Cookies?',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help the website remember your preferences and understand how you interact with the site, enabling us to provide a better, more personalized experience.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '2. Types of Cookies We Use',
                                'level': 2
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Essential Cookies',
                                'level': 3
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'These cookies are necessary for the website to function properly. They enable core functionality such as security, authentication, and accessibility. You cannot opt out of these cookies as the website would not function without them.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Performance Cookies',
                                'level': 3
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'These cookies help us understand how visitors interact with our website by collecting information about pages visited, time spent on site, and any errors encountered. This information is used to improve the performance and usability of our website.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Functionality Cookies',
                                'level': 3
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'These cookies allow the website to remember choices you make (such as your preferred language or region) and provide enhanced, more personalized features. They may also be used to provide services you have requested.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Analytics Cookies',
                                'level': 3
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We use analytics cookies (such as Google Analytics) to collect information about how visitors use our website. This helps us analyze website traffic, understand user behavior, and improve our services. The information collected is aggregated and anonymous.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '3. Third-Party Cookies',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Some cookies may be placed by third-party services that appear on our pages. We do not control these cookies and recommend reviewing the privacy policies of these third parties for more information about their cookies.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '4. Managing Cookies',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'You can control and manage cookies in various ways:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    '<b>Browser Settings:</b> Most browsers allow you to view, delete, and block cookies. Note that blocking all cookies may affect website functionality.',
                                    '<b>Cookie Preferences:</b> You can adjust your cookie preferences through our cookie consent banner.',
                                    '<b>Opt-Out Links:</b> For analytics cookies, you can opt out using the Google Analytics opt-out browser add-on.'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '5. Cookie Duration',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Cookies can be either session cookies or persistent cookies. Session cookies are temporary and are deleted when you close your browser. Persistent cookies remain on your device for a set period or until you delete them.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '6. Updates to This Policy',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, regulatory, or operational reasons. We encourage you to review this policy periodically.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '7. Contact Us',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'If you have any questions about our use of cookies, please contact us at privacy@oneo.com.'
                            }
                        },
                    ]
                }
            },
            # Acceptable Use Policy
            {
                'title': 'Acceptable Use Policy',
                'slug': 'acceptable-use-policy',
                'document_type': LegalDocumentType.ACCEPTABLE_USE,
                'version': '1.0',
                'effective_date': today,
                'status': 'published',
                'published_at': timezone.now(),
                'meta_title': 'Acceptable Use Policy | Oneo',
                'meta_description': 'Understand the acceptable use guidelines for the Oneo recruitment platform to ensure a safe and professional environment.',
                'content': {
                    'time': int(timezone.now().timestamp() * 1000),
                    'version': '2.28.0',
                    'blocks': [
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Acceptable Use Policy',
                                'level': 1
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Last updated: ' + today.strftime('%B %d, %Y')
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'This Acceptable Use Policy outlines the standards of conduct that all users must follow when using the Oneo platform. By using our services, you agree to comply with this policy.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '1. Purpose',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'The Oneo platform is designed to facilitate professional recruitment activities, connecting talented candidates with employers seeking to fill positions. All usage of the platform should be consistent with this purpose.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '2. Prohibited Activities',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'You may not use the Oneo platform to:'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Illegal Activities',
                                'level': 3
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Engage in any activity that violates applicable laws or regulations',
                                    'Post fraudulent job listings or employment scams',
                                    'Collect personal information for illegal purposes',
                                    'Discriminate against candidates based on protected characteristics'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Harmful Content',
                                'level': 3
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Post content that is defamatory, harassing, or threatening',
                                    'Upload malicious software, viruses, or harmful code',
                                    'Share inappropriate, offensive, or explicit content',
                                    'Misrepresent your identity, qualifications, or company information'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': 'Platform Abuse',
                                'level': 3
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Create multiple accounts to circumvent restrictions',
                                    'Use automated tools to scrape data without authorization',
                                    'Attempt to access accounts or systems without permission',
                                    'Interfere with the proper operation of the platform',
                                    'Send unsolicited bulk messages or spam'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '3. Professional Conduct',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'All users are expected to maintain professional standards:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Communicate respectfully with all platform users',
                                    'Provide accurate information in profiles and job postings',
                                    'Respond to communications in a timely manner',
                                    'Respect the confidentiality of private conversations',
                                    'Honor commitments made through the platform'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '4. Reporting Violations',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'If you encounter content or behavior that violates this policy, please report it immediately to our support team at support@oneo.com. We take all reports seriously and will investigate promptly.'
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '5. Consequences of Violations',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'Violations of this Acceptable Use Policy may result in:'
                            }
                        },
                        {
                            'type': 'list',
                            'data': {
                                'style': 'unordered',
                                'items': [
                                    'Warning or notification of the violation',
                                    'Temporary suspension of account access',
                                    'Permanent termination of your account',
                                    'Legal action where appropriate',
                                    'Reporting to relevant authorities'
                                ]
                            }
                        },
                        {
                            'type': 'header',
                            'data': {
                                'text': '6. Contact Us',
                                'level': 2
                            }
                        },
                        {
                            'type': 'paragraph',
                            'data': {
                                'text': 'If you have questions about this Acceptable Use Policy, please contact us at legal@oneo.com.'
                            }
                        },
                    ]
                }
            },
        ]
