# Contributing to OmniNotes AI 2.0

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork>`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Format code
pnpm format

# Type check
pnpm check
```

## Commit Guidelines

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Dependencies

## Pull Request Process

1. Update documentation
2. Add tests for new features
3. Ensure all tests pass
4. Submit PR with clear description

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- 2-space indentation
- Meaningful variable names

## Testing

- Write tests for all features
- Aim for 80%+ coverage
- Test edge cases
- Mock external dependencies
