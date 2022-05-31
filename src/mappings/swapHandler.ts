import {CurrencyId, CurrencyId_Token} from "../types/v2041"
import primitivesConfig from '@acala-network/type-definitions/primitives'
import {EventHandlerContext} from "@subsquid/substrate-processor"
import {DexSwapEvent} from "../types/events"
import {LiquidityChangeReason} from "../model"
import {addLiquidityChange} from "./utility"
import {addPoolLiquidity, addPoolVolume, createPool} from "../utils/pools"
import {createCurrency, createCurrPrice, createCurrVolumeDay} from "../utils/currency";
import {createSwap} from "../utils/swap";

interface SwapParams {
    trader: Uint8Array, 
    propPath: CurrencyId[], 
    liquidityChanges: bigint[]
  }

async function getSwapParams(ctx: EventHandlerContext): Promise<SwapParams> {
    const event = new DexSwapEvent(ctx)

    if (event.isV1000) {
        const [trader, trading_path, supply_currency_amount, target_currency_amount] = event.asV1000
        const propPath = trading_path as CurrencyId[]
        const liquidityChanges = [supply_currency_amount, target_currency_amount]
        return {trader, propPath, liquidityChanges}
    }
    if (event.isV1008) {
        const [trader, path, liquidityChanges] = event.asV1008
        const propPath = path as CurrencyId[] 
        return {trader, propPath, liquidityChanges}
    }
    if (event.isV1009) {
        const [trader, path, liquidityChanges] = event.asV1009
        const propPath = path as CurrencyId[] 
        return {trader, propPath, liquidityChanges}
    }
    if (event.isV1019) {
        const [trader, path, liquidityChanges] = event.asV1019
        const propPath = path as CurrencyId[] 
        return {trader, propPath, liquidityChanges}
    }
    if (event.isV2001) {
        const [trader, path, liquidityChanges] = event.asV2001
        const propPath = path as CurrencyId[] 
        return {trader, propPath, liquidityChanges}
    }
    if (event.isV2010) {
        const [trader, path, liquidityChanges] = event.asV2010
        const propPath = path as CurrencyId[] 
        return {trader, propPath, liquidityChanges}
    }
    if (event.isV2011) {
        const [trader, path, liquidityChanges] = event.asV2011
        const propPath = path as CurrencyId[] 
        return {trader, propPath, liquidityChanges}
    }
    if (event.isV2012) {
        const {trader, path, liquidityChanges} = event.asV2012
        const propPath = path as CurrencyId[] 
        return {trader, propPath, liquidityChanges}
    }
    if (event.isV2022) {
        const {trader, path, liquidityChanges} = event.asV2022
        const propPath = path as CurrencyId[] 
        return {trader, propPath, liquidityChanges}
    }

    const {trader, path, liquidityChanges} = event.asV2041
    const propPath = path as CurrencyId[]
    return {trader, propPath, liquidityChanges}
}

export async function handleSwap(ctx: EventHandlerContext): Promise<void> {
    const { store, block } = ctx;
    const timestamp = BigInt(block.timestamp);

    let { propPath, liquidityChanges } = await getSwapParams(ctx);

    const swaps = [];

    for (let i = 1; i < propPath.length; i++) {
        const fromCurrency = propPath[i - 1];
        const toCurrency = propPath[i];

        if (fromCurrency.__kind !== "Token" || toCurrency.__kind !== "Token") continue

        const fromAmount = liquidityChanges[i - 1];
        const toAmount = liquidityChanges[i];

        await createCurrency(store, fromCurrency);

        if (i + 1 === propPath.length) {
            await createCurrency(store, toCurrency);
        }

        if (i + 1 !== propPath.length) {
            swaps.push({
                step: i + 1,
                from: { token: fromCurrency, amount: fromAmount },
                to: { token: toCurrency, amount: toAmount }
            })
        }
    }

    for (const swap of swaps) {
        const { from, to, step } = swap;

        await createSwap(ctx, swap, step);

        await createCurrPrice(store, from.token.value.__kind, timestamp);
        await createCurrPrice(store, to.token.value.__kind, timestamp);

        await createCurrVolumeDay(store, from.token.value.__kind, timestamp);
        await createCurrVolumeDay(store, to.token.value.__kind, timestamp);

        const [currencyZero, currencyOne] = getTraidingPair(from.token, to.token)
        const balanceZero = currencyZero === from.token ? from.amount : -to.amount
        const balanceOne = currencyOne === to.token ? from.amount : -to.amount

        const pool = await createPool(store, [currencyZero, currencyOne]);
        await addPoolVolume(store, pool, balanceZero, timestamp);
        await addPoolLiquidity(store, pool, [balanceZero, balanceOne], timestamp);

        await addLiquidityChange(
            ctx,
            LiquidityChangeReason.SWAP,
            pool,
            currencyZero,
            currencyOne,
            balanceZero,
            balanceOne,
            step
        )
    }
}

function getTraidingPair(currencyA: CurrencyId_Token, currencyB: CurrencyId_Token): [CurrencyId_Token, CurrencyId_Token] {
    let order: Record<string, number> = primitivesConfig.types.TokenSymbol._enum
    return [currencyA, currencyB].sort((a, b) => {
        return order[a.value.__kind] - order[b.value.__kind]
    }) as [CurrencyId_Token, CurrencyId_Token]
}



