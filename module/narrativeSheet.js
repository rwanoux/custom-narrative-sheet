import NarrativeDataModel from './dataModel.js';

export default class NarrativeSheet extends ActorSheet {


    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            height: 600,
            width: 850,
            template: "templates/sheets/actor-sheet.html",
            closeOnSubmit: false,
            submitOnClose: true,
            submitOnChange: true,
            resizable: true,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],

            dragDrop: [{
                dragSelector: ".item", dropSelector: null
            },
            {
                dragSelector: ".item", dropSelector: "ol.sortableInventory li.slot"
            },

            ],
            secrets: [{ parentSelector: ".editor" }],
        });
    }

    async getData(options = {}) {
        const context = await super.getData(options);
        context.isGM = game.user.isGM;

        let sortableInventory = await this.actor.getFlag("custom-narrative-sheet", "sortableInventory")
        if (!sortableInventory) { sortableInventory = await this.prepareInventory() }
        context.sortableInventory = sortableInventory;

        let masterRelation = await this.actor.getFlag("custom-narrative-sheet", "masterRelation")
        if (!masterRelation) { masterRelation = await this.prepareMasterRelation() }

        context.masterRelation = masterRelation;

        let textWithBlankGM = await this.actor.getFlag("custom-narrative-sheet", "textWithBlankGM")
        if (!textWithBlankGM) { textWithBlankGM = await this.prepareTextWithBlankGM() }
        context.textWithBlankGM = textWithBlankGM;
        let modelInput = '<input type="text"/>'
        let textWithBlankPlayer = textWithBlankGM.replaceAll('[blank]', modelInput);
        await this.actor.setFlag("custom-narrative-sheet", "textWithBlankPlayer", textWithBlankPlayer);

        context.textWithBlankPlayer = textWithBlankPlayer;

        return context;
    }



    get template() {

        return `modules/custom-narrative-sheet/templates/sheet-template.html`;

    }
    async prepareTextWithBlankGM() {
        let textWithBlankGM = "";
        await this.actor.setFlag("custom-narrative-sheet", "textWithBlankGM", textWithBlankGM);
        return textWithBlankGM;
    }

    async prepareMasterRelation() {
        let masterRelation = 0;
        await this.actor.setFlag("custom-narrative-sheet", "masterRelation", masterRelation);
        return masterRelation
    }
    async _onDrop(event) {

        const data = TextEditor.getDragEventData(event);

        if (this.actor.isOwner && event.currentTarget.classList.contains("slot")) {
            return this.sortInventory(event, data);
        } else {
            super._onDrop(event)
        };

    }
    async sortInventory(event, data) {

        let sortableInventory = await this.actor.getFlag("custom-narrative-sheet", "sortableInventory");
        let targetSlot = event.currentTarget.dataset.slotIndex;
        let available = !event.currentTarget.classList.contains("item");
        if (!available) { return ui.notifications.warn("emplacement d'inventaire déjà occupé") }

        console.log(sortableInventory, targetSlot);
        const item = await Item.implementation.fromDropData(data);
        sortableInventory[targetSlot - 1].itemId = item._id;
        sortableInventory[targetSlot - 1].item = deepClone(item);

        sortableInventory.forEach(slot => {
            if (slot.slot != targetSlot && slot.itemId == item._id) {
                slot.itemId = null;
                slot.item = null
            }
        })
        await this.actor.setFlag("custom-narrative-sheet", "sortableInventory", sortableInventory)
    }
    async activateListeners(html) {
        super.activateListeners(html);



        await this.displayMasterRelation(html);

        html.find('#validTextWithBlanksGM')[0].addEventListener("click", this.changeTextWithBlank.bind(this))

        let masterChecks = html.find('[data-master-value]');
        for (let check of masterChecks) {
            check.addEventListener("change", this.changeMasterRelation.bind(this))
        }
        // roll links
        let rolls = html.find('[data-narrative-roll]');
        for (let roll of rolls) {
            roll.addEventListener('click', this._onRoll.bind(this));
        }
        //getting all narrative data elements
        let flagsElements = html.find('[data-narrative]');


        for (let el of flagsElements) {

            //preparing list flags
            if (el.dataset.narrativeList) {
                this.prepareList(el);
                continue;
            }
            //preparing links
            if (el.dataset.narrativeLinks) {
                this.prepareLinks(el);
                continue;
            }
            // getting value of flags for single inputs
            el.value = await this.actor.getFlag("custom-narrative-sheet", el.dataset.narrative)
            // set flags on changes
            el.addEventListener('change', this._onChangeNarrative.bind(this))
        }
    }

    async changeTextWithBlank(ev) {
        let textWithBlankGM = this.element.find("#textWithBlanksGM")[0].value;
        await this.actor.setFlag("custom-narrative-sheet", "textWithBlankGM", textWithBlankGM);
    }

    async displayMasterRelation(html) {
        let masterRelation = await this.actor.getFlag("custom-narrative-sheet", "masterRelation");
        let container = html.find('#masterRelation')[0];
        console.log(masterRelation);
        for (let i = 0; i < 4; i++) {
            let check = document.createElement('input');
            check.type = "checkbox";
            if (i <= masterRelation) { check.checked = true };
            check.dataset.masterValue = i;
            container.append(check)
        }

    }
    async changeMasterRelation(ev) {
        let masterValue = ev.currentTarget.dataset.masterValue;
        await this.actor.setFlag("custom-narrative-sheet", "masterRelation", masterValue);
        this.render(true)
    }
    async prepareInventory() {
        let sortableInventory = [];
        let index = 0;
        this.actor.items.forEach(it => {
            if (index < 12) {
                sortableInventory[index] = {
                    item: it,
                    slot: index + 1
                };
                index++;
            } else {
                ui.notifications.warn('votre inventaire dépasse 12 objets')
            }
        })

        for (let i = sortableInventory.length; i < 12; i++) {
            sortableInventory[i] = {
                item: null,
                slot: i + 1
            };
        }
        await this.actor.setFlag("custom-narrative-sheet", "sortableInventory", sortableInventory)
        return sortableInventory;
    }
    // les jet d12 avec/sans avantage
    async _onRoll(ev) {
        console.log('narrative roll')
        let formulla = ev.currentTarget.dataset.narrativeRoll;
        let flavor = "";

        let roll = new Roll(formulla);
        await roll.roll();


        switch (ev.currentTarget.id) {
            case "d12advantage":
                flavor = "jet avec avantage";
                break;
            case "d12disadvantage":
                flavor = "jet avec déavantage";
                break;
            case "jetInventaire":
                flavor = "jet d'inventaire";
                await this.onInventoryRoll(roll);

            default:
                flavor = "jet normal"
                break;

        }


        await roll.toMessage({ flavor: flavor });

    }

    async onInventoryRoll(roll) {
        console.log(roll.result);
        let limit = roll.result;
        let sortableInventory = await this.actor.getFlag("custom-narrative-sheet", "sortableInventory");
        sortableInventory.forEach(slot => {
            slot.available = (slot.slot <= limit);
        });
        await this.actor.setFlag("custom-narrative-sheet", "sortableInventory", sortableInventory)

    }
    async prepareLinks(element) {
        console.log(element);
        //adding a create button
        let icone = document.createElement("i")
        icone.classList.add("fa", "narrative-list-add", "fa-add");
        icone.addEventListener("click", this.addLink.bind(this));
        icone.title = "ajouter un élément"
        element.append(icone);
        let links = await this.actor.getFlag("custom-narrative-sheet", element.dataset.narrative);
        if (!links) { links = [] }
        for (let link of links) {
            this.createLinksItem(link, element)
        }

    }
    addLink(ev) {
        let parentElement = ev.currentTarget.closest('[data-narrative]');

        let itemEl = document.createElement("li");
        itemEl.classList.add("narrative-links-item", "flexcol");

        let itemInput = document.createElement('textarea');

        // creating a select for each actor owned by users
        let selectLink = document.createElement('select');
        let optNone = document.createElement('option');
        optNone.innerHTML = "selectionnez la cible du lien";
        selectLink.append(optNone)
        game.users.forEach(user => {
            if (user.character) {
                let opt = document.createElement('option');
                opt.value = user.character._id;
                opt.innerHTML = user.name + " // " + user.character.name;
                selectLink.append(opt)
            }
        });
        //creating a validate button
        let validBut = document.createElement('a');
        validBut.innerHTML = "valider"
        validBut.addEventListener("click", this.addNewLink.bind(this))
        itemEl.append(selectLink, itemInput, validBut);

        parentElement.append(itemEl);

    }

    async addNewLink(ev) {
        let parent = ev.currentTarget.closest("li.narrative-links-item");
        let selectActor = parent.getElementsByTagName('SELECT')[0];
        let actorId = selectActor.options[selectActor.selectedIndex].value;
        let linkDesc = parent.getElementsByTagName('TEXTAREA')[0].value;

        let linksFlag = await this.actor.getFlag("custom-narrative-sheet", "links");
        if (!linksFlag) { linksFlag = [] };
        let linkId = foundry.utils.randomID();
        parent.setAttribute('data-narrative-link-id', linkId)
        let newLink = { id: linkId, actorId: actorId, description: linkDesc };
        linksFlag.push(newLink);

        await this.actor.setFlag("custom-narrative-sheet", "links", linksFlag);
        this.render(true);

    }
    async createLinksItem(link, parentElement) {



        let actorLinked = await game.actors.get(link.actorId);
        //todo effacer le lien si plus d'actor existant;
        if (actorLinked) {
            let actorName = actorLinked.name;
            let linkDesc = link.description;

            let li = document.createElement('li');
            li.setAttribute("data-link-id", link.id);


            let title = document.createElement('h4');
            title.innerHTML = actorName;
            let par = document.createElement('p');
            par.innerHTML = link.description;
            let i = document.createElement('i');
            i.classList.add("fa", "fa-minus");
            i.title = "supprimer l'élément";
            title.append(i)
            // listener for button
            i.addEventListener("click", this.removeLinkItem.bind(this));
            li.append(title, par);
            parentElement.append(li)
        } else {
            ui.notifications.warn(`le lien ${link.description} est affecté à un personnage non existant`)
        }



    }
    async removeLinkItem(ev) {

        let linkId = ev.currentTarget.closest('li').dataset.linkId;
        let flagLinks = await this.actor.getFlag("custom-narrative-sheet", "links");

        let targetLink = flagLinks.find(it => it.id == linkId)


        let index = flagLinks.indexOf(targetLink);

        flagLinks.splice(index, 1);
        await this.actor.setFlag("custom-narrative-sheet", "links", flagLinks)

        this.render(true);



    }
    async prepareList(element) {

        //adding a create button
        let icone = document.createElement("i")
        icone.classList.add("fa", "narrative-list-add", "fa-add");
        icone.addEventListener("click", this.addItemList.bind(this));
        icone.title = "ajouter un élément"
        element.append(icone);

        // getting related flag
        let list = await this.actor.getFlag("custom-narrative-sheet", element.dataset.narrative);
        // if no list creating an empty one
        if (!list) { list = [] }

        // creating all list elements
        for (let item of list) {
            this.createItemList(item, element)
        }



    }

    async removeListItem(ev) {
        console.log(ev.currentTarget);
        let itemValue = ev.currentTarget.closest('li').getElementsByTagName('span')[0].innerHTML;
        let parentElement = ev.currentTarget.closest('[data-narrative]');
        let parentFlag = parentElement.dataset.narrative;
        let flagValues = await this.actor.getFlag("custom-narrative-sheet", parentFlag);
        console.log(flagValues, itemValue);
        let index = flagValues.indexOf(itemValue);

        flagValues.splice(index, 1);
        await this.actor.setFlag("custom-narrative-sheet", parentFlag, flagValues)

        this.render(true);


    }
    async createItemList(item, parentElement) {
        // creating a list item
        let li = document.createElement('li');
        li.classList.add("flexrow");

        //putting value of the element in a span
        let span = document.createElement('span');
        span.innerHTML = item;
        li.append(span);
        li.classList.add("narrative-list-item");

        // creating delete button
        let i = document.createElement('i');
        i.classList.add("fa", "fa-minus");
        i.title = "supprimer l'élément";
        // listener for button
        i.addEventListener("click", this.removeListItem.bind(this));
        li.append(i)

        parentElement.append(li)

    }
    async addItemList(ev) {
        let parentElement = ev.currentTarget.closest('[data-narrative]');
        let parentFlag = ev.currentTarget.closest('[data-narrative]').dataset.narrative;
        console.log(parentFlag);
        /*
        let flagValue = await this.actor.getFlag("custom-narrative-sheet", parentFlag)
        console.log(flagValue);
        */
        let itemEl = document.createElement("li");
        itemEl.classList.add("narrative-list-item", "flexrow");
        let itemInput = document.createElement('input');
        itemInput.type = "text";
        itemInput.addEventListener('change', this.addListValue.bind(this))
        itemEl.append(itemInput)


        parentElement.append(itemEl);
        itemEl.focus();
    }

    async addListValue(ev) {
        let flagName = ev.currentTarget.closest('[data-narrative]').dataset.narrative;
        let flagValue = await this.actor.getFlag("custom-narrative-sheet", flagName);
        console.log(flagValue);
        if (!flagValue) {
            return await this.actor.setFlag("custom-narrative-sheet", flagName, [ev.currentTarget.value])
        }
        flagValue.push(ev.currentTarget.value);
        await this.actor.setFlag("custom-narrative-sheet", flagName, flagValue)

    }
    async _onChangeNarrative(ev) {
        let el = ev.currentTarget;
        let flagName = el.dataset.narrative;
        let flagValue = el.value;
        console.log(flagName);
        await this.actor.setFlag("custom-narrative-sheet", flagName, flagValue)
        return await this.render(true)

    }
}