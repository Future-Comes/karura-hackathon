import {CurrencyId} from "../types/v2041"
import primitivesConfig from '@acala-network/type-definitions/primitives'
import {EventHandlerContext} from "@subsquid/substrate-processor"
import {DexSwapEvent} from "../types/events"
import {Currency, LiquidityChangeReason} from "../model"
import {addLiquidityChange} from "../utils/liquidity"
import {addPoolVolume, createPool} from "../utils/pools"
import {createCurrPrice, createCurrVolumeDay} from "../utils/currency";
import {createSwap, getSwaps} from "../utils/swap";
import {formatDate} from "./utility";
import dayjs from "dayjs";

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
    if (event.isV2041) {
        const {trader, path, liquidityChanges} = event.asV2041
        const propPath = path as CurrencyId[]
        return {trader, propPath, liquidityChanges}
    }

    const {trader, path, liquidityChanges} = event.asV2080
    const propPath = path as CurrencyId[]
    return {trader, propPath, liquidityChanges}
}

export async function handleSwap(ctx: EventHandlerContext): Promise<void> {
    const { store, block } = ctx;

    const timestamp = BigInt(block.timestamp);
    const dateNow = formatDate(dayjs(Number(timestamp)));

    const { propPath, liquidityChanges } = await getSwapParams(ctx);

    if (propPath.length === liquidityChanges.length) {
        const swaps = await getSwaps(store, propPath, liquidityChanges);

        for (const swap of swaps) {
            const { step, fromCurrency, fromAmount, toCurrency, toAmount } = swap;

            await createSwap(ctx, swap);

            await createCurrPrice(store, fromCurrency, dateNow);
            await createCurrPrice(store, toCurrency, dateNow);

            await createCurrVolumeDay(store, fromCurrency, dateNow);
            await createCurrVolumeDay(store, toCurrency, dateNow);

            const [currencyZero, currencyOne] = getTradingPair(fromCurrency, toCurrency)
            const balanceZero = currencyZero.currencyName === fromCurrency.currencyName ? fromAmount : -toAmount
            const balanceOne = currencyOne.currencyName === fromCurrency.currencyName ? fromAmount : -toAmount

            const pool = await createPool(store, currencyZero, currencyOne);
            await addPoolVolume(store, pool, dateNow);

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
}

function getTradingPair(currencyA: Currency, currencyB: Currency): [Currency, Currency] {
    let order: Record<string, number> = primitivesConfig.types.TokenSymbol._enum

    return [currencyA, currencyB].sort((a, b) =>
        order[a.currencyName] - order[b.currencyName]) as [Currency, Currency];
}



