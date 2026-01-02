# Configuration Directory

This directory contains configuration files, rules, and prompts for the code review system.

## Directory Structure

```
config/
├── prompts/              # AI prompt templates
│   ├── code-review.md    # Main review prompt template
│   └── README.md         # Prompt system documentation
├── java-gradle/          # Java Gradle project configuration
│   ├── cli.json          # Cursor CLI configuration
│   └── rules/            # Review rules
├── java-maven/           # Java Maven project configuration
│   ├── cli.json          # Cursor CLI configuration
│   └── rules/            # Review rules
├── kotlin/               # Kotlin project configuration
│   ├── cli.json          # Cursor CLI configuration
│   └── rules/            # Review rules
├── next-ts/              # Next.js TypeScript configuration
│   ├── cli.json          # Cursor CLI configuration
│   └── rules/            # Review rules
└── README.md             # This file
```

## Components

### 1. Prompts (`prompts/`)

Contains AI prompt templates used for code reviews. These templates support variable substitution using the `{{variableName}}` syntax.

**Key file:**
- `code-review.md` - Main prompt template for MR diff reviews

See [`prompts/README.md`](./prompts/README.md) for detailed documentation.

### 2. Tech Stack Configurations

Each tech stack (java-gradle, java-maven, kotlin, next-ts) has:

#### `cli.json`
Cursor CLI configuration file that defines:
- Model preferences
- Output format
- Rules to include
- Project-specific settings

#### `rules/` directory
Contains markdown files with review rules and guidelines:
- `design-principles.mdc` - Architecture and design patterns
- `review-rules.mdc` - General code review standards
- `<tech>-rules.mdc` - Language/framework-specific rules
- `sonar-rules.mdc` - SonarQube style checks (where applicable)

## Usage

The review system automatically detects your project's tech stack and loads the appropriate configuration:

1. **Detection**: `tech-stack-detector.ts` identifies the project type
2. **Setup**: Configuration files are copied to `.cursor/` directory
3. **Review**: AI uses the rules and prompts to analyze code

## Adding a New Tech Stack

To add support for a new tech stack:

1. Create a new directory: `config/<tech-stack-name>/`
2. Add `cli.json` configuration
3. Create `rules/` directory with markdown rule files
4. Update `tech-stack-detector.ts` to recognize the stack
5. Update this README

### Example cli.json

```json
{
  "rules": [
    "config/<tech-stack>/rules/design-principles.mdc",
    "config/<tech-stack>/rules/review-rules.mdc",
    "config/<tech-stack>/rules/<tech>-rules.mdc"
  ]
}
```

## Customization

### Modify Existing Rules

1. Navigate to the appropriate tech stack directory
2. Edit the `.mdc` files in the `rules/` directory
3. Commit changes with a clear description

### Modify Prompts

1. Edit `prompts/code-review.md`
2. Test with a sample MR
3. Verify output format is still valid JSON

### Add New Variables

To add variables to prompts:

1. Add placeholder in template: `{{newVariable}}`
2. Update `cursor-agent.ts` to pass the variable
3. Document in `prompts/README.md`

## Best Practices

1. **Keep rules concise**: Focus on actionable guidelines
2. **Use examples**: Include code examples in rule files
3. **Version control**: Commit configuration changes
4. **Test changes**: Run reviews after modifying configs
5. **Document updates**: Update READMEs when making changes

## Tech Stack Detection

The system uses these files to detect project types:

| Tech Stack | Detection Files |
|-----------|----------------|
| Java Gradle | `build.gradle`, `build.gradle.kts`, `settings.gradle` |
| Java Maven | `pom.xml` |
| Kotlin | `*.kt` files + Gradle/Maven |
| Next.js TS | `next.config.js`, `package.json` with Next.js |

## Configuration Priority

When multiple configurations match:

1. Most specific configuration wins (e.g., kotlin over java-gradle)
2. Framework-specific over language-specific
3. Custom project config over defaults

## Troubleshooting

**Issue: Rules not being applied**
- Check that `.cursor/` directory was created
- Verify `cli.json` paths are correct
- Ensure rule files exist and are readable

**Issue: Wrong tech stack detected**
- Check detection logic in `tech-stack-detector.ts`
- Verify project has appropriate marker files
- Add custom detection rules if needed

**Issue: Prompt variables not substituting**
- Check variable names match exactly
- Ensure proper `{{variableName}}` syntax
- See `prompts/README.md` for details

## Related Documentation

- [Prompts Documentation](./prompts/README.md)
- [Main Project README](../README.md)
- [Architecture Documentation](../docs/02-architecture.md)
- [Setup & Configuration Guide](../docs/04-setup-configuration.md)

