export default class Links {
    constructor(actorId, description) {
        this.linkedActorId = actorId;
        this.description = description;
    }
    async getLinkedActor() {
        return await Gamepad.actors.get(this.linkedActorId)
    }
    async sendDescriptionToLink() {
        ChatMessage.create({
            content: "this.description",
            whisper: [this.linkedActorId]
        });
    }
}