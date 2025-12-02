# Oneo Platform - Coding Standards

## General Principles

1. **Readability over cleverness** - Code is read more often than written
2. **Consistency** - Follow established patterns in the codebase
3. **DRY (Don't Repeat Yourself)** - Extract common logic into reusable functions
4. **KISS (Keep It Simple, Stupid)** - Prefer simple solutions
5. **YAGNI (You Aren't Gonna Need It)** - Don't add functionality until needed

## Python/Django Standards

### Code Style
- Follow **PEP 8** (Python Enhancement Proposal 8)
- Use **4 spaces** for indentation (not tabs)
- Maximum line length: **100 characters**
- Use **snake_case** for functions and variables
- Use **PascalCase** for classes
- Use **UPPER_SNAKE_CASE** for constants

### Naming Conventions

**Models**:
```python
class CandidateProfile(models.Model):  # Singular, PascalCase
    professional_title = models.CharField()  # snake_case
    years_of_experience = models.IntegerField()

    class Meta:
        db_table = 'candidate_profiles'  # Plural snake_case
        ordering = ['-created_at']
```

**Views**:
```python
# Function-based views: lowercase with underscores
@api_view(['GET', 'POST'])
def candidate_list(request):
    pass

# Class-based views: PascalCase
class CandidateDetailView(APIView):
    pass
```

**Serializers**:
```python
class CandidateProfileSerializer(serializers.ModelSerializer):  # ModelName + Serializer
    class Meta:
        model = CandidateProfile
        fields = ['id', 'professional_title', 'years_of_experience']
```

**URL Names**:
```python
# Pattern: model-action
path('candidates/', views.candidate_list, name='candidate-list'),
path('candidates/<uuid:pk>/', views.candidate_detail, name='candidate-detail'),
```

### Models

**Field Definitions**:
```python
class Job(models.Model):
    # Use UUIDs for primary keys (more secure, prevents enumeration)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CharField: always specify max_length
    title = models.CharField(max_length=200)

    # TextField: for long text
    description = models.TextField()

    # Use choices for enums
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('closed', 'Closed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # ForeignKey: related_name for reverse lookups
    company = models.ForeignKey(
        'Company',
        on_delete=models.CASCADE,
        related_name='jobs'  # company.jobs.all()
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'published_at']),
        ]

    def __str__(self):
        return f"{self.title} at {self.company.name}"
```

**Model Methods**:
```python
class CandidateProfile(models.Model):
    # Properties: use @property for computed values
    @property
    def full_name(self):
        return f"{self.user.first_name} {self.user.last_name}"

    # Instance methods: actions on single instance
    def calculate_profile_completeness(self):
        """Calculate profile completion percentage."""
        total_fields = 10
        completed_fields = sum([
            bool(self.professional_title),
            bool(self.professional_summary),
            # ... more fields
        ])
        return (completed_fields / total_fields) * 100

    # Class methods: alternative constructors
    @classmethod
    def create_with_user(cls, user, **profile_data):
        """Create profile along with user."""
        return cls.objects.create(user=user, **profile_data)
```

### Serializers

**Basic Pattern**:
```python
class JobSerializer(serializers.ModelSerializer):
    # Read-only fields (computed or from relations)
    company_name = serializers.CharField(source='company.name', read_only=True)
    applications_count = serializers.IntegerField(read_only=True)

    # Write-only fields (e.g., passwords)
    password = serializers.CharField(write_only=True)

    # Custom fields with methods
    is_applied = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'title', 'company_name', 'status',
            'applications_count', 'is_applied'
        ]
        read_only_fields = ['id', 'created_at', 'applications_count']

    def get_is_applied(self, obj):
        """Check if current user has applied."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.applications.filter(candidate=request.user).exists()
        return False

    def validate_title(self, value):
        """Validate single field."""
        if len(value) < 5:
            raise serializers.ValidationError("Title too short")
        return value

    def validate(self, data):
        """Cross-field validation."""
        if data['salary_min'] > data['salary_max']:
            raise serializers.ValidationError("Min salary cannot exceed max")
        return data
```

**Nested Serializers**:
```python
# For read operations (list/detail)
class JobDetailSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)  # Nested
    required_skills = SkillSerializer(many=True, read_only=True)

    class Meta:
        model = Job
        fields = '__all__'

# For write operations (create/update)
class JobCreateSerializer(serializers.ModelSerializer):
    required_skill_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True
    )

    class Meta:
        model = Job
        fields = ['title', 'description', 'required_skill_ids']

    def create(self, validated_data):
        skill_ids = validated_data.pop('required_skill_ids')
        job = Job.objects.create(**validated_data)
        job.required_skills.set(skill_ids)
        return job
```

### Views

**Function-Based Views** (for simple endpoints):
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_check(request):
    """Simple health check endpoint."""
    return Response({
        'status': 'ok',
        'user': request.user.email,
        'timestamp': timezone.now()
    })
```

**Class-Based Views** (for complex logic):
```python
class JobListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List jobs with filters."""
        jobs = Job.objects.filter(status='published')

        # Apply filters
        if 'seniority' in request.query_params:
            jobs = jobs.filter(seniority=request.query_params['seniority'])

        # Optimize queries
        jobs = jobs.select_related('company').prefetch_related('required_skills')

        # Paginate
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(jobs, request)

        serializer = JobListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        """Create new job."""
        serializer = JobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save(company=request.user.company, created_by=request.user)
        return Response(
            JobDetailSerializer(job).data,
            status=status.HTTP_201_CREATED
        )
```

**Generic Views** (for standard CRUD):
```python
class CandidateProfileViewSet(viewsets.ModelViewSet):
    serializer_class = CandidateProfileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        """Filter queryset based on user."""
        if self.request.user.role == 'candidate':
            return CandidateProfile.objects.filter(user=self.request.user)
        return CandidateProfile.objects.filter(visibility='public_sanitised')

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action in ['list', 'retrieve']:
            return CandidateProfileDetailSerializer
        return CandidateProfileCreateSerializer
```

### Permissions

**Custom Permissions**:
```python
class IsCompanyAdmin(permissions.BasePermission):
    """Check if user is admin of their company."""

    message = "You must be a company admin to perform this action."

    def has_permission(self, request, view):
        """Check user role."""
        return (
            request.user.is_authenticated and
            request.user.role == 'client' and
            hasattr(request.user, 'company_user') and
            request.user.company_user.role == 'admin'
        )

    def has_object_permission(self, request, view, obj):
        """Check object-level permission."""
        return obj.company == request.user.company_user.company
```

### Query Optimization

```python
# BAD: N+1 queries
jobs = Job.objects.all()
for job in jobs:
    print(job.company.name)  # Queries database for each job

# GOOD: select_related for ForeignKey/OneToOne
jobs = Job.objects.select_related('company').all()
for job in jobs:
    print(job.company.name)  # No additional queries

# GOOD: prefetch_related for ManyToMany/reverse FK
jobs = Job.objects.prefetch_related('required_skills').all()
for job in jobs:
    for skill in job.required_skills.all():  # No additional queries
        print(skill.name)
```

### Error Handling

```python
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from rest_framework.exceptions import NotFound, PermissionDenied

def get_job(request, job_id):
    try:
        job = Job.objects.get(id=job_id)
    except ObjectDoesNotExist:
        raise NotFound(detail="Job not found")

    if job.company != request.user.company:
        raise PermissionDenied(detail="You don't have access to this job")

    return job
```

## TypeScript/React Standards

### Code Style
- Use **TypeScript strict mode**
- Use **2 spaces** for indentation
- Maximum line length: **100 characters**
- Use **camelCase** for variables and functions
- Use **PascalCase** for components and types
- Use **UPPER_SNAKE_CASE** for constants

### File Structure

```
src/components/JobCard/
  ├── JobCard.tsx           # Component
  ├── JobCard.types.ts      # Type definitions
  ├── JobCard.test.tsx      # Tests
  └── index.ts              # Re-export
```

### Component Patterns

**Functional Components** (always use these):
```typescript
import { FC } from 'react'

interface JobCardProps {
  job: Job
  onApply?: (jobId: string) => void
  className?: string
}

export const JobCard: FC<JobCardProps> = ({ job, onApply, className }) => {
  return (
    <div className={`job-card ${className}`}>
      <h3>{job.title}</h3>
      {onApply && (
        <button onClick={() => onApply(job.id)}>Apply</button>
      )}
    </div>
  )
}
```

**Component with State**:
```typescript
import { useState, useEffect } from 'react'

export const JobList: FC = () => {
  const [filters, setFilters] = useState<JobFilters>({
    seniority: null,
    workMode: null,
  })

  const { data: jobs, isLoading } = useJobs(filters)

  if (isLoading) return <LoadingSkeleton />

  return (
    <div>
      <JobFilters onChange={setFilters} />
      {jobs?.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
```

### Type Definitions

**Interfaces vs Types**:
```typescript
// Use interface for objects that can be extended
interface User {
  id: string
  email: string
  role: UserRole
}

interface CandidateUser extends User {
  profile: CandidateProfile
}

// Use type for unions, intersections, primitives
type UserRole = 'candidate' | 'client' | 'recruiter' | 'admin'
type ID = string | number
type Result = Success | Error
```

**API Response Types**:
```typescript
// Match Django model structure exactly
export interface Job {
  id: string
  title: string
  company: {
    id: string
    name: string
    logo_url: string | null
  }
  seniority: Seniority
  work_mode: WorkMode
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  created_at: string  // ISO date string
  applications_count: number
}

// Enum matching backend choices
export enum Seniority {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
}
```

### Custom Hooks

**API Hooks**:
```typescript
// useJobs.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export const useJobs = (filters?: JobFilters) => {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const { data } = await api.get<Job[]>('/jobs/', { params: filters })
      return data
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
  })
}

// Mutation hooks
export const useApplyToJob = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (application: CreateApplicationData) => {
      const { data } = await api.post<Application>('/applications/', application)
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}
```

**Utility Hooks**:
```typescript
// useDebounce.ts
import { useState, useEffect } from 'react'

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

### Form Handling

**React Hook Form + Zod**:
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const jobSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(50),
  salary_min: z.number().positive().nullable(),
  salary_max: z.number().positive().nullable(),
}).refine(
  (data) => !data.salary_max || !data.salary_min || data.salary_max >= data.salary_min,
  {
    message: "Max salary must be greater than min salary",
    path: ["salary_max"],
  }
)

type JobFormData = z.infer<typeof jobSchema>

export const JobForm: FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
  })

  const createJob = useCreateJob()

  const onSubmit = (data: JobFormData) => {
    createJob.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}

      <button type="submit">Create Job</button>
    </form>
  )
}
```

### Styling with Tailwind

**Oneo Brand Colors** (defined in tailwind.config.js):
```typescript
// Use semantic color names in code
<div className="bg-primary text-white">
  <button className="bg-accent hover:bg-accent-light">
    Apply Now
  </button>
</div>

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

**Component Variants**:
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'px-4 py-2 rounded font-medium transition',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark',
        secondary: 'bg-secondary text-white hover:bg-secondary-dark',
        outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
      },
      size: {
        sm: 'text-sm px-3 py-1',
        md: 'text-base px-4 py-2',
        lg: 'text-lg px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode
  onClick?: () => void
}

export const Button: FC<ButtonProps> = ({ variant, size, children, onClick }) => {
  return (
    <button className={buttonVariants({ variant, size })} onClick={onClick}>
      {children}
    </button>
  )
}
```

## Git Commit Messages

Follow **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no code change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(auth): add JWT refresh token endpoint

Implement refresh token logic to extend user sessions without
requiring re-login.

Closes #123

fix(jobs): prevent duplicate applications

Added unique constraint on (job, candidate) to prevent users from
applying to the same job multiple times.

docs(readme): update installation instructions
```

## Testing

### Backend Tests

```python
from django.test import TestCase
from rest_framework.test import APITestCase

class JobModelTest(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test Co")
        self.job = Job.objects.create(
            title="Senior Developer",
            company=self.company,
            status='published'
        )

    def test_job_creation(self):
        self.assertEqual(self.job.title, "Senior Developer")
        self.assertEqual(self.job.status, 'published')

class JobAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass',
            role='candidate'
        )
        self.client.force_authenticate(user=self.user)

    def test_list_jobs(self):
        response = self.client.get('/api/v1/jobs/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
```

### Frontend Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { JobCard } from './JobCard'

describe('JobCard', () => {
  const mockJob: Job = {
    id: '1',
    title: 'Senior Developer',
    company: { name: 'Test Co' },
    // ... other fields
  }

  it('renders job title', () => {
    render(<JobCard job={mockJob} />)
    expect(screen.getByText('Senior Developer')).toBeInTheDocument()
  })

  it('calls onApply when button clicked', () => {
    const onApply = jest.fn()
    render(<JobCard job={mockJob} onApply={onApply} />)

    fireEvent.click(screen.getByText('Apply'))
    expect(onApply).toHaveBeenCalledWith('1')
  })
})
```

## Performance Best Practices

### Database
- Always use indexes on fields used in filters and joins
- Use `only()` and `defer()` to limit fields fetched
- Batch operations with `bulk_create()` and `bulk_update()`
- Avoid N+1 queries

### Frontend
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback`
- Use `React.lazy()` for code splitting
- Optimize images (use WebP, lazy load)
- Virtual scrolling for long lists

## Documentation

**Code Comments**:
```python
# Good: Explain WHY, not WHAT
def calculate_match_score(candidate, job):
    # Use weighted scoring because skills are more important than years of experience
    skill_score = calculate_skill_match(candidate.skills, job.required_skills) * 0.7
    experience_score = calculate_experience_match(candidate.years, job.min_years) * 0.3
    return skill_score + experience_score

# Bad: Obvious comments
x = x + 1  # Increment x by 1
```

**Docstrings**:
```python
def send_application_confirmation_email(application):
    """
    Send confirmation email to candidate after applying to a job.

    Args:
        application (Application): The application instance

    Returns:
        bool: True if email sent successfully, False otherwise

    Raises:
        EmailServiceError: If email service is unavailable
    """
    pass
```

---

**Remember**: These are guidelines, not rigid rules. Use judgment and prioritize code that is easy to read, maintain, and extend.

**Last Updated**: December 2024
