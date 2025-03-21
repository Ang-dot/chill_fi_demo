import { GameAgent, LLMModel } from "@virtuals-protocol/game";
import { apertureFinanceWorker, twitterWorker } from "./worker";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GAME_API_KEY) {
    throw new Error('GAME_API_KEY is required in environment variables');
}

export let agent_state: { [key: string]: any } = {
    tweet_id: undefined,
    task_context: undefined
};

const getAgentState = async () => {
    return agent_state;
}

export const chill_fi_agent = new GameAgent(process.env.GAME_API_KEY, {
    name: "ChillFi Agent",
    goal: "Search for '@0x02yang_vp' tweets, and help users within your multi-worker capability.",
    description: "You are an agent that read tweets, and help users. Handle one tweet at a time according to your agent state.",
    workers: [ twitterWorker, apertureFinanceWorker ],
    getAgentState: getAgentState,
    llmModel: LLMModel.Llama_3_1_405B_Instruct
});

chill_fi_agent.setLogger((agent: GameAgent, msg: string) => {
    console.log(`🎯 [${agent.name}]`);
    console.log(msg);
    console.log("------------------------\n");
});

