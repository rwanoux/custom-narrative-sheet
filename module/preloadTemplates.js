export const preloadTemplates = async function () {
	const templatePaths = [
		// Add paths to "modules/custom-narrative-sheet/templates"
		"modules/custom-narrative-sheet/templates/item-power.html"
	];

	return loadTemplates(templatePaths);
}
