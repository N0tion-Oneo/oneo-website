---
description: Generate a complete API endpoint with tests
---

I need to create a new API endpoint.

Please ask me for:
1. HTTP method (GET, POST, PATCH, DELETE)
2. URL path (e.g., `/api/v1/candidates/me/`)
3. Request body structure (if POST/PATCH)
4. Response structure
5. Authentication required? (yes/no)
6. Permissions needed (IsAuthenticated, IsCompanyAdmin, etc.)

Then generate:
- Serializer (request and response if different)
- View function or class
- URL pattern
- Basic test case

Follow the patterns in `.claude/instructions.md` for consistency.
