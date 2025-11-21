# CLAUDE.md - AI Assistant Guide for HabitSMS

**Last Updated**: 2025-11-21
**Repository**: RohithDevarshetty/habitsms
**License**: MIT
**Current Status**: Initial setup phase

## Project Overview

HabitSMS is a habit tracking application that leverages SMS for notifications and interactions. This document serves as a comprehensive guide for AI assistants working on this codebase.

### Project Purpose
Based on the repository name, this project aims to:
- Track user habits and streaks
- Send SMS notifications and reminders
- Provide a simple interface for habit management
- Enable SMS-based interactions for habit check-ins

## Current Repository State

**Status**: Empty repository (only LICENSE file present)
**Next Steps**: Initial project structure and technology stack need to be established

## Development Guidelines for AI Assistants

### Core Principles

1. **Security First**
   - Never commit sensitive data (API keys, credentials, `.env` files)
   - Validate all user inputs to prevent injection attacks
   - Follow OWASP Top 10 security practices
   - Use environment variables for configuration
   - Implement proper authentication and authorization

2. **Code Quality**
   - Write clean, readable, and maintainable code
   - Follow consistent naming conventions
   - Add meaningful comments for complex logic
   - Avoid premature optimization
   - Keep functions small and focused (single responsibility)

3. **Testing**
   - Write unit tests for business logic
   - Include integration tests for API endpoints
   - Test SMS functionality with mock providers
   - Aim for meaningful test coverage (not just high percentages)

4. **Documentation**
   - Update this CLAUDE.md as the project evolves
   - Document API endpoints and their parameters
   - Explain complex algorithms and business logic
   - Keep README.md user-focused

### Git Workflow

**Branch Strategy**:
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `claude/*` - AI assistant working branches (auto-generated)

**Commit Practices**:
- Use clear, descriptive commit messages
- Follow conventional commits format when applicable:
  - `feat:` - New features
  - `fix:` - Bug fixes
  - `docs:` - Documentation changes
  - `refactor:` - Code refactoring
  - `test:` - Adding or updating tests
  - `chore:` - Maintenance tasks
- Commit related changes together
- Never force push to main branch

**Pull Request Guidelines**:
- Provide clear PR descriptions with context
- Include test plan and verification steps
- Reference related issues
- Ensure CI passes before requesting review

## Recommended Technology Stack

### Backend Options
- **Node.js + Express** - JavaScript/TypeScript backend
- **Python + FastAPI** - Python backend with automatic API docs
- **Go + Gin** - High-performance compiled backend

### SMS Integration
- **Twilio** - Most popular, well-documented
- **AWS SNS** - If using AWS infrastructure
- **Vonage (Nexmo)** - Alternative provider

### Database
- **PostgreSQL** - Relational data with JSON support
- **MongoDB** - Document-based for flexible schemas
- **SQLite** - Simple start, easy to upgrade later

### Frontend (if applicable)
- **React** - Component-based UI
- **Vue.js** - Progressive framework
- **Next.js** - Full-stack React framework

## Suggested Project Structure

```
habitsms/
├── .github/
│   └── workflows/          # CI/CD pipelines
├── src/                    # Source code
│   ├── api/               # API routes/endpoints
│   ├── models/            # Data models
│   ├── services/          # Business logic
│   ├── utils/             # Helper functions
│   └── config/            # Configuration
├── tests/                 # Test files
│   ├── unit/
│   └── integration/
├── docs/                  # Additional documentation
├── scripts/               # Build/deployment scripts
├── .env.example          # Example environment variables
├── .gitignore
├── package.json          # Node.js dependencies
├── README.md             # User-facing documentation
├── CLAUDE.md             # This file
└── LICENSE
```

## Environment Variables

Always use environment variables for sensitive configuration:

```bash
# SMS Provider
SMS_PROVIDER_API_KEY=
SMS_PROVIDER_API_SECRET=
SMS_FROM_NUMBER=

# Database
DATABASE_URL=
DATABASE_NAME=

# Application
PORT=
NODE_ENV=development|production
JWT_SECRET=

# Timezone
DEFAULT_TIMEZONE=UTC
```

## Common Development Tasks

### Setting Up Development Environment

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in values
3. Install dependencies
4. Set up database
5. Run migrations (if applicable)
6. Start development server

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test
```

### Database Migrations

Document migration strategy once database is chosen:
- How to create migrations
- How to run migrations
- How to rollback migrations

## API Design Principles

### RESTful Conventions
- Use plural nouns for resources: `/habits`, `/users`
- Use HTTP methods appropriately:
  - `GET` - Retrieve resources
  - `POST` - Create resources
  - `PUT/PATCH` - Update resources
  - `DELETE` - Remove resources
- Use proper status codes:
  - `200` - Success
  - `201` - Created
  - `400` - Bad request
  - `401` - Unauthorized
  - `404` - Not found
  - `500` - Server error

### Example Endpoints

```
GET    /api/v1/habits              # List all habits
GET    /api/v1/habits/:id          # Get specific habit
POST   /api/v1/habits              # Create new habit
PUT    /api/v1/habits/:id          # Update habit
DELETE /api/v1/habits/:id          # Delete habit
POST   /api/v1/habits/:id/checkin  # Record habit completion
GET    /api/v1/habits/:id/streak   # Get habit streak
```

## Error Handling

### Best Practices
1. Use try-catch blocks for async operations
2. Create custom error classes for different error types
3. Log errors with sufficient context
4. Return user-friendly error messages
5. Never expose stack traces in production

### Example Error Response
```json
{
  "error": {
    "code": "HABIT_NOT_FOUND",
    "message": "The requested habit does not exist",
    "status": 404
  }
}
```

## SMS Integration Guidelines

### Message Format
- Keep messages concise (160 characters when possible)
- Include clear call-to-action
- Provide opt-out instructions
- Use consistent formatting

### Example SMS Templates
```
Reminder: Time to complete your habit "{habit_name}"! Reply YES to confirm. Reply STOP to unsubscribe.

Great job! You've completed "{habit_name}" for 7 days straight! Keep it up!

Daily Summary: 3 habits completed today. Current streak: 12 days. Reply STATS for details.
```

### Rate Limiting
- Implement rate limiting for SMS sends
- Respect user preferences for notification frequency
- Handle SMS provider limits gracefully

## Data Models

### User
```typescript
{
  id: string
  phoneNumber: string
  timezone: string
  preferences: {
    notificationTime: string
    frequency: 'daily' | 'weekly'
  }
  createdAt: Date
  updatedAt: Date
}
```

### Habit
```typescript
{
  id: string
  userId: string
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'custom'
  targetDays: number[]  // 0-6 for weekly, empty for daily
  reminderTime: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### HabitLog
```typescript
{
  id: string
  habitId: string
  userId: string
  completedAt: Date
  source: 'sms' | 'api' | 'manual'
  notes: string
}
```

## Performance Considerations

1. **Database Indexing**
   - Index foreign keys
   - Index frequently queried fields (userId, phoneNumber)
   - Use compound indexes for common query patterns

2. **Caching**
   - Cache user preferences
   - Cache habit configurations
   - Use Redis for session management

3. **SMS Queue**
   - Use message queue (e.g., Bull, RabbitMQ) for SMS sending
   - Implement retry logic for failed sends
   - Monitor queue depth

## Monitoring and Logging

### Key Metrics to Track
- SMS delivery success rate
- API response times
- User engagement (daily active users)
- Habit completion rates
- Error rates by type

### Logging Guidelines
- Log all SMS sends and deliveries
- Log authentication attempts
- Log errors with full context
- Use structured logging (JSON format)
- Include request IDs for tracing

## Deployment

### Environment Setup
1. Set up production database
2. Configure SMS provider credentials
3. Set up monitoring and alerting
4. Configure backup strategy
5. Set up CI/CD pipeline

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Rate limiting configured
- [ ] Error tracking enabled

## AI Assistant Specific Instructions

### When Adding Features
1. Read existing code to understand patterns
2. Follow established conventions
3. Add tests for new functionality
4. Update relevant documentation
5. Consider security implications
6. Think about edge cases

### When Fixing Bugs
1. Reproduce the bug if possible
2. Write a failing test first
3. Implement the fix
4. Verify the test passes
5. Check for similar issues elsewhere
6. Update documentation if behavior changed

### When Refactoring
1. Ensure tests exist and pass
2. Make small, incremental changes
3. Keep tests passing throughout
4. Document why refactoring was needed
5. Consider backward compatibility

### Before Committing
- [ ] Code follows project conventions
- [ ] Tests added/updated and passing
- [ ] No sensitive data in code
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Error handling implemented

## Common Pitfalls to Avoid

1. **Timezone Issues**
   - Always store times in UTC
   - Convert to user timezone for display
   - Handle daylight saving time changes

2. **SMS Costs**
   - Monitor SMS usage to avoid unexpected costs
   - Implement daily/monthly limits per user
   - Provide clear pricing information to users

3. **Phone Number Validation**
   - Use proper phone number parsing library
   - Support international formats
   - Verify numbers before sending

4. **Race Conditions**
   - Use transactions for related database updates
   - Implement proper locking for concurrent operations
   - Be careful with streak calculations

5. **Privacy**
   - Don't log phone numbers in plain text
   - Implement proper data deletion
   - Comply with GDPR/CCPA requirements

## Resources and References

### SMS Providers Documentation
- Twilio: https://www.twilio.com/docs
- AWS SNS: https://docs.aws.amazon.com/sns/
- Vonage: https://developer.vonage.com/

### Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [Conventional Commits](https://www.conventionalcommits.org/)

### Libraries to Consider
- **libphonenumber** - Phone number parsing and validation
- **node-cron** - Scheduling reminders
- **joi** or **zod** - Input validation
- **winston** or **pino** - Logging
- **bull** - Job queue for SMS sending

## Questions to Resolve

As AI assistants work on this project, document important decisions:

1. **Tech Stack**: Which programming language/framework to use?
2. **Database**: Which database system fits best?
3. **SMS Provider**: Which SMS provider to integrate with?
4. **Authentication**: How should users authenticate?
5. **Hosting**: Where will this be deployed?
6. **Timezone Handling**: How to handle user timezones?
7. **Billing**: Will this be a paid service?

## Changelog

### 2025-11-21 - Initial Creation
- Created initial CLAUDE.md file
- Established project structure and conventions
- Defined development guidelines for AI assistants
- Set up recommended technology stack and architecture

---

**Note to AI Assistants**: This document should be updated as the project evolves. When making significant architectural decisions or establishing new patterns, update the relevant sections. Keep this document as the single source of truth for project conventions.
