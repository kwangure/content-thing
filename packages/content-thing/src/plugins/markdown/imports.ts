export class Import {
	default?: string;
	named: Map<string, string> = new Map();
	constructor(public path: string) {}
}

export class Imports {
	private imports: Map<string, Import> = new Map();
	private usedNames: Set<string> = new Set();

	private getUniqueName(name: string): string {
		let uniqueName = name;
		let counter = 1;
		while (this.usedNames.has(uniqueName)) {
			uniqueName = `${name}$$${counter}`;
			counter++;
		}
		return uniqueName;
	}

	add(path: string, name: string, isDefault = false): string {
		let importObj = this.imports.get(path);
		if (!importObj) {
			importObj = new Import(path);
			this.imports.set(path, importObj);
		}

		const uniqueName = this.getUniqueName(name);
		if (isDefault) {
			if (importObj.default) {
				return importObj.default;
			}
			this.usedNames.add(uniqueName);
			importObj.default = uniqueName;
		} else {
			if (importObj.named.has(name)) {
				return importObj.named.get(name)!;
			}
			this.usedNames.add(uniqueName);
			importObj.named.set(name, uniqueName);
		}
		return uniqueName;
	}

	clear() {
		this.imports.clear();
		this.usedNames.clear();
	}

	toString(options?: { indent?: string }): string {
		const importStrings: string[] = [];

		for (const [path, importObj] of this.imports) {
			const importParts: string[] = [];

			// Handle default import
			if (importObj.default) {
				importParts.push(importObj.default);
			}

			// Handle named imports
			if (importObj.named.size > 0) {
				const namedImports = Array.from(importObj.named.entries())
					.map(([original, unique]) =>
						original === unique ? original : `${original} as ${unique}`,
					)
					.join(', ');
				importParts.push(`{ ${namedImports} }`);
			}

			// Combine all parts into an import statement
			if (importParts.length > 0) {
				importStrings.push(`import ${importParts.join(', ')} from '${path}';`);
			}
		}

		const indent = options?.indent ?? '';
		return indent + importStrings.join(`\n${indent}`);
	}
}
