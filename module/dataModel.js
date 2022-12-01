import FillInBlank from "./FillInBlank.js";
import Links from "./Links.js";

export default class NarrativeDataModel {

    constructor() {
        this.archetype = "archetype";
        this.quote = "citation";
        this.inspiredWords = [];
        this.rituals = [];
        this.memories = [];
        this.links = []
        this.objectif = "";
        this.clocks = [];

    }
    addLink(actorId, description) {
        this.links.push(new Links(actorId, description));
        return this
    }


}

