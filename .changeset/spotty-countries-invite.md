---
"@content-thing/remark-variables": patch
---

Changed the markdown variables syntax from `{{}}` to `{%%}` to avoid clashes with LaTex expressions

Before:

```markdown
---
foo: bar
---

{{ frontmatter.foo }}
```

After:

```markdown
---
foo: bar
---

{% frontmatter.foo %}
```
