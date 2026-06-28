---
name: ai-skill-writer
description: Turn recurring tasks, SOPs, workflows, prompts, business processes, or expert know-how into reusable AI skills with trigger descriptions, step-by-step instructions, constraints, examples, and quality checks. Use when a user wants to create a Codex skill, Claude skill, agent skill, prompt pack, or reusable AI workflow.
---

# AI Skill Writer

Convert recurring work into a reusable skill an AI agent can reliably invoke and execute.

## Workflow

1. Identify the recurring job: what the user asks for, what artifact they provide, and what output they expect.
2. Write concrete trigger language. Include task names, source artifact types, and situations where the skill should be used.
3. Extract the expert workflow:
   - intake
   - analysis
   - transformation
   - output structure
   - validation
   - edge cases
4. Decide what belongs in the skill body versus external references:
   - body: essential workflow and output rules
   - references: long examples, schemas, policies, brand guides
   - scripts: deterministic repeated code
   - assets: templates used in final outputs
5. Write concise instructions. Assume the agent is smart; include only the non-obvious process knowledge.
6. Add quality checks and failure handling.

## Output Format

```markdown
# Skill Design: <skill name>

## Skill Name
<lowercase-hyphen-name>

## Trigger Description
<frontmatter-ready description>

## Core Workflow
1. <step>

## Output Contract
<required sections or artifact format>

## Edge Cases
- <case> -> <handling>

## Quality Checks
- <check>

## Draft SKILL.md
\`\`\`markdown
---
name: <skill-name>
description: <description>
---

# <Title>

<instructions>
\`\`\`
```

## Quality Bar

- Make trigger descriptions comprehensive because they decide whether the skill loads.
- Keep skill bodies concise and procedural.
- Do not create giant prompt essays.
- Include examples only when they materially improve execution.
