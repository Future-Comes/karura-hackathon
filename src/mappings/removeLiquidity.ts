import {EventHandlerContext} from "@subsquid/substrate-processor"
import {DexRemoveLiquidityEvent} from "../types/events"
import {LiquidityChangeReason} from "../model"
import {CurrencyId} from "../types/v2041"
import {addPoolVolume, createPool} from "../utils/pools";
import {createCurrency, getTokenName} from "../utils/currency";
import {addLiquidityChange} from "../utils/liquidity";
import {formatDate} from "./utility";
import dayjs from "dayjs";

interface RemoveLiquidityParams {
    who: Uint8Array,
    cur0 : CurrencyId ,
    pool0: bigint,
    cur1: CurrencyId,
    pool1: bigint,
    shareDecrement: bigint
  }

async function getRemoveLiquidityParams(ctx: EventHandlerContext): Promise<RemoveLiquidityParams> {
    const event = new DexRemoveLiquidityEvent(ctx)

    if (event.isV1000) {
        const [who,currency0,pool0,currency1,pool1,shareDecrement] = event.asV1000
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV1008) {
        const [who,currency0,pool0,currency1,pool1,shareDecrement] = event.asV1008
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV1009) {
        const [who,currency0,pool0,currency1,pool1,shareDecrement] = event.asV1009
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV1019) {
        const [who,currency0,pool0,currency1,pool1,shareDecrement] = event.asV1019
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV2001) {
        const [who,currency0,pool0,currency1,pool1,shareDecrement] = event.asV2001
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV2010) {
        const [who,currency0,pool0,currency1,pool1,shareDecrement] = event.asV2010
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV2011) {
        const [who,currency0,pool0,currency1,pool1,shareDecrement] = event.asV2011
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV2012) {
        const {who,currency0,pool0,currency1,pool1,shareDecrement} = event.asV2012
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV2022) {
        const {who,currency0,pool0,currency1,pool1,shareDecrement} = event.asV2022
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    if (event.isV2041) {
        const {who,currency0,pool0,currency1,pool1,shareDecrement} = event.asV2041
        const cur0 = currency0 as CurrencyId
        const cur1 = currency1 as CurrencyId
        return {who,cur0,pool0,cur1,pool1,shareDecrement}
    }
    
    const {who,currency0,pool0,currency1,pool1,shareDecrement} = event.asV2080
    const cur0 = currency0 as CurrencyId
    const cur1 = currency1 as CurrencyId

    return {who,cur0,pool0,cur1,pool1,shareDecrement}
}
    

export async function handleRemoveLiquidity(ctx : EventHandlerContext): Promise<void> {
    const {store, block} = ctx

    const timestamp = BigInt(block.timestamp);
    const dateNow = formatDate(dayjs(Number(timestamp)));

    const { cur0, pool0, cur1, pool1 } = await getRemoveLiquidityParams(ctx)

    const currencyZeroName = getTokenName(cur0);
    const currencyOneName = getTokenName(cur1);

    if (!currencyZeroName || !currencyOneName) return

    const currencyZero = await createCurrency(store, currencyZeroName);
    const currencyOne = await createCurrency(store, currencyOneName);

    const pool = await createPool(store, currencyZero, currencyOne);
    await addPoolVolume(store, pool, dateNow);

    await addLiquidityChange(
        ctx,
        LiquidityChangeReason.REMOVE,
        pool,
        currencyZero,
        currencyOne,
        -pool0,
        -pool1
    )
}