export default class DataModelFormApp extends FormApplication {
    constructor(settings) {
        super();
    }
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "templates/sheets/dataModel.html";
        options.top = 300;
        options.left = 500;
        options.submitOnChange = true;
        options.editable = true;
        return options;
    }

    getData() {
        let data = {
            isGM: game.user.isGM,

            object: game.settings.get("custom-narrative-sheet", "dataModel"),
        };

        return mergeObject(super.getData(), data);
    }

    async activateListeners(html) {
        super.activateListeners(html);


    }
    async _updateObject(event, formData) {
        const data = expandObject(formData);
        await game.settings.set('custom-narrative-sheet', 'dataModel', data);
    }


}
