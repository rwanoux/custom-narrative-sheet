export const preloadTemplates = async function() {
	const templatePaths = [
		// Add paths to "modules/custom-narrative-sheet/templates"
	];

	return loadTemplates(templatePaths);
}
