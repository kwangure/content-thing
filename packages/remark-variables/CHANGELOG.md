# @content-thing/remark-variables

## 0.0.3

### Patch Changes

- Bump workspace versions

## 0.0.2

### Patch Changes

- 3751ae8: Upgrade remark packages

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
