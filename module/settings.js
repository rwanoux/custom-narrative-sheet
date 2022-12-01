import DataModelFormApp from './dataModelFormApp.js';
export const registerSettings = async function () {
	game.settings.register("custom-narrative-sheet", "actorsChecked", {
		// game.setting.register("NameOfTheModule", "VariableName",
		name: "actorFlagsCheck",
		label: "vérification des actors", // Register a module setting with checkbox
		hint: "lancer la vérification des actors, cela relancera le world", // Description of the settings
		scope: "world", // This specifies a client-stored setting
		config: true,
		default: false,
		restricted: true, // This specifies that the setting appears in the configuration view
		type: Boolean,
		onChange: () => window.location.reload()

	});

}
