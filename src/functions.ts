import { config } from 'dotenv';
import { resolve } from 'path';
import { ExecutableGameFunctionResponse, ExecutableGameFunctionStatus, GameFunction } from "@virtuals-protocol/game";
import { ApertureSupportedChainId, computePoolAddress } from "@aperture_finance/uniswap-v3-automation-sdk";
import { AutomatedMarketMakerEnum } from "aperture-lens/dist/src/viem";
import { FeeAmount } from "@aperture_finance/uniswap-v3-sdk";
import { agent_state } from "./agent";

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

export const setAgentTaskFn = new GameFunction({
    name: "set_agent_task",
    description: "Set the agent task for information to pass between workers, the tweet_id, and the task context.",
    args: [
        {
            name: "tweet_id",
            description: "The tweet that's being processed",
            type: "string"
        },
        {
            name: "task_context",
            description: "The full context of the task, such as the user's request (ie: 'compute pool address for on x chain for token A and token B')",
            type: "string"
        },
    ] as const,
    executable: async (args, logger) => {
        try {
            agent_state.tweet_id = args.tweet_id;
            agent_state.task_context = args.task_context;

            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                "Agent state has been set"
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to set agent state: ${e instanceof Error ? e.message : "Unknown error"}`
            );
        }
    }
})

export const resetAgentStateFn = new GameFunction({
    name: "reset_agent_state",
    description: "Reset the agent state after the task has been completed.",
    args: [] as const,
    executable: async (args, logger) => {
        try {
            agent_state.tweet_id = undefined;
            agent_state.task_context = undefined;
            agent_state.task_result = undefined;

            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                "Agent state has been reset"
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to reset agent state: ${e instanceof Error ? e.message : "Unknown error"}`
            );
        }
    }
})

// Function to compute pool address
export const computePoolAddressFn = new GameFunction({
    name: "compute_pool_address",
    description: "Compute the pool address based on the chain and the tokens",
    args: [
        { name: "chain_id", description: "Chain's id", type: "int" },
        { name: "token_1_address", description: "Token 1's address", type: "string" },
        { name: "token_2_address", description: "Token 2's address", type: "string" },
    ] as const,
    executable: async (args, logger) => {
        try {
            const poolAddress = computePoolAddress(
                Number(args.chain_id) as ApertureSupportedChainId,
                AutomatedMarketMakerEnum.enum.UNISWAP_V3,
                args.token_1_address as string,
                args.token_2_address as string,
                FeeAmount.MEDIUM
            )

            const taskResult = `The computed pool address is ${poolAddress}`;
            agent_state.task_result = taskResult;

            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                taskResult
            );
        } catch (e) {
            const taskResult = `Failed to compute pool address: ${e instanceof Error ? e.message : 'Unknown error'}`;
            agent_state.task_result = taskResult;

            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                taskResult
            );
        }
    }
});
