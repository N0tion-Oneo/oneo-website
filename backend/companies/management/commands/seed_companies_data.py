from django.core.management.base import BaseCommand
from companies.models import Company, CompanySize, FundingStage
from candidates.models import Industry


SAMPLE_COMPANIES = [
    {
        "name": "TechForward Solutions",
        "tagline": "Building the future of work",
        "description": "TechForward Solutions is a leading software development company specializing in enterprise solutions and digital transformation. We help businesses modernize their operations through innovative technology.",
        "industry_slug": "technology",
        "company_size": CompanySize.SIZE_51_200,
        "founded_year": 2015,
        "funding_stage": FundingStage.SERIES_B,
        "website_url": "https://techforward.example.com",
        "linkedin_url": "https://linkedin.com/company/techforward",
        "headquarters_city": "Cape Town",
        "headquarters_country": "South Africa",
        "culture_description": "We foster a culture of innovation, collaboration, and continuous learning. Our team is passionate about solving complex problems and delivering exceptional results.",
        "values": ["Innovation", "Integrity", "Collaboration", "Excellence", "Diversity"],
        "benefits": [
            {"category": "Health & Wellness", "items": ["Medical aid contribution", "Mental health support", "Gym membership"]},
            {"category": "Financial", "items": ["Competitive salary", "Performance bonus", "Stock options"]},
            {"category": "Time Off", "items": ["25 days annual leave", "Flexible working hours", "Remote work options"]},
        ],
        "tech_stack": ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "Docker", "Kubernetes"],
        "interview_process": "1. Initial screening call (30 min)\n2. Technical assessment (take-home)\n3. Technical interview (1 hour)\n4. Culture fit interview (45 min)\n5. Final offer discussion",
        "remote_work_policy": "We offer a hybrid work environment with 2-3 days in office per week. Fully remote positions are available for certain roles.",
        "is_published": True,
    },
    {
        "name": "DataMind Analytics",
        "tagline": "Transform data into decisions",
        "description": "DataMind Analytics is a data science consultancy helping organizations unlock insights from their data. We specialize in machine learning, AI solutions, and business intelligence.",
        "industry_slug": "technology",
        "company_size": CompanySize.SIZE_11_50,
        "founded_year": 2019,
        "funding_stage": FundingStage.SEED,
        "website_url": "https://datamind.example.com",
        "linkedin_url": "https://linkedin.com/company/datamind",
        "headquarters_city": "Johannesburg",
        "headquarters_country": "South Africa",
        "culture_description": "We believe in data-driven decision making and continuous experimentation. Our team is made up of curious minds who love tackling challenging problems.",
        "values": ["Curiosity", "Data-Driven", "Transparency", "Growth Mindset"],
        "benefits": [
            {"category": "Health & Wellness", "items": ["Medical aid", "Wellness budget"]},
            {"category": "Professional Development", "items": ["Conference budget", "Learning stipend", "Mentorship program"]},
            {"category": "Perks", "items": ["Latest MacBook", "Home office setup allowance"]},
        ],
        "tech_stack": ["Python", "TensorFlow", "PyTorch", "Apache Spark", "Snowflake", "dbt", "Airflow"],
        "interview_process": "1. HR screening (20 min)\n2. Case study presentation\n3. Technical deep dive (1.5 hours)\n4. Team meet & greet\n5. Offer",
        "remote_work_policy": "Remote-first company with optional co-working space access.",
        "is_published": True,
    },
    {
        "name": "FinanceFlow",
        "tagline": "Simplifying financial management",
        "description": "FinanceFlow is a fintech startup building modern financial management tools for small and medium businesses. Our platform helps businesses track expenses, manage invoices, and forecast cash flow.",
        "industry_slug": "financial-services",
        "company_size": CompanySize.SIZE_11_50,
        "founded_year": 2021,
        "funding_stage": FundingStage.SERIES_A,
        "website_url": "https://financeflow.example.com",
        "linkedin_url": "https://linkedin.com/company/financeflow",
        "headquarters_city": "Durban",
        "headquarters_country": "South Africa",
        "culture_description": "Move fast and ship quality. We're a tight-knit team that values ownership, speed, and customer obsession.",
        "values": ["Customer First", "Ownership", "Speed", "Quality", "Teamwork"],
        "benefits": [
            {"category": "Financial", "items": ["Equity package", "Competitive salary", "Annual bonus"]},
            {"category": "Time Off", "items": ["Unlimited PTO", "Work from anywhere month"]},
            {"category": "Perks", "items": ["Latest tech gear", "Weekly team lunches", "Quarterly offsites"]},
        ],
        "tech_stack": ["Next.js", "TypeScript", "Go", "PostgreSQL", "Redis", "GCP", "Terraform"],
        "interview_process": "1. Quick chat with founder (30 min)\n2. Technical challenge (live coding)\n3. System design discussion\n4. Offer within 48 hours",
        "remote_work_policy": "Fully remote with quarterly in-person team gatherings.",
        "is_published": True,
    },
    {
        "name": "GreenTech Africa",
        "tagline": "Sustainable solutions for a better tomorrow",
        "description": "GreenTech Africa develops renewable energy solutions and smart grid technologies. We're on a mission to accelerate Africa's transition to clean energy.",
        "industry_slug": "energy",
        "company_size": CompanySize.SIZE_51_200,
        "founded_year": 2012,
        "funding_stage": FundingStage.SERIES_C,
        "website_url": "https://greentech.example.com",
        "linkedin_url": "https://linkedin.com/company/greentech-africa",
        "headquarters_city": "Cape Town",
        "headquarters_country": "South Africa",
        "culture_description": "We're driven by purpose and passionate about sustainability. Our diverse team brings together engineers, scientists, and business professionals united by a common goal.",
        "values": ["Sustainability", "Innovation", "Impact", "Integrity", "Collaboration"],
        "benefits": [
            {"category": "Health & Wellness", "items": ["Comprehensive medical aid", "Wellness programs", "EAP services"]},
            {"category": "Financial", "items": ["Market-rate salary", "Pension fund", "Life insurance"]},
            {"category": "Family", "items": ["Parental leave", "Childcare support", "Family health coverage"]},
        ],
        "tech_stack": ["Python", "Django", "React", "IoT sensors", "AWS IoT", "TimescaleDB", "Grafana"],
        "interview_process": "1. HR interview\n2. Technical assessment\n3. Panel interview with team leads\n4. Reference checks\n5. Final offer",
        "remote_work_policy": "Hybrid model with flexible office days. Some roles require on-site presence for hardware work.",
        "is_published": True,
    },
    {
        "name": "HealthBridge Digital",
        "tagline": "Connecting patients with care",
        "description": "HealthBridge Digital is transforming healthcare access through telemedicine and digital health solutions. Our platform connects patients with healthcare providers across Africa.",
        "industry_slug": "healthcare",
        "company_size": CompanySize.SIZE_11_50,
        "founded_year": 2020,
        "funding_stage": FundingStage.SERIES_A,
        "website_url": "https://healthbridge.example.com",
        "linkedin_url": "https://linkedin.com/company/healthbridge",
        "headquarters_city": "Johannesburg",
        "headquarters_country": "South Africa",
        "culture_description": "We're mission-driven and patient-focused. Every decision we make is guided by our commitment to improving healthcare access.",
        "values": ["Patient First", "Empathy", "Innovation", "Accessibility", "Trust"],
        "benefits": [
            {"category": "Health & Wellness", "items": ["Premium medical aid", "Mental health support", "Telemedicine access"]},
            {"category": "Professional Development", "items": ["Learning budget", "Conference attendance", "Internal training"]},
            {"category": "Work-Life Balance", "items": ["Flexible hours", "Remote work", "Generous PTO"]},
        ],
        "tech_stack": ["React Native", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Redis", "AWS"],
        "interview_process": "1. Initial call with HR\n2. Technical assessment\n3. Interview with hiring manager\n4. Culture interview\n5. Offer",
        "remote_work_policy": "Remote-first with optional office in Johannesburg. Occasional in-person meetings for team building.",
        "is_published": True,
    },
]


class Command(BaseCommand):
    help = 'Seed sample company data for development'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for company_data in SAMPLE_COMPANIES:
            industry_slug = company_data.pop('industry_slug', None)
            industry = None
            if industry_slug:
                try:
                    industry = Industry.objects.get(slug=industry_slug, is_active=True)
                except Industry.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"Industry '{industry_slug}' not found, skipping industry assignment")
                    )

            company, created = Company.objects.update_or_create(
                name=company_data['name'],
                defaults={
                    **company_data,
                    'industry': industry,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created company: {company.name}"))
            else:
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f"Updated company: {company.name}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone! Created {created_count}, Updated {updated_count} companies"))
