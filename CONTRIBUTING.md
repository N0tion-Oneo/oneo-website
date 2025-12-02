# Contributing to Oneo Platform

Thank you for your interest in contributing to Oneo! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. **Read the documentation**:
   - `README.md` - Project overview and setup
   - `Docs/ARCHITECTURE.md` - System architecture
   - `Docs/CODING_STANDARDS.md` - Code style and patterns
   - `Docs/V1 Plan` - Development roadmap
   - `.claude/instructions.md` - Claude Code context

2. **Set up your development environment**:
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/OneoWebsite.git
   cd OneoWebsite

   # Backend setup
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate

   # Frontend setup
   cd ../frontend
   npm install

   # Create .env files from examples
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

## Development Workflow

### 1. Pick a Task

- Check the `Docs/V1 Plan` for the current phase
- Look for open issues in the issue tracker
- Or propose a new feature/improvement

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests

### 3. Make Your Changes

Follow the coding standards in `Docs/CODING_STANDARDS.md`:

**Backend (Django)**:
- Write clear, documented code
- Add tests for new functionality
- Run migrations if you modify models
- Ensure existing tests pass

**Frontend (React/TypeScript)**:
- Use TypeScript strict mode
- Follow component patterns
- Add prop types for all components
- Use Tailwind CSS for styling

### 4. Test Your Changes

**Backend**:
```bash
cd backend
source venv/bin/activate
python manage.py test
```

**Frontend**:
```bash
cd frontend
npm test
npm run lint
```

### 5. Commit Your Changes

Follow **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples**:
```bash
git commit -m "feat(auth): add password reset flow"
git commit -m "fix(jobs): correct salary filtering logic"
git commit -m "docs(readme): update installation steps"
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- **Clear title** describing the change
- **Description** explaining what and why
- **Screenshots** if UI changes
- **Testing instructions** for reviewers

## Code Review Process

1. **All code must be reviewed** before merging
2. **CI checks must pass** (tests, linting)
3. **At least one approval** required
4. **Address feedback** promptly
5. **Keep PRs focused** - one feature/fix per PR

## Coding Guidelines

### Python/Django

```python
# Good: Clear, documented, tested
class CandidateProfile(models.Model):
    """Model representing a candidate's profile."""

    professional_title = models.CharField(max_length=200)
    years_of_experience = models.PositiveIntegerField()

    def calculate_profile_completeness(self):
        """Calculate profile completion percentage (0-100)."""
        # Implementation
        pass

# Bad: Unclear, undocumented
class CP(models.Model):
    pt = models.CharField(max_length=200)
    yoe = models.PositiveIntegerField()

    def calc(self):
        pass
```

### TypeScript/React

```typescript
// Good: Typed, clear, reusable
interface JobCardProps {
  job: Job
  onApply?: (jobId: string) => void
}

export const JobCard: FC<JobCardProps> = ({ job, onApply }) => {
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold">{job.title}</h3>
      {onApply && (
        <button onClick={() => onApply(job.id)}>
          Apply
        </button>
      )}
    </div>
  )
}

// Bad: Untyped, unclear
export const JC = ({j, o}) => (
  <div><h3>{j.t}</h3><button onClick={() => o(j.i)}>A</button></div>
)
```

## Testing Requirements

### Backend Tests

All new features must include:
- **Model tests**: Test creation, validation, methods
- **API tests**: Test endpoints (success and error cases)
- **Permission tests**: Test authorization
- **Edge cases**: Test boundary conditions

### Frontend Tests

Component tests should cover:
- **Rendering**: Component renders correctly
- **User interaction**: Events trigger expected behavior
- **Props**: Different prop combinations work
- **Edge cases**: Loading states, errors, empty data

## Documentation

- **Code comments**: Explain WHY, not WHAT
- **Docstrings**: For all public functions/classes
- **README updates**: If setup process changes
- **API docs**: Document new endpoints

## Common Issues

### Database Migrations

```bash
# After modifying models
python manage.py makemigrations
python manage.py migrate

# Check migration SQL
python manage.py sqlmigrate app_name migration_name
```

### TypeScript Errors

```bash
# Check for type errors
npm run type-check

# Fix import paths
# Use @/ alias for src/ imports
import { api } from '@/services/api'  # Good
import { api } from '../../services/api'  # Bad
```

### CORS Issues

If frontend can't reach backend:
1. Check `CORS_ALLOWED_ORIGINS` in `backend/.env`
2. Ensure `withCredentials: true` in axios config
3. Verify backend is running on correct port

## Questions?

- Check documentation in `Docs/` folder
- Ask in project discussions
- Open an issue for bugs/features

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Oneo! 🎉
