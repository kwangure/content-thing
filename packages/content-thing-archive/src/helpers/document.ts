export function parseDocumentSections(document: string) {
	const regex = /^---\s*[\r\n]+(.*?)[\r\n]+---\s*([\s\S]*)$/;
	const match = document.match(regex);
	if (match) {
		return {
			frontmatter: match[1].trim(),
			content: match[2].trim(),
		};
	}

	return {
		frontmatter: '',
		content: document.trim(),
	};
}
