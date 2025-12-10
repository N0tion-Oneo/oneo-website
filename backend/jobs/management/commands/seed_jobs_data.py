import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from companies.models import Company
from candidates.models import CandidateProfile, Technology, Skill
from users.models import User, UserRole
from jobs.models import (
    Job, JobStatus, JobType, WorkMode, Department,
    Application, ApplicationStatus, ApplicationSource,
    InterviewStageTemplate, StageType,
    ApplicationStageInstance, StageInstanceStatus,
)


SAMPLE_JOBS = [
    {
        "title": "Senior Full Stack Developer",
        "seniority": "senior",
        "job_type": JobType.FULL_TIME,
        "department": Department.ENGINEERING,
        "work_mode": WorkMode.HYBRID,
        "summary": "We're looking for an experienced Full Stack Developer to join our growing engineering team and help build innovative solutions.",
        "description": """
We are seeking a Senior Full Stack Developer to join our team. You'll work on challenging projects, collaborating with cross-functional teams to deliver high-quality software solutions.

As a senior member of the team, you'll mentor junior developers, participate in architecture decisions, and help shape our technical direction.
        """.strip(),
        "requirements": """
- 5+ years of experience in full-stack development
- Strong proficiency in React, TypeScript, and Node.js
- Experience with PostgreSQL and Redis
- Familiarity with cloud platforms (AWS, GCP, or Azure)
- Excellent problem-solving and communication skills
- Experience with CI/CD pipelines and DevOps practices
        """.strip(),
        "nice_to_haves": """
- Experience with microservices architecture
- Knowledge of Kubernetes and Docker
- Contributions to open-source projects
- Experience in a startup environment
        """.strip(),
        "responsibilities": """
- Design and implement new features across the full stack
- Write clean, maintainable, and well-tested code
- Participate in code reviews and provide constructive feedback
- Mentor junior team members
- Collaborate with product and design teams
- Contribute to technical planning and architecture decisions
        """.strip(),
        "salary_min": 800000,
        "salary_max": 1200000,
        "salary_currency": "ZAR",
        "positions_to_fill": 2,
        "tech_stack": ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis", "AWS", "Docker"],
        "skills": ["Team Collaboration", "Problem Solving", "Code Review", "Technical Leadership"],
        "stages": [
            {"type": StageType.PHONE_SCREENING, "name": "Initial Call", "duration": 30},
            {"type": StageType.TAKE_HOME_ASSESSMENT, "name": "Technical Assessment", "duration": None},
            {"type": StageType.VIDEO_CALL, "name": "Technical Interview", "duration": 60},
            {"type": StageType.VIDEO_CALL, "name": "Culture Fit", "duration": 45},
        ],
    },
    {
        "title": "Data Engineer",
        "seniority": "mid",
        "job_type": JobType.FULL_TIME,
        "department": Department.DATA,
        "work_mode": WorkMode.REMOTE,
        "summary": "Join our data team to build robust data pipelines and infrastructure that power our analytics and ML initiatives.",
        "description": """
We're looking for a Data Engineer to help us build and maintain our data infrastructure. You'll work closely with data scientists and analysts to ensure they have access to clean, reliable data.

This is a fully remote position with flexible working hours.
        """.strip(),
        "requirements": """
- 3+ years of experience in data engineering
- Strong Python skills
- Experience with Apache Spark, Airflow, or similar tools
- Proficiency in SQL and data modeling
- Experience with cloud data warehouses (Snowflake, BigQuery, or Redshift)
- Understanding of data quality and governance principles
        """.strip(),
        "nice_to_haves": """
- Experience with dbt
- Knowledge of streaming technologies (Kafka, Kinesis)
- Machine learning pipeline experience
- Previous work in a data-driven organization
        """.strip(),
        "responsibilities": """
- Build and maintain data pipelines using modern tools
- Design and implement data models
- Ensure data quality and reliability
- Collaborate with data scientists on feature engineering
- Document data processes and lineage
- Optimize query performance
        """.strip(),
        "salary_min": 600000,
        "salary_max": 900000,
        "salary_currency": "ZAR",
        "positions_to_fill": 1,
        "tech_stack": ["Python", "Apache Spark", "PostgreSQL", "AWS", "Docker"],
        "skills": ["Data Analysis", "Problem Solving", "Documentation"],
        "stages": [
            {"type": StageType.PHONE_SCREENING, "name": "Recruiter Screen", "duration": 20},
            {"type": StageType.VIDEO_CALL, "name": "Technical Deep Dive", "duration": 90},
            {"type": StageType.VIDEO_CALL, "name": "Team Interview", "duration": 45},
        ],
    },
    {
        "title": "Product Manager",
        "seniority": "senior",
        "job_type": JobType.FULL_TIME,
        "department": Department.PRODUCT,
        "work_mode": WorkMode.HYBRID,
        "summary": "Lead product strategy and execution for our core platform, working closely with engineering and design teams.",
        "description": """
We're seeking an experienced Product Manager to own our core product roadmap. You'll work at the intersection of business, technology, and user experience to deliver products that delight our customers.
        """.strip(),
        "requirements": """
- 5+ years of product management experience
- Experience in B2B SaaS products
- Strong analytical skills and data-driven mindset
- Excellent communication and stakeholder management skills
- Ability to translate business requirements into product specifications
- Experience with agile methodologies
        """.strip(),
        "nice_to_haves": """
- Technical background or CS degree
- Experience with product analytics tools
- Previous startup experience
- Domain expertise in our industry
        """.strip(),
        "responsibilities": """
- Define and own the product roadmap
- Gather and prioritize product requirements
- Work closely with engineering and design teams
- Analyze market trends and competitive landscape
- Define and track key product metrics
- Present product strategy to stakeholders
        """.strip(),
        "salary_min": 900000,
        "salary_max": 1400000,
        "salary_currency": "ZAR",
        "positions_to_fill": 1,
        "tech_stack": ["Jira", "Figma", "Notion"],
        "skills": ["Strategic Planning", "Stakeholder Communication", "Requirements Gathering", "Product Strategy"],
        "stages": [
            {"type": StageType.PHONE_SCREENING, "name": "Initial Screen", "duration": 30},
            {"type": StageType.VIDEO_CALL, "name": "Case Study", "duration": 60},
            {"type": StageType.IN_PERSON_INTERVIEW, "name": "On-site Interview", "duration": 180},
        ],
    },
    {
        "title": "Junior Frontend Developer",
        "seniority": "junior",
        "job_type": JobType.FULL_TIME,
        "department": Department.ENGINEERING,
        "work_mode": WorkMode.ONSITE,
        "summary": "Start your career with us! We're looking for a motivated junior developer to join our frontend team.",
        "description": """
This is an excellent opportunity for someone starting their development career. You'll work alongside experienced developers who will mentor you and help you grow.

We value learning and provide time for personal development, conference attendance, and training.
        """.strip(),
        "requirements": """
- Degree in Computer Science or related field (or equivalent experience)
- Basic knowledge of HTML, CSS, and JavaScript
- Familiarity with React or similar framework
- Eagerness to learn and grow
- Good communication skills
        """.strip(),
        "nice_to_haves": """
- Personal projects or portfolio
- Contributions to open source
- Knowledge of TypeScript
- UI/UX design interest
        """.strip(),
        "responsibilities": """
- Implement UI components under guidance
- Fix bugs and improve existing code
- Write unit tests
- Participate in code reviews
- Learn best practices from senior developers
- Contribute to team discussions
        """.strip(),
        "salary_min": 300000,
        "salary_max": 450000,
        "salary_currency": "ZAR",
        "positions_to_fill": 2,
        "tech_stack": ["React", "TypeScript", "TailwindCSS"],
        "skills": ["Team Collaboration", "Continuous Learning"],
        "stages": [
            {"type": StageType.PHONE_SCREENING, "name": "HR Chat", "duration": 20},
            {"type": StageType.TAKE_HOME_ASSESSMENT, "name": "Coding Challenge", "duration": None},
            {"type": StageType.VIDEO_CALL, "name": "Technical Interview", "duration": 45},
        ],
    },
    {
        "title": "DevOps Engineer",
        "seniority": "mid",
        "job_type": JobType.FULL_TIME,
        "department": Department.ENGINEERING,
        "work_mode": WorkMode.REMOTE,
        "summary": "Help us build and maintain reliable infrastructure that scales with our growth.",
        "description": """
We're looking for a DevOps Engineer to join our platform team. You'll be responsible for our cloud infrastructure, CI/CD pipelines, and ensuring high availability of our services.
        """.strip(),
        "requirements": """
- 3+ years of DevOps/SRE experience
- Strong experience with AWS or GCP
- Proficiency with Terraform or similar IaC tools
- Experience with Kubernetes and Docker
- Strong Linux administration skills
- Knowledge of monitoring and observability tools
        """.strip(),
        "nice_to_haves": """
- Experience with multiple cloud providers
- Security certifications
- Programming skills in Python or Go
- Experience with GitOps practices
        """.strip(),
        "responsibilities": """
- Manage and optimize cloud infrastructure
- Build and maintain CI/CD pipelines
- Implement monitoring and alerting
- Ensure security best practices
- Automate operational tasks
- Support development teams
        """.strip(),
        "salary_min": 700000,
        "salary_max": 1000000,
        "salary_currency": "ZAR",
        "positions_to_fill": 1,
        "tech_stack": ["AWS", "Terraform", "Kubernetes", "Docker", "GitHub Actions", "Prometheus", "Grafana"],
        "skills": ["DevOps Practices", "Cloud Architecture", "Security Best Practices"],
        "stages": [
            {"type": StageType.PHONE_SCREENING, "name": "Initial Call", "duration": 30},
            {"type": StageType.VIDEO_CALL, "name": "Technical Interview", "duration": 60},
            {"type": StageType.VIDEO_CALL, "name": "System Design", "duration": 60},
        ],
    },
    {
        "title": "UX Designer",
        "seniority": "mid",
        "job_type": JobType.FULL_TIME,
        "department": Department.DESIGN,
        "work_mode": WorkMode.HYBRID,
        "summary": "Create beautiful, intuitive user experiences that solve real problems for our customers.",
        "description": """
We're looking for a UX Designer to join our product team. You'll work on all aspects of the user experience, from research to final designs.
        """.strip(),
        "requirements": """
- 3+ years of UX design experience
- Strong portfolio demonstrating UX process
- Proficiency in Figma or similar tools
- Experience with user research methods
- Excellent communication and presentation skills
- Ability to work collaboratively with engineers
        """.strip(),
        "nice_to_haves": """
- Experience with design systems
- Basic prototyping skills
- Knowledge of accessibility standards
- B2B product experience
        """.strip(),
        "responsibilities": """
- Conduct user research and usability testing
- Create wireframes, prototypes, and high-fidelity designs
- Collaborate with product managers and engineers
- Maintain and evolve our design system
- Present designs to stakeholders
- Advocate for user-centered design
        """.strip(),
        "salary_min": 500000,
        "salary_max": 750000,
        "salary_currency": "ZAR",
        "positions_to_fill": 1,
        "tech_stack": ["Figma", "Adobe XD"],
        "skills": ["Creativity", "Presentation Skills", "Customer Focus"],
        "stages": [
            {"type": StageType.PHONE_SCREENING, "name": "Initial Screen", "duration": 30},
            {"type": StageType.VIDEO_CALL, "name": "Portfolio Review", "duration": 60},
            {"type": StageType.VIDEO_CALL, "name": "Design Challenge", "duration": 90},
        ],
    },
    {
        "title": "Backend Developer",
        "seniority": "mid",
        "job_type": JobType.CONTRACT,
        "department": Department.ENGINEERING,
        "work_mode": WorkMode.REMOTE,
        "summary": "6-month contract to help us build our new microservices architecture.",
        "description": """
We have an exciting 6-month contract opportunity for a Backend Developer to help us transition to a microservices architecture. This could lead to a permanent position.
        """.strip(),
        "requirements": """
- 4+ years of backend development experience
- Strong Python or Go skills
- Experience with microservices
- Knowledge of API design best practices
- Experience with message queues (RabbitMQ, Kafka)
- Database design skills
        """.strip(),
        "nice_to_haves": """
- Experience with Django or FastAPI
- Knowledge of event-driven architecture
- Previous contracting experience
- Domain-driven design experience
        """.strip(),
        "responsibilities": """
- Design and implement microservices
- Define API contracts
- Write comprehensive tests
- Document architecture decisions
- Collaborate with the existing team
- Knowledge transfer to permanent staff
        """.strip(),
        "salary_min": 800000,
        "salary_max": 1100000,
        "salary_currency": "ZAR",
        "positions_to_fill": 1,
        "tech_stack": ["Python", "Django", "PostgreSQL", "Redis", "Docker", "RabbitMQ"],
        "skills": ["System Design", "API Design", "Documentation"],
        "stages": [
            {"type": StageType.PHONE_SCREENING, "name": "Initial Call", "duration": 30},
            {"type": StageType.VIDEO_CALL, "name": "Technical Discussion", "duration": 60},
        ],
    },
    {
        "title": "Mobile Developer (React Native)",
        "seniority": "senior",
        "job_type": JobType.FULL_TIME,
        "department": Department.ENGINEERING,
        "work_mode": WorkMode.HYBRID,
        "summary": "Lead mobile development for our iOS and Android apps using React Native.",
        "description": """
We're looking for a Senior Mobile Developer to lead our React Native development. You'll be responsible for our mobile apps on both iOS and Android platforms.
        """.strip(),
        "requirements": """
- 5+ years of mobile development experience
- 3+ years with React Native
- Experience publishing apps to App Store and Play Store
- Knowledge of native iOS or Android development
- Strong TypeScript skills
- Experience with mobile testing frameworks
        """.strip(),
        "nice_to_haves": """
- Experience with app performance optimization
- Knowledge of mobile security best practices
- Experience with push notifications
- CI/CD for mobile apps
        """.strip(),
        "responsibilities": """
- Lead React Native development
- Architect mobile solutions
- Ensure app performance and quality
- Mentor junior mobile developers
- Collaborate with backend team on APIs
- Manage app store releases
        """.strip(),
        "salary_min": 850000,
        "salary_max": 1250000,
        "salary_currency": "ZAR",
        "positions_to_fill": 1,
        "tech_stack": ["React Native", "TypeScript", "Redux"],
        "skills": ["Technical Leadership", "Problem Solving", "Mentoring"],
        "stages": [
            {"type": StageType.PHONE_SCREENING, "name": "Initial Screen", "duration": 30},
            {"type": StageType.TAKE_HOME_ASSESSMENT, "name": "Mobile Challenge", "duration": None},
            {"type": StageType.VIDEO_CALL, "name": "Technical Deep Dive", "duration": 90},
            {"type": StageType.VIDEO_CALL, "name": "Team Fit", "duration": 45},
        ],
    },
]


class Command(BaseCommand):
    help = 'Seeds the database with sample jobs and applications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing jobs and applications before seeding',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing jobs and applications...')
            Application.objects.all().delete()
            Job.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared all jobs and applications'))

        # Get companies
        companies = list(Company.objects.filter(is_published=True))
        if not companies:
            self.stdout.write(self.style.ERROR(
                'No published companies found. Run seed_companies_data first.'
            ))
            return

        # Get candidates
        candidates = list(CandidateProfile.objects.select_related('user').all())
        if not candidates:
            self.stdout.write(self.style.WARNING(
                'No candidates found. Jobs will be created without applications.'
            ))

        # Get staff users for assignment
        staff_users = list(User.objects.filter(role__in=[UserRole.ADMIN, UserRole.RECRUITER]))

        self.stdout.write(f'Found {len(companies)} companies, {len(candidates)} candidates')

        jobs_created = 0
        applications_created = 0

        for job_data in SAMPLE_JOBS:
            # Pick a random company
            company = random.choice(companies)

            # Extract related data
            tech_stack = job_data.pop('tech_stack', [])
            skills_list = job_data.pop('skills', [])
            stages_data = job_data.pop('stages', [])

            # Create the job
            job = Job.objects.create(
                company=company,
                created_by=random.choice(staff_users) if staff_users else None,
                status=JobStatus.PUBLISHED,
                published_at=timezone.now() - timedelta(days=random.randint(1, 30)),
                **job_data
            )

            # Add technologies
            for tech_name in tech_stack:
                try:
                    tech = Technology.objects.get(name=tech_name)
                    job.technologies.add(tech)
                except Technology.DoesNotExist:
                    pass

            # Add skills
            for skill_name in skills_list:
                try:
                    skill = Skill.objects.get(name=skill_name)
                    job.required_skills.add(skill)
                except Skill.DoesNotExist:
                    pass

            # Assign recruiters
            if staff_users:
                num_recruiters = min(random.randint(1, 2), len(staff_users))
                job.assigned_recruiters.set(random.sample(staff_users, num_recruiters))

            # Create interview stages
            for order, stage_data in enumerate(stages_data, start=1):
                InterviewStageTemplate.objects.create(
                    job=job,
                    stage_type=stage_data['type'],
                    name=stage_data['name'],
                    order=order,
                    default_duration_minutes=stage_data.get('duration'),
                )

            jobs_created += 1
            self.stdout.write(self.style.SUCCESS(f'Created job: {job.title} at {company.name}'))

            # Create applications for this job
            if candidates:
                # Randomly select some candidates to apply
                num_applicants = min(random.randint(3, 12), len(candidates))
                applicants = random.sample(candidates, num_applicants)

                for candidate in applicants:
                    # Skip if application already exists
                    if Application.objects.filter(job=job, candidate=candidate).exists():
                        continue

                    # Random status distribution
                    status_weights = [
                        (ApplicationStatus.APPLIED, 30),
                        (ApplicationStatus.SHORTLISTED, 25),
                        (ApplicationStatus.IN_PROGRESS, 20),
                        (ApplicationStatus.OFFER_MADE, 10),
                        (ApplicationStatus.OFFER_ACCEPTED, 5),
                        (ApplicationStatus.REJECTED, 10),
                    ]
                    statuses, weights = zip(*status_weights)
                    status = random.choices(statuses, weights=weights)[0]

                    # Create application
                    applied_at = timezone.now() - timedelta(days=random.randint(1, 28))
                    application = Application.objects.create(
                        job=job,
                        candidate=candidate,
                        status=status,
                        source=random.choice([ApplicationSource.DIRECT, ApplicationSource.RECRUITER]),
                        covering_statement=f"I am excited to apply for the {job.title} position at {company.name}.",
                    )
                    # Update applied_at manually
                    Application.objects.filter(pk=application.pk).update(applied_at=applied_at)

                    # Set stage-specific timestamps and data
                    if status in [ApplicationStatus.SHORTLISTED, ApplicationStatus.IN_PROGRESS,
                                  ApplicationStatus.OFFER_MADE, ApplicationStatus.OFFER_ACCEPTED]:
                        application.shortlisted_at = applied_at + timedelta(days=random.randint(1, 3))
                        application.save(update_fields=['shortlisted_at'])

                    if status == ApplicationStatus.OFFER_MADE:
                        application.offer_made_at = applied_at + timedelta(days=random.randint(7, 14))
                        application.offer_details = {
                            'salary': random.randint(job.salary_min or 500000, job.salary_max or 1000000),
                            'currency': job.salary_currency,
                            'start_date': (timezone.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                        }
                        application.save(update_fields=['offer_made_at', 'offer_details'])

                    if status == ApplicationStatus.OFFER_ACCEPTED:
                        application.offer_made_at = applied_at + timedelta(days=random.randint(7, 14))
                        application.offer_accepted_at = application.offer_made_at + timedelta(days=random.randint(1, 5))
                        application.offer_details = {
                            'salary': random.randint(job.salary_min or 500000, job.salary_max or 1000000),
                            'currency': job.salary_currency,
                            'start_date': (timezone.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                        }
                        application.final_offer_details = application.offer_details
                        application.save(update_fields=['offer_made_at', 'offer_accepted_at', 'offer_details', 'final_offer_details'])

                    if status == ApplicationStatus.REJECTED:
                        application.rejected_at = applied_at + timedelta(days=random.randint(3, 10))
                        application.rejection_reason = random.choice([
                            'internal_rejection',
                            'client_rejection',
                        ])
                        application.save(update_fields=['rejected_at', 'rejection_reason'])

                    # Create stage instances for in-progress applications
                    if status in [ApplicationStatus.IN_PROGRESS, ApplicationStatus.OFFER_MADE, ApplicationStatus.OFFER_ACCEPTED]:
                        stages = job.stage_templates.all()
                        current_stage = None
                        for stage in stages:
                            # Determine how far they've progressed
                            progress_chance = 0.7 if status == ApplicationStatus.OFFER_ACCEPTED else 0.5
                            if random.random() < progress_chance:
                                instance = ApplicationStageInstance.objects.create(
                                    application=application,
                                    stage_template=stage,
                                    status=StageInstanceStatus.COMPLETED,
                                    completed_at=applied_at + timedelta(days=random.randint(3, 14)),
                                    feedback="Good performance in this stage.",
                                    score=random.randint(3, 5),
                                    recommendation=random.choice(['yes', 'strong_yes']),
                                )
                                current_stage = stage
                            else:
                                # Current stage
                                instance = ApplicationStageInstance.objects.create(
                                    application=application,
                                    stage_template=stage,
                                    status=StageInstanceStatus.SCHEDULED if stage.requires_scheduling else StageInstanceStatus.NOT_STARTED,
                                    scheduled_at=timezone.now() + timedelta(days=random.randint(1, 7)) if stage.requires_scheduling else None,
                                )
                                current_stage = stage
                                break

                        if current_stage:
                            application.current_stage = current_stage
                            application.save(update_fields=['current_stage'])

                    applications_created += 1

                # Update the job's applications_count after creating all applications for this job
                job.applications_count = Application.objects.filter(job=job).count()
                job.save(update_fields=['applications_count'])

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created {jobs_created} jobs and {applications_created} applications'
        ))
