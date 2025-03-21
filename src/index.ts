import { chill_fi_agent } from './agent';

async function main() {
    try {
        // Initialize the agent
        await chill_fi_agent.init();
        
        // Run the agent
        while (true) {
            await chill_fi_agent.step({ verbose: true });
        }
    } catch (error) {
        console.error("Error running ChillFi agent:", error);
    }
}

main(); 