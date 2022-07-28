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
import {createCurrLiquidity} from "./currency";
import assert from "assert";
import {get, getCurrencyId, getPriceUSD} from "../mappings/utility";
import {addPoolLiquidity} from "./pools";


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
    const timestamp = BigInt(block.timestamp);
    const account = event.extrinsic?.signer;
    const hash = event.extrinsic?.hash;
    const eventId = `${event.blockNumber}-${event.indexInBlock}`

    const priceZero = await getPriceUSD(store, currencyZero, amountZero);
    const priceOne = await getPriceUSD(store, currencyZero, amountOne);
    const totalValue = priceZero + priceOne || 0;

    const pair = currencyZero.currencyName + '-' + currencyOne.currencyName
    const initial = await get(store, LiquidityChange, 'initial--' + pair);

    if (!initial) {
        const cur0 = getCurrencyId(currencyZero);
        const cur1 = getCurrencyId(currencyOne);
        const [balanceZero, balanceOne] = await getLiquidityPool(ctx,[cur0, cur1]);

        await store.save(new LiquidityChange({
            id: 'initial--' + pair,
            blockNumber: block.height - 1,
            eventIdx: -1,
            step: 0,
            reason: LiquidityChangeReason.INIT,
            currencyZero,
            currencyOne,
            amountZero,
            amountOne,
            balanceZero,
            balanceOne,
            pool,
            account,
            totalValue,
            hash,
            eventId,
            timestamp: BigInt(block.timestamp - 1)
        }));

        await createCurrLiquidity(store, currencyZero, balanceZero, BigInt(block.timestamp - 1));
        await createCurrLiquidity(store, currencyOne, balanceOne, BigInt(block.timestamp - 1));
        await addPoolLiquidity(store, pool, balanceZero, balanceOne, BigInt(block.timestamp - 1));
    }

    const balance = await getPrevBalance(store, currencyZero, currencyOne)
    const balanceZero = balance[0] + amountZero;
    const balanceOne = balance[1] + amountOne;

    await createCurrLiquidity(store, currencyZero, balanceZero, timestamp);
    await createCurrLiquidity(store, currencyOne, balanceOne, timestamp);
    await addPoolLiquidity(store, pool, balanceZero, balanceOne, timestamp);

    let change = new LiquidityChange({
        id: swapStep ? event.id + '-' + swapStep : event.id,
        blockNumber: block.height,
        eventIdx: event.indexInBlock,
        step: swapStep || 0,
        reason,
        currencyZero,
        currencyOne,
        amountZero,
        amountOne,
        balanceZero,
        balanceOne,
        pool,
        account,
        totalValue,
        hash,
        eventId,
        timestamp
    })

    await store.save(change)
}


async function getPrevBalance(store: Store, currencyZero: Currency, currencyOne: Currency): Promise<[bigint, bigint]> {
    let rows = await store.find(LiquidityChange, {
        select: ['balanceZero', 'balanceOne'],
        where: {
            currencyZero,
            currencyOne,
        },
        order: {
            blockNumber: 'DESC',
            eventIdx: 'DESC',
            step: 'DESC'
        },
        take: 1
    })
    assert(rows.length == 1)
    return [rows[0].balanceZero, rows[0].balanceOne]
}