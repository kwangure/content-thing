# @content-thing/remark-variables

## 0.0.1

### Patch Changes

- 8ff30db: Changed the markdown variables syntax from `{{}}` to `{%%}` to avoid clashes with LaTex expressions

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
