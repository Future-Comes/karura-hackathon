import * as v2041 from "../types/v2041"
import {CurrencyId, CurrencyId_Token} from "../types/v2041"
import {DexLiquidityPoolStorage} from "../types/storage"
import {EventHandlerContext, Store} from "@subsquid/substrate-processor"
import assert from "assert"
import {Currency, LiquidityChange, LiquidityChangeReason, Pool} from "../model"
import * as v1000 from '../types/v1000'
import * as v1008 from '../types/v1008'
import * as v1009 from '../types/v1009'
import * as v1019 from '../types/v1019'
import * as v2001 from '../types/v2001'
import * as v2011 from '../types/v2011'
import * as v2022 from '../types/v2022'
import {StorageContext} from "../types/support";
import {createCurrLiquidity, getCurrencyByName} from "../utils/currency";


export type EntityConstructor<T> = {
    new (...args: any[]): T;
  };

export async function get<T extends { id: string }>(
    store: Store,
    EntityConstructor: EntityConstructor<T>,
    id: string
  ): Promise<T | undefined> {
    return store.get<T>(EntityConstructor, {
        where: {id},
    });
  }

async function getLiquidityPool(ctx : StorageContext, key:[CurrencyId,CurrencyId]): Promise<[bigint, bigint]>{
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

    return storage.getAsV2041(key as [v2041.CurrencyId, v2041.CurrencyId])
}

export async function addLiquidityChange(
    ctx : EventHandlerContext,
    reason: LiquidityChangeReason,
    pool: Pool,
    currency0: CurrencyId_Token,
    currency1: CurrencyId_Token,
    amountZero: bigint = 0n,
    amountOne: bigint = 0n,
    swapStep?: number
): Promise<void> {
    const {store, event, block} = ctx
    const timestamp = BigInt(block.timestamp);

    const currencyZero = await getCurrencyByName(store, currency0.value.__kind);
    const currencyOne = await getCurrencyByName(store, currency1.value.__kind);

    const pair = currencyZero.currencyName + '-' + currencyOne.currencyName
    const initial = await get(store, LiquidityChange, 'initial--' + pair);

    if (!initial) {
        const [balanceZero, balanceOne] = await getLiquidityPool(ctx,[currency0, currency1]);

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
            timestamp: BigInt(block.timestamp - 1)
        }));

        await createCurrLiquidity(store, currencyZero, timestamp, 0n, balanceZero);
        await createCurrLiquidity(store, currencyOne, timestamp, 0n, balanceZero);
    }

    const balance = await getPrevBalance(store, currencyZero, currencyOne)
    const balanceZero = balance[0] + amountZero;
    const balanceOne = balance[1] + amountOne;

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
        timestamp
    })

    await store.save(change)
    await createCurrLiquidity(store, currencyZero, timestamp, amountZero, balanceZero);
    await createCurrLiquidity(store, currencyOne, timestamp, amountOne, balanceOne);
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

export const average = (arr: number[]) => {
    if (arr.length > 0) {
        return arr.reduce((a, b) => a + b) / arr.length;
    }

    return 0;
};

export const getUsdPrice = async (store: Store, currency: Currency, timestamp: bigint): Promise<number> => {
    const { id, currencyName } = currency;

    if (currencyName === 'KUSD') {
        return 1
    }

    const swaps = await store.query(`
            SELECT to_amount, from_amount
            FROM swap s
            WHERE (
                s.from_currency = '${currencyName}'
                AND s.to_currency = 'KUSD'
                AND s."timestamp" >= ${Number(timestamp) - (1000 * 60 * 60 * 24)}
            )
        `);

    if (!swaps) {
        const curr_price = await store.query(`
            SELECT usd_price
            FROM curr_price cp
            WHERE (cp.currency_id = '${id}')
            ORDER BY "timestamp" DESC
        `);

        return curr_price[0].usd_price;
    }

    const amounts = [];

    for (const {to_amount, from_amount} of swaps) {
        amounts.push(to_amount / from_amount);
    }

    return average(amounts);
}

export const getVolumeDay = async (store: Store, currency: string, timestamp: bigint): Promise<bigint> => {
    const query = await store.query(`
            SELECT  SUM(from_amount)
            FROM swap s
            WHERE (
                s.from_currency = '${currency}'
                AND s."timestamp" >= ${Number(timestamp) - (1000 * 60 * 60 * 24)}
            )
        `);

    return query[0].sum;
}

export const getVolumeDayUSD = async (store: Store, currencyName: string, timestamp: bigint): Promise<number> => {
    const currency = await getCurrencyByName(store, currencyName);

    if (!currency) {
        return 0;
    }

    const volumeDayNative = await getVolumeDay(store, currencyName, timestamp);
    const volumeDayUSD = await getPrice(store, currency, timestamp, volumeDayNative);

    return Math.trunc(Number(volumeDayUSD));
}

export const getPrice = async (store: Store, currency: Currency, timestamp: bigint, tokens: bigint) => {
    const usdPrice = await getUsdPrice(store, currency, timestamp);

    if (usdPrice === 0) {
        return 0;
    }

    return Number(tokens) * usdPrice;
}