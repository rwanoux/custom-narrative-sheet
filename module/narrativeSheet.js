import NarrativeDataModel from './dataModel.js';
import defaultTooltips from '../defaultTooltips.js';


export default class NarrativeSheet extends ActorSheet {


    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            height: 670,
            width: 850,
            template: "templates/sheets/actor-sheet.html",
            closeOnSubmit: false,
            submitOnClose: true,
            submitOnChange: true,
            resizable: true,
            classes: ["custom-narrative"],
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

        context.defaultTooltips = defaultTooltips;
        let sortableInventory = await this.actor.getFlag("custom-narrative-sheet", "sortableInventory")
        if (!sortableInventory) { sortableInventory = await this.prepareInventory() }
        context.sortableInventory = sortableInventory;

        let masterRelation = await this.actor.getFlag("custom-narrative-sheet", "masterRelation")
        if (!masterRelation) { masterRelation = await this.prepareMasterRelation() }

        context.masterRelation = masterRelation;

        let textWithBlankGM = await this.actor.getFlag("custom-narrative-sheet", "textWithBlankGM")
        if (!textWithBlankGM) { textWithBlankGM = await this.prepareTextWithBlankGM() }
        context.textWithBlankGM = textWithBlankGM;

        let textWithBlankPlayer = await this.prepareTextWithBlankPlayer()
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
    async prepareTextWithBlankPlayer() {
        let textGM = await this.actor.getFlag("custom-narrative-sheet", "textWithBlankGM");
        let arrayText = textGM.split('[blank]');
        await this.actor.setFlag("custom-narrative-sheet", "splitedText", arrayText)
        let textInputs = "";
        for (let i = 0; i < arrayText.length; i++) {
            textInputs += arrayText[i];
            if (i < arrayText.length - 1) {
                textInputs += `<input type="text" data-blank-index="${i}"/>`
            }

        }
        console.log(textInputs)
        await this.actor.setFlag("custom-narrative-sheet", "textWithBlankPlayer", textInputs)
        return textInputs
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
        });
        let realItem = this.actor.getEmbeddedDocument("Item", item._id);
        await realItem.setFlag("custom-narrative-sheet", "inventorySlot", targetSlot)
        await this.actor.setFlag("custom-narrative-sheet", "sortableInventory", sortableInventory)
    }


    async activateListeners(html) {
        super.activateListeners(html);
        let masterRelation=await this.actor.getFlag("custom-narrative-sheet", "masterRelation");
        let selector=".master"+masterRelation;
        console.log(selector);
        let textareas=html.find(selector);
        for(let t of textareas){
            t.classList.add("active")
        }
        
        await this.prepareBlanks(html);
        let blanks = html.find('[data-blank-index]');
        for (let blank of blanks) {
            blank.addEventListener('change', this.fillBlanks.bind(this))
        }

        let itemActions = html.find('[data-item-control]');
        for (let action of itemActions) {
            console.log(action)
            action.addEventListener('click', this.onItemAction.bind(this))
        }
        await this.displayMasterRelation(html);
        if (game.user.isGM) {
            html.find('#validTextWithBlanksGM')[0].addEventListener("click", this.changeTextWithBlank.bind(this))

        }
        let itemUses = html.find(".slot.available [data-item-control='grab']");
        for (let slot of itemUses) {
            slot.addEventListener('click', this.grabItem.bind(this))
        }
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

        let allowModif = await game.settings.get("custom-narrative-sheet", "allowPlayersModif");
        if (!allowModif && !game.user.isGM) {
            let icones = html.find('.fa-add');
            for (let i of icones) {
                i.remove()
            }
            icones = html.find('.fa-minus');
            for (let i of icones) {
                i.remove()
            }

        }
    }
    async grabItem(ev) {
        let itemId = ev.currentTarget.closest('.item').dataset.itemId;
        let item = await this.actor.getEmbeddedDocument("Item", itemId);
        if (!item) { return ui.notifications.warn('vous voulez utiliser un emplacement vide') }
        let messContent = `
            <h3>${this.actor.name}</h3>
            <p>prends <strong>${item.name}</strong></p>
        `
        let chatData = {
            user: game.user._id,
            speaker: ChatMessage.getSpeaker(),
            content: messContent
        };
        ChatMessage.create(chatData);
    }
    async prepareBlanks(html) {
        let blanks = html.find('[data-blank-index]');
        let blanksFilled = await this.actor.getFlag("custom-narrative-sheet", "blanks");
        if (!blanksFilled) { blanksFilled = [] }
        for (let i = 0; i < blanks.length; i++) {
            blanks[i].value = blanksFilled[i];

        }
    }
    onItemAction(ev) {
        console.log("action")
        let itemId = ev.currentTarget.closest('li.item').dataset.itemId;
        let action = ev.currentTarget.dataset.itemControl;
        switch (action) {
            case "edit":
                this.openItemSheet(itemId);
                break;
            case "delete":
                this.deleteItem(itemId);
                break;
            case "emptySlot":
                this.emptySlot(itemId);
                break;
        }
    }
    async deleteItem(id) {
        let item = await this.actor.getEmbeddedDocument("Item", id);

        let dial = new Dialog({
            content: `êtes vous sûr de vouloir supprimer ${item.name}`,
            buttons: {
                one: {
                    icon: '<i class="fas fa-trash"></i>',
                    label: `oui supprimer`,
                    callback: () =>
                        item.delete()

                },
                two: {
                    icon: '<i class="fas fa-ban"></i>',
                    label: `Oops, ne rien faire`,

                },
            },
        });
        dial.render(true);
    }
    async emptySlot(id) {
        let sortableInventory = await this.actor.getFlag("custom-narrative-sheet", "sortableInventory");
        let targetSlot = sortableInventory.find(sl => sl.itemId == id);
        targetSlot.itemId = null;
        targetSlot.item = null;
        await this.actor.setFlag("custom-narrative-sheet", "sortableInventory", sortableInventory)
    }
    async openItemSheet(id) {
        let item = await this.actor.getEmbeddedDocument("Item", id);
        item.sheet.render(true)
    }
    async fillBlanks(ev) {
        let blankIndex = ev.currentTarget.dataset.blankIndex;
        let blanks = await this.actor.getFlag("custom-narrative-sheet", "blanks") || [];
        blanks[blankIndex] = ev.currentTarget.value;
        await this.actor.setFlag("custom-narrative-sheet", "blanks", blanks)
    }
    async changeTextWithBlank(ev) {
        let textWithBlankGM = this.element.find("#textWithBlanksGM")[0].value.trim();
        await this.actor.setFlag("custom-narrative-sheet", "textWithBlankGM", textWithBlankGM);

    }

    async displayMasterRelation(html) {
        let masterRelation = await this.actor.getFlag("custom-narrative-sheet", "masterRelation");
        let container = html.find('#masterRelation')[0];
        console.log(masterRelation);
        for (let i = 1; i < 4; i++) {
            let blk = document.createElement('div');
            blk.classList.add("checkerBox")
            let check = document.createElement('input');
            check.type = "checkbox";
            check.classList.add("masterRelation");
            if (i <= masterRelation) { check.setAttribute('checked', true); blk.classList.add("checked") };
            check.dataset.masterValue = i;

            let span = document.createElement('span');
            span.classList.add('checker')
            blk.append(check, span);
            container.append(blk)
        }

    }
    async changeMasterRelation(ev) {
        let old = await this.actor.getFlag("custom-narrative-sheet", "masterRelation")
        let masterValue = ev.currentTarget.dataset.masterValue;
        ev.currentTarget.checked ? ev.currentTarget.setAttribute("checked", true) : ev.currentTarget.setAttribute("checked", false)
        if (masterValue == 1 && old == 1) { masterValue = 0 }
        await this.actor.setFlag("custom-narrative-sheet", "masterRelation", masterValue);
        this.render(true);
        
    }
    async prepareInventory() {
        let sortableInventory = [];
        let index = 0;
        this.actor.items.forEach(async (it) => {
            if (index < 12) {
                sortableInventory[index] = {
                    item: it,
                    itemId: it._id,
                    slot: index + 1
                };
                await it.setFlag("custom-narrative-sheet", "inventorySlot", index + 1)
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
                break

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

            let check = document.createElement('input');
            check.type = "checkbox";
            if (link.assigned) { check.checked = true };
            check.value = true;
            check.addEventListener('change', this.assignLink.bind(this))
            // listener for button
            i.addEventListener("click", this.onDeleteLink.bind(this));
            title.append(check, i);
            li.append(title, par);
            parentElement.append(li)
        }
        // si actor en lien n'existe pas/plus le lien est supprimé
        else {
            this.deleteLink(link.id)
        }



    }
    async assignLink(ev) {
        let linkId = ev.currentTarget.closest('li').dataset.linkId;
        let links = await this.actor.getFlag("custom-narrative-sheet", "links");
        let targetLink = links.find(l => l.id == linkId);
        let value = ev.currentTarget.checked;
        targetLink.assigned = value;
        await this.actors.setFlag("custom-narrative-sheet", "links", links)
    }
    async deleteLink(id) {
        let flagLinks = await this.actor.getFlag("custom-narrative-sheet", "links");
        let targetLink = flagLinks.find(it => it.id == id)
        let index = flagLinks.indexOf(targetLink);
        flagLinks.splice(index, 1);
        await this.actor.setFlag("custom-narrative-sheet", "links", flagLinks)
        this.render(true);
    }

    async onDeleteLink(ev) {
        let linkId = ev.currentTarget.closest('li').dataset.linkId;
        await this.deleteLink(linkId)
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