import { config } from 'dotenv';
import { resolve } from 'path';
import { ExecutableGameFunctionResponse, ExecutableGameFunctionStatus, GameFunction } from "@virtuals-protocol/game";
import {
    ApertureSupportedChainId,
    computePoolAddress,
    getChainInfo,
    getRpcEndpoint
} from "@aperture_finance/uniswap-v3-automation-sdk";
import { AutomatedMarketMakerEnum } from "aperture-lens/dist/src/viem";
import { FeeAmount, nearestUsableTick } from "@aperture_finance/uniswap-v3-sdk";
import { agent_state } from "./agent";
import {estimateRebalanceGas, getPool} from "@aperture_finance/uniswap-v3-automation-sdk/dist/viem";
import { createPublicClient, http, Address } from "viem";

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
            description: "The full context of the task, such as the user's request (ie: 'compute pool address for on x chain for token A and token B'), full details are required for the agent to process the task.",
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
        { name: "token0_address", description: "First token's address", type: "string" },
        { name: "token1_address", description: "Second token's address", type: "string" },
    ] as const,
    executable: async (args, logger) => {
        try {
            const poolAddress = computePoolAddress(
                Number(args.chain_id) as ApertureSupportedChainId,
                AutomatedMarketMakerEnum.enum.UNISWAP_V3,
                args.token0_address as Address,
                args.token1_address as Address,
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

export const estimateRebalanceGasWithFromFn = new GameFunction({
    name: "estimate_rebalance_gas_with_from",
    description: "Estimate the gas for rebalancing with the from address, able to execute without pool address",
    args: [
        { name: "token0_address", description: "First token's address", type: "string" },
        { name: "token1_address", description: "Second token's address", type: "string" },
        { name: "chain_id", description: "The chain id", type: "int" },
        { name: "from", description: "The address to send the transaction from", type: "string" },
        { name: "eoa", description: "The address to send the transaction to", type: "string" },
    ] as const,
    executable: async(args, logger) => {
        try {
            const token0 = args.token0_address as Address;
            const token1 = args.token1_address as Address;
            const chainId = Number(args.chain_id) as ApertureSupportedChainId;
            const from = args.from as Address;
            const eoa = args.eoa as Address;
            const blockNumber = 17975698n;
            const publicClient = createPublicClient({
                batch: {
                    multicall: true,
                },
                chain: getChainInfo(chainId).chain,
                transport: http(getRpcEndpoint(chainId)),
            });
            const fee = FeeAmount.MEDIUM;
            const amount0Desired = 100000000n;
            const amount1Desired = 1000000000000000000n;
            const pool = await getPool(
                token0,
                token1,
                fee,
                chainId,
                AutomatedMarketMakerEnum.enum.UNISWAP_V3,
                publicClient,
                blockNumber,
            );
            const mintParams = {
                token0: token0,
                token1: token1,
                fee,
                tickLower: nearestUsableTick(
                    pool.tickCurrent - 10 * pool.tickSpacing,
                    pool.tickSpacing,
                ),
                tickUpper: nearestUsableTick(
                    pool.tickCurrent + 10 * pool.tickSpacing,
                    pool.tickSpacing,
                ),
                amount0Desired,
                amount1Desired,
                amount0Min: BigInt(0),
                amount1Min: BigInt(0),
                recipient: eoa,
                deadline: BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
            };
            const gas = await estimateRebalanceGas(
                chainId,
                AutomatedMarketMakerEnum.enum.UNISWAP_V3,
                publicClient,
                from,
                eoa,
                mintParams,
                4n,
                undefined,
                undefined,
                blockNumber,
            );
            const taskResult = `The estimated gas for rebalancing the pool is ${gas.toString()}`;
            agent_state.task_result = taskResult;
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                taskResult
            );
        } catch (e) {
            const error = e instanceof Error ? e.message : 'Unknown error';
            agent_state.task_result = error;
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                error
            );
        }
    }
})
