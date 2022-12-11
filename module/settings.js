import DataModelFormApp from './dataModelFormApp.js';
export const registerSettings = async function () {
	game.settings.register("custom-narrative-sheet", "actorsChecked", {
		// game.setting.register("NameOfTheModule", "VariableName",
		name: "vérification des actors",
		label: "vérification des actors", // Register a module setting with checkbox
		hint: "lancer la vérification des actors, cela relancera le world", // Description of the settings
		scope: "world", // This specifies a client-stored setting
		config: true,
		default: false,
		restricted: true, // This specifies that the setting appears in the configuration view
		type: Boolean,
		onChange: () => window.location.reload()

	});
	game.settings.register("custom-narrative-sheet", "allowPlayersModif", {
		// game.setting.register("NameOfTheModule", "VariableName",
		name: "Autoriser les joueurs à modifier les fiches",
		label: "Autoriser les joueurs à modifier les fiches", // Register a module setting with checkbox
		hint: "Si décoché, les boutons d'ajout et suppression n'apparaisseront pas sur les fiches des joueurs", // Description of the settings
		scope: "world", // This specifies a client-stored setting
		config: true,
		default: false,
		restricted: true, // This specifies that the setting appears in the configuration view
		type: Boolean,

	});

}
