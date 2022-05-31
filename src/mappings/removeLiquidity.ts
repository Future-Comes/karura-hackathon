import {EventHandlerContext} from "@subsquid/substrate-processor"
import {DexRemoveLiquidityEvent} from "../types/events"
import {LiquidityChangeReason} from "../model"
import {addLiquidityChange} from "./utility" 
import {CurrencyId} from "../types/v2041"
import {addPoolLiquidity, addPoolVolume, createPool} from "../utils/pools";
import {createCurrency} from "../utils/currency";

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
    
    const {who,currency0,pool0,currency1,pool1,shareDecrement} = event.asV2041
    const cur0 = currency0 as CurrencyId
    const cur1 = currency1 as CurrencyId

    return {who,cur0,pool0,cur1,pool1,shareDecrement}
}
    

export async function handleRemoveLiquidity(ctx : EventHandlerContext): Promise<void> {
    const {store, block} = ctx

    const timestamp = BigInt(block.timestamp);

    const { cur0, pool0, cur1, pool1 } = await getRemoveLiquidityParams(ctx)

    if (cur0.__kind !== "Token" || cur1.__kind !== "Token") return

    await createCurrency(store, cur0);
    await createCurrency(store, cur1);

    const pool = await createPool(store, [cur0, cur1]);
    await addPoolVolume(store, pool, -pool0, timestamp);
    await addPoolLiquidity(store, pool, [-pool0, -pool1], timestamp);

    await addLiquidityChange(
        ctx,
        LiquidityChangeReason.REMOVE,
        pool,
        cur0,
        cur1,
        -pool0,
        -pool1
    )
}