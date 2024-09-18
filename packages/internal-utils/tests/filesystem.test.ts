import { afterAll, beforeAll, assert, describe, it, expect } from 'vitest';
import { mkdirp, rimraf, walk, write } from '../src/filesystem.js';
import fs from 'node:fs';
import path from 'node:path';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

describe('mkdirp', () => {
	it('creates a directory and its parents', () => {
		const fooDir = path.join('foo');
		const bazDir = path.join(fooDir, 'bar', 'baz');
		mkdirp(bazDir);
		assert(fs.existsSync(bazDir));
		fs.rmSync(fooDir, { recursive: true });
	});

	it('does nothing if the directory exists', () => {
		const dir = path.join('foo');
		fs.mkdirSync(dir);
		mkdirp(dir);
		assert(fs.existsSync(dir));
		fs.rmdirSync(dir);
	});
});

describe('rimraf', () => {
	it('removes a file or an empty directory', () => {
		const file = path.join('foo.txt');
		const dir = path.join('bar');

		fs.writeFileSync(file, 'hello');
		fs.mkdirSync(dir);
		assert(fs.existsSync(file));
		assert(fs.existsSync(dir));

		rimraf(file);
		rimraf(dir);
		assert(!fs.existsSync(file));
		assert(!fs.existsSync(dir));
	});

	it('removes a directory and its contents recursively', () => {
		const dir = path.join('foo');
		const subDir = path.join(dir, 'bar');
		const file = path.join(subDir, 'baz.txt');
		mkdirp(subDir);
		fs.writeFileSync(file, 'hello');
		rimraf(dir);
		assert(!fs.existsSync(dir));
	});

	it('does not throw an error if the path does not exist', () => {
		const nonExistent = path.join(__dirname, 'qux');
		expect(() => rimraf(nonExistent)).not.toThrow();
	});
});

describe('write', () => {
	it('creates a file with the given contents', () => {
		const file = path.join('test.txt');
		const contents = 'Hello world';
		write(file, contents);
		assert(fs.existsSync(file));
		expect(fs.readFileSync(file, 'utf8')).toBe(contents);
		fs.unlinkSync(file);
	});

	it('creates intermediate directories if they do not exist', () => {
		const fooDir = path.join('foo');
		const barDir = path.join(fooDir, 'bar');
		const file = path.join(barDir, 'test.txt');
		const contents = 'Hello world';
		write(file, contents);
		assert(fs.existsSync(barDir));
		assert(fs.existsSync(file));
		expect(fs.readFileSync(file, 'utf8')).toBe(contents);
		fs.unlinkSync(file);
		fs.rmSync(fooDir, { recursive: true });
	});

	it('overwrites an existing file with the new contents', () => {
		const file = path.join('test.txt');
		const contents1 = 'Hello world';
		const contents2 = 'Goodbye world';
		write(file, contents1);
		write(file, contents2);
		assert(fs.existsSync(file));
		expect(fs.readFileSync(file, 'utf8')).toBe(contents2);
		fs.unlinkSync(file);
	});
});

describe('walk', () => {
	let tempDir: string;

	beforeAll(() => {
		tempDir = path.join('temp');
		write(path.join(tempDir, 'file1.txt'), 'hello');
		write(path.join(tempDir, 'file2.txt'), 'world');
		write(path.join(tempDir, 'subdir1', 'file3.txt'), 'foo');
		write(path.join(tempDir, 'subdir2', 'file4.txt'), 'bar');
		fs.mkdirSync(path.join(tempDir, 'empty'));
	});
	afterAll(() => {
		fs.rmSync(tempDir, { recursive: true });
	});

	it("doesn't call visitor for non-existent directories", () => {
		let count = 0;
		walk('non-existent', () => count++);
		expect(count).toBe(0);
	});

	it("doesn't call visitor for an empty directory", () => {
		let count = 0;
		walk(path.join(tempDir, 'empty'), () => count++);
		expect(count).toBe(0);
	});

	it('should call visitor for each file and directory', () => {
		const visited: string[] = [];
		walk(tempDir, (info) => {
			visited.push(info.name);
		});

		const expected = [
			'empty',
			'file1.txt',
			'file2.txt',
			'subdir1',
			'file3.txt',
			'subdir2',
			'file4.txt',
		];
		expect(visited).toEqual(expected);
	});

	it('should correctly recurse into subdirectories', () => {
		const visitedSubdirs: string[] = [];
		walk(tempDir, (info) => {
			if (info.isDirectory()) {
				visitedSubdirs.push(info.name);
			}
		});

		const expectedSubdirs = ['empty', 'subdir1', 'subdir2'];
		expect(visitedSubdirs).toEqual(expectedSubdirs);
	});
});
