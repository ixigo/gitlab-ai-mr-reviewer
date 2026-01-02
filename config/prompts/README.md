# Code Review Prompts

This directory contains prompt templates used by the AI review system.

## Template System

Prompt templates support variable substitution using the `{{variableName}}` syntax.

### Available Templates

#### `code-review.md`

The main code review prompt template used by `cursor-agent` for analyzing merge request diffs.

**Variables:**
- `{{diffPath}}` - Path to the diff file being reviewed

**Usage in code:**
```typescript
const jsonPrompt = loadPromptTemplate(promptTemplatePath, {
  diffPath: '/path/to/mr-diff.patch',
});
```

## Adding New Variables

To add a new variable to a template:

1. Add the variable placeholder in the template using `{{variableName}}` syntax
2. Pass the variable value when calling `loadPromptTemplate()`:

```typescript
const prompt = loadPromptTemplate(templatePath, {
  diffPath: diffPath,
  projectName: 'my-project',
  reviewType: 'full',
});
```

## Customizing Prompts

You can customize the prompt templates to fit your team's specific needs:

1. **Modify JSON structure**: Update the expected response format
2. **Add review criteria**: Add more validation rules or requirements
3. **Change severity levels**: Adjust thresholds and categories
4. **Update examples**: Provide more relevant examples for your codebase

### Example Customization

To add a new issue category:

```json
{
  "category": "Documentation Issues",
  "count": 0,
  "threshold": 5,
  "status": "Pass"
}
```

## Best Practices

1. **Keep variables clear**: Use descriptive variable names like `{{diffPath}}` not `{{path}}`
2. **Document variables**: List all variables in this README
3. **Test changes**: Build and run reviews after modifying templates
4. **Version control**: Commit prompt changes with clear messages explaining the modifications
5. **Consistency**: Maintain consistent formatting and structure across templates

## Template Validation

Before using a modified template:

1. Check that all variables are properly closed: `{{variableName}}`
2. Ensure JSON examples are valid
3. Test with a sample MR to verify AI responses
4. Review the generated output in `output/review-data.json`

## Troubleshooting

**Issue: Variables not being substituted**
- Check variable name matches exactly (case-sensitive)
- Ensure double curly braces: `{{variableName}}`

**Issue: AI not following prompt format**
- Add more explicit instructions
- Provide clearer examples
- Use "CRITICAL:" and "MUST" for important requirements

**Issue: JSON parsing errors**
- Verify JSON structure in template is valid
- Check for escaped characters (use `\\n` for newlines in JSON strings)
- Test JSON structure with a JSON validator

