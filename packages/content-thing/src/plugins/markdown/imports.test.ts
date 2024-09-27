import { describe, it, expect, beforeEach } from 'vitest';
import { Imports } from './imports.js';

describe('Imports', () => {
	let imports: Imports;

	beforeEach(() => {
		imports = new Imports();
	});

	describe('add()', () => {
		it('should add a new import and return its name', () => {
			expect(imports.add('foo.js', 'bar')).toBe('bar');
		});

		it('should handle name collisions on the same path', () => {
			expect(imports.add('foo.js', 'bar')).toBe('bar');
			expect(imports.add('foo.js', 'bar', true)).toBe('bar$$1');

			expect(imports.add('baz.js', 'qux', true)).toBe('qux');
			expect(imports.add('baz.js', 'qux')).toBe('qux$$1');
		});

		it('should handle name collisions across different paths', () => {
			expect(imports.add('foo.js', 'bar')).toBe('bar');
			expect(imports.add('baz.js', 'bar')).toBe('bar$$1');
			expect(imports.add('qux.js', 'bar')).toBe('bar$$2');
		});

		it('should return the same name for repeated adds of the same import', () => {
			expect(imports.add('foo.js', 'bar')).toBe('bar');
			expect(imports.add('foo.js', 'bar')).toBe('bar');

			expect(imports.add('baz.js', 'qux', true)).toBe('qux');
			expect(imports.add('baz.js', 'qux')).toBe('qux$$1');
			expect(imports.add('baz.js', 'qux', true)).toBe('qux');
			expect(imports.add('baz.js', 'qux')).toBe('qux$$1');
		});

		it('should handle name collisions on the same path', () => {
			expect(imports.add('foo.js', 'bar')).toBe('bar');
			expect(imports.add('foo.js', 'bar', true)).toBe('bar$$1');

			expect(imports.add('baz.js', 'qux', true)).toBe('qux');
			expect(imports.add('baz.js', 'qux')).toBe('qux$$1');
		});

		it('should return the same name for repeated adds of the same import', () => {
			expect(imports.add('foo.js', 'bar')).toBe('bar');
			expect(imports.add('baz.js', 'bar')).toBe('bar$$1');
			expect(imports.add('baz.js', 'bar')).toBe('bar$$1');
		});
	});

	describe('toString()', () => {
		it('should return an empty string for no imports', () => {
			expect(imports.toString()).toBe('');
		});

		it('should correctly format a default import only', () => {
			imports.add('foo', 'bar', true);
			expect(imports.toString()).toBe("import bar from 'foo';");
		});

		it('should correctly format a single named import', () => {
			imports.add('foo', 'bar');
			expect(imports.toString()).toBe("import { bar } from 'foo';");
		});

		it('should correctly format multiple named imports from the same module', () => {
			imports.add('foo', 'bar');
			imports.add('foo', 'baz');
			expect(imports.toString()).toBe("import { bar, baz } from 'foo';");
		});

		it('should correctly format both default and named imports from the same module', () => {
			imports.add('foo', 'bar', true);
			imports.add('foo', 'baz');
			expect(imports.toString()).toBe("import bar, { baz } from 'foo';");
		});

		it('should handle renamed imports correctly', () => {
			imports.add('foo', 'bar', true);
			imports.add('foo', 'bar');
			imports.add('foo', 'baz');
			const result = imports.toString();
			expect(result).toContain(
				"import bar, { bar as bar$$1, baz } from 'foo';",
			);
		});

		it('should handle renamed imports correctly', () => {
			imports.add('foo', 'bar');
			imports.add('foo', 'bar', true);
			imports.add('foo', 'baz');
			const result = imports.toString();
			expect(result).toContain("import bar$$1, { bar, baz } from 'foo';");
		});

		it('should handle multiple modules correctly', () => {
			imports.add('foo', 'bar', true);
			imports.add('foo', 'baz');
			imports.add('qux', 'quux');
			imports.add('corge', 'grault');
			const result = imports.toString();
			expect(result).toBe(
				"import bar, { baz } from 'foo';\n" +
					"import { quux } from 'qux';\n" +
					"import { grault } from 'corge';",
			);
		});
	});
});
