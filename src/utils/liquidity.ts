import {StorageContext} from "../types/support";
import {CurrencyId} from "../types/v2041";
import {DexLiquidityPoolStorage} from "../types/storage";
import * as v1000 from "../types/v1000";
import * as v1008 from "../types/v1008";
import * as v1009 from "../types/v1009";
import * as v1019 from "../types/v1019";
import * as v2001 from "../types/v2001";
import * as v2011 from "../types/v2011";
import * as v2022 from "../types/v2022";
import * as v2041 from "../types/v2041";
import * as v2080 from "../types/v2080";
import {EventHandlerContext, Store} from "@subsquid/substrate-processor";
import {Currency, LiquidityChange, LiquidityChangeReason, Pool} from "../model";
import {updateCurrLiquidityForDay, getCurrencyId} from "./currency";
import assert from "assert";
import {getPriceInUSD, makeId} from "../mappings/utility";
import {addPoolLiquidity} from "./pools";
import dayjs from "dayjs";

export async function getLiquidityPool(ctx : StorageContext, key:[CurrencyId,CurrencyId]): Promise<[bigint, bigint]>{
    const storage = new DexLiquidityPoolStorage(ctx)

    if (storage.isV1000) {
        return storage.getAsV1000(key as [v1000.CurrencyId, v1000.CurrencyId])
    }
    if (storage.isV1008) {
        return storage.getAsV1008(key as [v1008.CurrencyId, v1008.CurrencyId])
    }
    if (storage.isV1009) {
        return storage.getAsV1009(key as [v1009.CurrencyId, v1009.CurrencyId])
    }
    if (storage.isV1019) {
        return storage.getAsV1019(key as [v1019.CurrencyId, v1019.CurrencyId])
    }
    if (storage.isV2001) {
        return storage.getAsV2001(key as [v2001.CurrencyId, v2001.CurrencyId])
    }
    if (storage.isV2010) {
        return storage.getAsV2010(key as [v2001.CurrencyId, v2001.CurrencyId])
    }
    if (storage.isV2011) {
        return storage.getAsV2011(key as [v2011.CurrencyId, v2011.CurrencyId])
    }
    if (storage.isV2022) {
        return storage.getAsV2022(key as [v2022.CurrencyId, v2022.CurrencyId])
    }
    if (storage.isV2041) {
        return storage.getAsV2041(key as [v2041.CurrencyId, v2041.CurrencyId])
    }

    return storage.getAsV2080(key as [v2080.CurrencyId, v2080.CurrencyId])
}

export async function addLiquidityChange(
    ctx : EventHandlerContext,
    reason: LiquidityChangeReason,
    pool: Pool,
    currencyZero: Currency,
    currencyOne: Currency,
    amountZero: bigint = 0n,
    amountOne: bigint = 0n,
    swapStep?: number
): Promise<void> {
    const {store, event, block} = ctx
    const timestamp = dayjs(block.timestamp).startOf('day').unix()
    const account = event.extrinsic?.signer
    const hash = event.extrinsic?.hash
    const eventId = `${event.blockNumber}-${event.indexInBlock}`

    const id = makeId('initial--' + currencyZero.symbol + currencyOne.symbol)
    const initial = await store.get(LiquidityChange, { where: { id } })

    if (!initial) {
        const cur0 = getCurrencyId(currencyZero);
        const cur1 = getCurrencyId(currencyOne);
        const [balanceZero, balanceOne] = await getLiquidityPool(ctx,[cur0, cur1]);

        await updateCurrLiquidityForDay(store, currencyZero, balanceZero, timestamp);
        await updateCurrLiquidityForDay(store, currencyOne, balanceOne, timestamp);
        await addPoolLiquidity(store, pool, balanceZero, balanceOne, timestamp);

        await store.save(new LiquidityChange({
            id,
            pool,
            currencyZero,
            currencyOne,
            amountZero: 0n,
            amountOne: 0n,
            totalLiquidityZero: balanceZero,
            totalLiquidityOne: balanceOne,
            step: 0,
            changeReason: LiquidityChangeReason.INIT,
            timestamp: BigInt(block.timestamp),
            blockNumber: block.height - 1,
            eventIdx: -1,
            eventId,
            hash,
            account,
            totalValue: 0
        }));
    }

    const balance = await getPrevBalance(store, currencyZero, currencyOne)
    const balanceZero = balance[0] + amountZero;
    const balanceOne = balance[1] + amountOne;

    await updateCurrLiquidityForDay(store, currencyZero, balanceZero, timestamp);
    await updateCurrLiquidityForDay(store, currencyOne, balanceOne, timestamp);
    await addPoolLiquidity(store, pool, balanceZero, balanceOne, timestamp);

    const priceZero = await getPriceInUSD(store, currencyZero, amountZero, timestamp);
    const priceOne = await getPriceInUSD(store, currencyZero, amountOne, timestamp);
    const totalValue = priceZero + priceOne || 0;

    await store.save(new LiquidityChange({
        id: makeId(swapStep ? event.id + '-' + swapStep : event.id),
        pool,
        currencyZero,
        currencyOne,
        amountZero,
        amountOne,
        totalLiquidityZero: balanceZero,
        totalLiquidityOne: balanceOne,
        step: swapStep || 0,
        changeReason: LiquidityChangeReason.SWAP,
        timestamp: BigInt(block.timestamp),
        blockNumber: block.height,
        eventIdx: event.indexInBlock,
        eventId,
        hash,
        account,
        totalValue
    }))
}


async function getPrevBalance(store: Store, currencyZero: Currency, currencyOne: Currency): Promise<[bigint, bigint]> {
    const rows = await store.find(LiquidityChange, {
        select: ['totalLiquidityZero', 'totalLiquidityOne'],
        where: { currencyZero, currencyOne },
        order: { blockNumber: 'DESC', eventIdx: 'DESC', step: 'DESC' },
        take: 1
    })
    assert(rows.length == 1)
    return [rows[0].totalLiquidityZero, rows[0].totalLiquidityOne]
}