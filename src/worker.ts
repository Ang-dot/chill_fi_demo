import TwitterPlugin, {
    GameTwitterClient,
} from "@virtuals-protocol/game-twitter-plugin";
import { GameWorker } from "@virtuals-protocol/game";
import { config } from "dotenv";
import { resolve } from "path";
import { computePoolAddressFn, resetAgentStateFn, setAgentTaskFn } from "./functions";

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// Verify environment variables before imports
if (!process.env.GAME_TWITTER_ACCESS_TOKEN) {
    throw new Error('GAME_TWITTER_ACCESS_TOKEN is missing in .env file');
}

const gameTwitterClient = new GameTwitterClient({
    accessToken: process.env.GAME_TWITTER_ACCESS_TOKEN,
});

const twitterPlugin = new TwitterPlugin({
    id: "twitter_worker",
    name: "Twitter Worker",
    description: "A worker that will execute tasks within the Twitter Social Platforms. It is only capable of searching, and replying tweets, for scopes other than that, go to other workers to fulfil the request (ie: go to Aperture Finance worker to compute pool address). You must only reply to the tweet_id with complete task_result in agent state and reset agent state if and only if the task is completed or failed. NEVER REPLY ANYTHING WITHOUT CHECKING WITH HLP IF THE TASK IS BEYOND YOUR CAPABILITY.",
    twitterClient: gameTwitterClient,
});

// Create a worker with the functions
export const twitterWorker = twitterPlugin.getWorker({
    functions: [
        twitterPlugin.searchTweetsFunction,
        twitterPlugin.replyTweetFunction,
        setAgentTaskFn,
        resetAgentStateFn
    ],
});

export const apertureFinanceWorker = new GameWorker({
    id: "aperture_finance_worker",
    name: "Aperture Finance Worker",
    description: "A worker that will execute DeFi tasks (ie: computing pool address, adjusting liquidity pool) using Aperture Finance tools, refer to agent state for more accurate argument inputs.",
    functions: [
        computePoolAddressFn,
    ]
});
