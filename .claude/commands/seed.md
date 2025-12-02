---
description: Create seed data script for development/testing
---

I need to create seed data for the database.

Please ask me:
1. What models need seed data? (Skills, Industries, Users, Companies, Jobs, etc.)
2. How many records? (e.g., 10 skills, 5 companies, 20 jobs)
3. Realistic or test data?

Then create a Django management command:
- File: `backend/api/management/commands/seed_<name>.py`
- Generates the requested data with realistic values
- Uses Django ORM to create records
- Handles existing data (skip or update)
- Prints progress messages

Command should be runnable with: `python manage.py seed_<name>`

Include instructions for running the seed command.
