class CommandManager {
    constructor() {
        this.commands = {};
        this.cooldowns = {};
    }

    registerCommand(name, execute, cooldown = 0) {
        this.commands[name] = { execute, cooldown };
        this.cooldowns[name] = new Map();
    }

    async executeCommand(name, userId) {
        if (!this.commands[name]) {
            throw new Error(`Command ${name} not found`);
        }
        const now = Date.now();
        const command = this.commands[name];

        // Check cooldown
        if (this.cooldowns[name].has(userId)) {
            const expirationTime = this.cooldowns[name].get(userId);
            if (now < expirationTime) {
                throw new Error(`Command ${name} is on cooldown.`);
            }
        }

        // Execute command
        await command.execute();

        // Set cooldown
        this.cooldowns[name].set(userId, now + command.cooldown);
    }
}

export default CommandManager;