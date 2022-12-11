/**
 * This is your JavaScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */

// Import JavaScript modules
import { registerSettings } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import NarrativeDataModel from './module/dataModel.js';
import NarrativeSheet from './module/narrativeSheet.js';
/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
	console.log('custom-narrative-sheet | Initializing custom-narrative-sheet');
	CONFIG.debug.hooks = true;
	// Assign custom classes and constants here

	// Register custom module settings
	registerSettings();

	// Preload Handlebars templates
	await preloadTemplates();

	// Register custom sheets (if any)
	DocumentSheetConfig.registerSheet(Actor, "core", NarrativeSheet, { label: "narrative sheet", makeDefault: true });

});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
	// Do anything after initialization but before
	// ready
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', async function () {
	// checking game settings
	let checkActorsOk = await game.settings.get("custom-narrative-sheet", "actorsChecked");
	let model = new NarrativeDataModel();

	console.log('//custom narrative sheet// actors checked:'+checkActorsOk, '//modelData\\',model);

	if (!checkActorsOk) {
		for (let actor of game.actors) {
			if (actor.flags["custom-narrative-sheet"]) { continue };

			await actor.setFlag("custom-narrative-sheet", model);
			console.log("custom-narrative-sheet // init done for " + actor.name + " //");

		}
		await game.settings.set("custom-narrative-sheet", "actorsChecked", true);
	}



});

// Add any additional hooks if necessary
