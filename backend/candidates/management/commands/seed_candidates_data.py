from django.core.management.base import BaseCommand
from candidates.models import Skill, Industry, Technology, SkillCategory, TechnologyCategory


class Command(BaseCommand):
    help = 'Seeds the database with skills, technologies, and industries'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing skills and technologies before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing skills and technologies...')
            Skill.objects.all().delete()
            Technology.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared all skills and technologies'))

        self.stdout.write('Seeding skills, technologies, and industries...')

        # ============================================================================
        # Professional Skills (Workplace/Soft Skills)
        # ============================================================================
        skills_data = [
            # Leadership & Management
            ('Leadership', SkillCategory.LEADERSHIP),
            ('Team Management', SkillCategory.LEADERSHIP),
            ('People Management', SkillCategory.LEADERSHIP),
            ('Strategic Planning', SkillCategory.LEADERSHIP),
            ('Decision Making', SkillCategory.LEADERSHIP),
            ('Delegation', SkillCategory.LEADERSHIP),
            ('Mentoring', SkillCategory.LEADERSHIP),
            ('Coaching', SkillCategory.LEADERSHIP),
            ('Conflict Resolution', SkillCategory.LEADERSHIP),
            ('Change Management', SkillCategory.LEADERSHIP),

            # Communication
            ('Written Communication', SkillCategory.COMMUNICATION),
            ('Verbal Communication', SkillCategory.COMMUNICATION),
            ('Presentation Skills', SkillCategory.COMMUNICATION),
            ('Public Speaking', SkillCategory.COMMUNICATION),
            ('Active Listening', SkillCategory.COMMUNICATION),
            ('Stakeholder Communication', SkillCategory.COMMUNICATION),
            ('Technical Writing', SkillCategory.COMMUNICATION),
            ('Documentation', SkillCategory.COMMUNICATION),
            ('Cross-functional Communication', SkillCategory.COMMUNICATION),

            # Project Management
            ('Project Management', SkillCategory.PROJECT_MANAGEMENT),
            ('Agile Methodologies', SkillCategory.PROJECT_MANAGEMENT),
            ('Scrum', SkillCategory.PROJECT_MANAGEMENT),
            ('Kanban', SkillCategory.PROJECT_MANAGEMENT),
            ('Sprint Planning', SkillCategory.PROJECT_MANAGEMENT),
            ('Risk Management', SkillCategory.PROJECT_MANAGEMENT),
            ('Resource Planning', SkillCategory.PROJECT_MANAGEMENT),
            ('Roadmap Development', SkillCategory.PROJECT_MANAGEMENT),
            ('Backlog Management', SkillCategory.PROJECT_MANAGEMENT),
            ('Release Management', SkillCategory.PROJECT_MANAGEMENT),

            # Analytical & Problem Solving
            ('Problem Solving', SkillCategory.ANALYTICAL),
            ('Critical Thinking', SkillCategory.ANALYTICAL),
            ('Analytical Thinking', SkillCategory.ANALYTICAL),
            ('Root Cause Analysis', SkillCategory.ANALYTICAL),
            ('Data Analysis', SkillCategory.ANALYTICAL),
            ('Research Skills', SkillCategory.ANALYTICAL),
            ('Troubleshooting', SkillCategory.ANALYTICAL),
            ('Systems Thinking', SkillCategory.ANALYTICAL),
            ('Process Improvement', SkillCategory.ANALYTICAL),

            # Interpersonal
            ('Team Collaboration', SkillCategory.INTERPERSONAL),
            ('Teamwork', SkillCategory.INTERPERSONAL),
            ('Relationship Building', SkillCategory.INTERPERSONAL),
            ('Negotiation', SkillCategory.INTERPERSONAL),
            ('Empathy', SkillCategory.INTERPERSONAL),
            ('Adaptability', SkillCategory.INTERPERSONAL),
            ('Flexibility', SkillCategory.INTERPERSONAL),
            ('Cultural Awareness', SkillCategory.INTERPERSONAL),
            ('Remote Collaboration', SkillCategory.INTERPERSONAL),

            # Business & Strategy
            ('Business Analysis', SkillCategory.BUSINESS),
            ('Requirements Gathering', SkillCategory.BUSINESS),
            ('Product Strategy', SkillCategory.BUSINESS),
            ('Market Analysis', SkillCategory.BUSINESS),
            ('Customer Focus', SkillCategory.BUSINESS),
            ('Budget Management', SkillCategory.BUSINESS),
            ('Vendor Management', SkillCategory.BUSINESS),
            ('Contract Negotiation', SkillCategory.BUSINESS),
            ('Business Development', SkillCategory.BUSINESS),

            # Domain Expertise
            ('Architecture Design', SkillCategory.DOMAIN),
            ('System Design', SkillCategory.DOMAIN),
            ('Code Review', SkillCategory.DOMAIN),
            ('Technical Leadership', SkillCategory.DOMAIN),
            ('Performance Optimization', SkillCategory.DOMAIN),
            ('Security Best Practices', SkillCategory.DOMAIN),
            ('Quality Assurance', SkillCategory.DOMAIN),
            ('DevOps Practices', SkillCategory.DOMAIN),
            ('Cloud Architecture', SkillCategory.DOMAIN),
            ('API Design', SkillCategory.DOMAIN),

            # Other
            ('Time Management', SkillCategory.OTHER),
            ('Attention to Detail', SkillCategory.OTHER),
            ('Self-motivation', SkillCategory.OTHER),
            ('Continuous Learning', SkillCategory.OTHER),
            ('Creativity', SkillCategory.OTHER),
            ('Innovation', SkillCategory.OTHER),
        ]

        skills_created = 0
        for name, category in skills_data:
            skill, created = Skill.objects.get_or_create(
                name=name,
                defaults={'category': category}
            )
            if created:
                skills_created += 1

        self.stdout.write(
            self.style.SUCCESS(f'Created {skills_created} new skills')
        )

        # ============================================================================
        # Technologies (Programming Languages, Frameworks, Tools)
        # ============================================================================
        technologies_data = [
            # Programming Languages
            ('Python', TechnologyCategory.LANGUAGE),
            ('JavaScript', TechnologyCategory.LANGUAGE),
            ('TypeScript', TechnologyCategory.LANGUAGE),
            ('Java', TechnologyCategory.LANGUAGE),
            ('C#', TechnologyCategory.LANGUAGE),
            ('C++', TechnologyCategory.LANGUAGE),
            ('C', TechnologyCategory.LANGUAGE),
            ('Go', TechnologyCategory.LANGUAGE),
            ('Rust', TechnologyCategory.LANGUAGE),
            ('Ruby', TechnologyCategory.LANGUAGE),
            ('PHP', TechnologyCategory.LANGUAGE),
            ('Swift', TechnologyCategory.LANGUAGE),
            ('Kotlin', TechnologyCategory.LANGUAGE),
            ('Scala', TechnologyCategory.LANGUAGE),
            ('R', TechnologyCategory.LANGUAGE),
            ('SQL', TechnologyCategory.LANGUAGE),
            ('Dart', TechnologyCategory.LANGUAGE),
            ('Elixir', TechnologyCategory.LANGUAGE),
            ('Clojure', TechnologyCategory.LANGUAGE),
            ('Haskell', TechnologyCategory.LANGUAGE),

            # Frameworks & Libraries
            ('React', TechnologyCategory.FRAMEWORK),
            ('Vue.js', TechnologyCategory.FRAMEWORK),
            ('Angular', TechnologyCategory.FRAMEWORK),
            ('Next.js', TechnologyCategory.FRAMEWORK),
            ('Nuxt.js', TechnologyCategory.FRAMEWORK),
            ('Node.js', TechnologyCategory.FRAMEWORK),
            ('Express.js', TechnologyCategory.FRAMEWORK),
            ('NestJS', TechnologyCategory.FRAMEWORK),
            ('Django', TechnologyCategory.FRAMEWORK),
            ('FastAPI', TechnologyCategory.FRAMEWORK),
            ('Flask', TechnologyCategory.FRAMEWORK),
            ('Spring Boot', TechnologyCategory.FRAMEWORK),
            ('ASP.NET', TechnologyCategory.FRAMEWORK),
            ('ASP.NET Core', TechnologyCategory.FRAMEWORK),
            ('Ruby on Rails', TechnologyCategory.FRAMEWORK),
            ('Laravel', TechnologyCategory.FRAMEWORK),
            ('Symfony', TechnologyCategory.FRAMEWORK),
            ('TailwindCSS', TechnologyCategory.FRAMEWORK),
            ('Bootstrap', TechnologyCategory.FRAMEWORK),
            ('React Native', TechnologyCategory.FRAMEWORK),
            ('Flutter', TechnologyCategory.FRAMEWORK),
            ('Svelte', TechnologyCategory.FRAMEWORK),
            ('SvelteKit', TechnologyCategory.FRAMEWORK),
            ('Remix', TechnologyCategory.FRAMEWORK),
            ('Astro', TechnologyCategory.FRAMEWORK),
            ('GraphQL', TechnologyCategory.FRAMEWORK),
            ('Redux', TechnologyCategory.FRAMEWORK),
            ('Zustand', TechnologyCategory.FRAMEWORK),
            ('jQuery', TechnologyCategory.FRAMEWORK),
            ('Electron', TechnologyCategory.FRAMEWORK),
            ('Qt', TechnologyCategory.FRAMEWORK),

            # Databases
            ('PostgreSQL', TechnologyCategory.DATABASE),
            ('MySQL', TechnologyCategory.DATABASE),
            ('MariaDB', TechnologyCategory.DATABASE),
            ('MongoDB', TechnologyCategory.DATABASE),
            ('Redis', TechnologyCategory.DATABASE),
            ('Elasticsearch', TechnologyCategory.DATABASE),
            ('SQLite', TechnologyCategory.DATABASE),
            ('Oracle', TechnologyCategory.DATABASE),
            ('MS SQL Server', TechnologyCategory.DATABASE),
            ('DynamoDB', TechnologyCategory.DATABASE),
            ('Firebase', TechnologyCategory.DATABASE),
            ('Firestore', TechnologyCategory.DATABASE),
            ('Cassandra', TechnologyCategory.DATABASE),
            ('CouchDB', TechnologyCategory.DATABASE),
            ('Neo4j', TechnologyCategory.DATABASE),
            ('InfluxDB', TechnologyCategory.DATABASE),
            ('Supabase', TechnologyCategory.DATABASE),
            ('PlanetScale', TechnologyCategory.DATABASE),

            # Cloud & Infrastructure
            ('AWS', TechnologyCategory.CLOUD),
            ('Azure', TechnologyCategory.CLOUD),
            ('Google Cloud', TechnologyCategory.CLOUD),
            ('DigitalOcean', TechnologyCategory.CLOUD),
            ('Heroku', TechnologyCategory.CLOUD),
            ('Vercel', TechnologyCategory.CLOUD),
            ('Netlify', TechnologyCategory.CLOUD),
            ('Cloudflare', TechnologyCategory.CLOUD),
            ('Linode', TechnologyCategory.CLOUD),
            ('AWS Lambda', TechnologyCategory.CLOUD),
            ('AWS EC2', TechnologyCategory.CLOUD),
            ('AWS S3', TechnologyCategory.CLOUD),
            ('AWS RDS', TechnologyCategory.CLOUD),
            ('Azure Functions', TechnologyCategory.CLOUD),
            ('Google Cloud Functions', TechnologyCategory.CLOUD),

            # DevOps & CI/CD
            ('Docker', TechnologyCategory.DEVOPS),
            ('Kubernetes', TechnologyCategory.DEVOPS),
            ('Terraform', TechnologyCategory.DEVOPS),
            ('Ansible', TechnologyCategory.DEVOPS),
            ('Jenkins', TechnologyCategory.DEVOPS),
            ('GitHub Actions', TechnologyCategory.DEVOPS),
            ('GitLab CI', TechnologyCategory.DEVOPS),
            ('CircleCI', TechnologyCategory.DEVOPS),
            ('Travis CI', TechnologyCategory.DEVOPS),
            ('ArgoCD', TechnologyCategory.DEVOPS),
            ('Helm', TechnologyCategory.DEVOPS),
            ('Prometheus', TechnologyCategory.DEVOPS),
            ('Grafana', TechnologyCategory.DEVOPS),
            ('Datadog', TechnologyCategory.DEVOPS),
            ('New Relic', TechnologyCategory.DEVOPS),
            ('Nginx', TechnologyCategory.DEVOPS),
            ('Apache', TechnologyCategory.DEVOPS),
            ('Linux', TechnologyCategory.DEVOPS),
            ('Bash', TechnologyCategory.DEVOPS),
            ('Pulumi', TechnologyCategory.DEVOPS),

            # Development Tools
            ('Git', TechnologyCategory.TOOL),
            ('GitHub', TechnologyCategory.TOOL),
            ('GitLab', TechnologyCategory.TOOL),
            ('Bitbucket', TechnologyCategory.TOOL),
            ('VS Code', TechnologyCategory.TOOL),
            ('IntelliJ IDEA', TechnologyCategory.TOOL),
            ('PyCharm', TechnologyCategory.TOOL),
            ('Vim', TechnologyCategory.TOOL),
            ('Neovim', TechnologyCategory.TOOL),
            ('Postman', TechnologyCategory.TOOL),
            ('Insomnia', TechnologyCategory.TOOL),
            ('Jira', TechnologyCategory.TOOL),
            ('Confluence', TechnologyCategory.TOOL),
            ('Notion', TechnologyCategory.TOOL),
            ('Figma', TechnologyCategory.TOOL),
            ('Sketch', TechnologyCategory.TOOL),
            ('Adobe XD', TechnologyCategory.TOOL),
            ('Webpack', TechnologyCategory.TOOL),
            ('Vite', TechnologyCategory.TOOL),
            ('ESLint', TechnologyCategory.TOOL),
            ('Prettier', TechnologyCategory.TOOL),
            ('Jest', TechnologyCategory.TOOL),
            ('Cypress', TechnologyCategory.TOOL),
            ('Playwright', TechnologyCategory.TOOL),
            ('Selenium', TechnologyCategory.TOOL),
            ('Storybook', TechnologyCategory.TOOL),

            # Other / Specialized
            ('Machine Learning', TechnologyCategory.OTHER),
            ('TensorFlow', TechnologyCategory.OTHER),
            ('PyTorch', TechnologyCategory.OTHER),
            ('Scikit-learn', TechnologyCategory.OTHER),
            ('Pandas', TechnologyCategory.OTHER),
            ('NumPy', TechnologyCategory.OTHER),
            ('OpenAI API', TechnologyCategory.OTHER),
            ('LangChain', TechnologyCategory.OTHER),
            ('Hugging Face', TechnologyCategory.OTHER),
            ('Apache Kafka', TechnologyCategory.OTHER),
            ('RabbitMQ', TechnologyCategory.OTHER),
            ('Apache Spark', TechnologyCategory.OTHER),
            ('Hadoop', TechnologyCategory.OTHER),
            ('Blockchain', TechnologyCategory.OTHER),
            ('Solidity', TechnologyCategory.OTHER),
            ('Web3.js', TechnologyCategory.OTHER),
            ('Unity', TechnologyCategory.OTHER),
            ('Unreal Engine', TechnologyCategory.OTHER),
        ]

        technologies_created = 0
        for name, category in technologies_data:
            technology, created = Technology.objects.get_or_create(
                name=name,
                defaults={'category': category}
            )
            if created:
                technologies_created += 1

        self.stdout.write(
            self.style.SUCCESS(f'Created {technologies_created} new technologies')
        )

        # ============================================================================
        # Industries
        # ============================================================================
        industries_data = [
            'FinTech',
            'HealthTech',
            'EdTech',
            'E-commerce',
            'SaaS',
            'Cybersecurity',
            'AI/Machine Learning',
            'Gaming',
            'Media & Entertainment',
            'Telecommunications',
            'Energy & Utilities',
            'Logistics & Supply Chain',
            'Real Estate',
            'Insurance',
            'Banking & Finance',
            'Retail',
            'Travel & Hospitality',
            'Agriculture',
            'Manufacturing',
            'Automotive',
            'Aerospace',
            'Government & Public Sector',
            'Non-profit',
            'Consulting',
            'Legal Tech',
            'HR Tech',
            'PropTech',
            'CleanTech',
            'BioTech',
            'MarTech',
        ]

        industries_created = 0
        for name in industries_data:
            industry, created = Industry.objects.get_or_create(name=name)
            if created:
                industries_created += 1

        self.stdout.write(
            self.style.SUCCESS(f'Created {industries_created} new industries')
        )

        self.stdout.write(
            self.style.SUCCESS('Seeding completed successfully!')
        )
