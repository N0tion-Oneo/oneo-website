---
description: Generate a Django model with all boilerplate
---

I need to create a new Django model.

Please ask me for:
1. Model name (e.g., "CandidateProfile", "Job")
2. Fields and their types
3. Relationships (ForeignKey, ManyToMany, OneToOne)
4. Any custom methods or properties

Then generate:
- Model class in the appropriate `models.py` file
- Serializer in `serializers.py` (both list and detail if needed)
- Basic viewset or APIView in `views.py`
- URL routing in `urls.py`
- Admin registration if applicable

After generating, remind me to:
- Run `python manage.py makemigrations`
- Run `python manage.py migrate`
- Test the API endpoint
