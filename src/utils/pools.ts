import {Store} from "@subsquid/substrate-processor";
import {CurrencyId_Token} from "../types/v2041";
import { Pool, PoolLiquidity, PoolVolumeDay } from "../model";
import {get, getUsdPrice} from "../mappings/utility";
import {getCurrencyByName} from "./currency";

type Currencies = [CurrencyId_Token, CurrencyId_Token];

export async function createPool(store: Store, currencies: Currencies): Promise<Pool> {
    const currencyZero = currencies[0].value.__kind;
    const currencyOne = currencies[1].value.__kind;
    const id = currencyZero + '-' + currencyOne;

    let pool = await get(store, Pool, id)

    if (!pool) {
        const props = { id, currencyZero, currencyOne };

        pool = await store.save(new Pool(props))
    }

    return pool;
}

async function getPoolVolume(store: Store, currencyName: string, amount: bigint, timestamp: bigint) {
    const currency = await getCurrencyByName(store, currencyName);

    if (!currency) {
        return 0;
    }

    const usdPrice = await getUsdPrice(store, currency, timestamp);

    return Math.trunc(Math.abs(Number(amount)) * usdPrice);
}

export async function addPoolVolume(
    store: Store,
    pool: Pool,
    amount: bigint,
    timestamp: bigint
): Promise<void> {
    const id = pool.id + '-' + timestamp;
    const volumeDayUSD = await getPoolVolume(store, pool.currencyZero, amount, timestamp);

    const props = { id, pool, volumeDayUSD, timestamp };

    await store.save(new PoolVolumeDay(props))
}

export async function addPoolLiquidity(
    store: Store,
    pool: Pool,
    amounts: [bigint, bigint],
    timestamp: bigint
): Promise<void> {
    const id = pool.id + '-' + timestamp;
    const volumeDayUSDZero = await getPoolVolume(store, pool.currencyZero, amounts[0], timestamp);
    const volumeDayUSDOne = await getPoolVolume(store, pool.currencyOne, amounts[1], timestamp);
    const usdTotalLiquidity = Math.trunc(volumeDayUSDZero + volumeDayUSDOne);

    const props = { id, pool, usdTotalLiquidity, timestamp };

    await store.save(new PoolLiquidity(props))
}