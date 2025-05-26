# Contributing to Java Properties Navigator

We love your input! We want to make contributing to Java Properties Navigator as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/java-tools/java-properties-navigator.git
   cd java-properties-navigator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile TypeScript**
   ```bash
   npm run compile
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start debugging**
   - Open the project in VS Code
   - Press `F5` to start the Extension Development Host
   - Test your changes in the new VS Code window

## Project Structure

```
├── src/                    # Source code
│   ├── extension.ts        # Main extension entry point
│   ├── configIndex.ts      # Configuration indexing
│   ├── propertyNavigator.ts # Navigation logic
│   ├── analyzer/           # Java code analysis
│   ├── detector/           # Property detection
│   ├── indexing/           # File indexing
│   ├── navigation/         # Navigation providers
│   ├── parsers/            # File parsers
│   └── utils/              # Utility functions
├── test/                   # Test files
├── package.json            # Extension manifest
└── README.md               # Documentation
```

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use async/await instead of Promises where possible

### Code Style

- Use 4 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multiline objects/arrays
- Use semicolons
- Maximum line length: 120 characters

### Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Test coverage should not decrease
- Include integration tests for complex features

## Reporting Bugs

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/java-tools/java-properties-navigator/issues).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We welcome feature requests! Please:

1. Check if the feature has already been requested
2. Provide a clear description of the problem you're trying to solve
3. Describe the solution you'd like
4. Consider alternative solutions
5. Provide additional context if helpful

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to contact the maintainers if you have any questions. We're here to help!

---

Thank you for contributing to Java Properties Navigator! 🚀 