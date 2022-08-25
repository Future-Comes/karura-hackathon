import {Store} from "@subsquid/substrate-processor";
import {Currency, Pool, PoolLiquidity, PoolVolumeDay} from "../model";
import {getDailyNativeVolume, getPriceInUSD, makeId} from "../mappings/utility";

export async function createPool(store: Store, currencyZero: Currency, currencyOne: Currency): Promise<Pool> {
    const pool = await store
        .getRepository(Pool)
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.currencyZero', 'currencyZero')
        .leftJoinAndSelect('p.currencyOne', "currencyOne")
        .where(`p.currencyZero = '${currencyZero.id}'`)
        .andWhere(`p.currencyOne = '${currencyOne.id}'`)
        .getOne()

    if (pool) {
        return pool
    }

    const id = currencyZero.symbol + '-' + currencyOne.symbol

    return store.save(new Pool({ id, currencyZero, currencyOne }))
}

export async function updatePoolVolumeForDay(store: Store, pool: Pool, timestamp: number): Promise<void> {
    const { currencyZero, currencyOne } = pool;

    const zeroVolumeDayNative = await getDailyNativeVolume(store, currencyZero, currencyOne, timestamp)
    const zeroVolumeDayUSD = await getPriceInUSD(store, currencyZero, zeroVolumeDayNative, timestamp)

    const oneVolumeDayNative = await getDailyNativeVolume(store, currencyOne, currencyZero, timestamp)
    const oneVolumeDayUSD = await getPriceInUSD(store, currencyOne, oneVolumeDayNative, timestamp)

    const volumeDayUSD = zeroVolumeDayUSD + oneVolumeDayUSD

    const poolVolumeDay = await store.get(PoolVolumeDay, { where: { pool, timestamp } });

    if (poolVolumeDay) {
        await store.update(PoolVolumeDay, { pool, timestamp }, { volumeDayUSD })
    } else {
        const id = makeId('volume' + pool.id + timestamp);
        await store.save(new PoolVolumeDay({ id, pool, volumeDayUSD, timestamp }))
    }
}

export async function addPoolLiquidity(
    store: Store,
    pool: Pool,
    balanceZero: bigint,
    balanceOne: bigint,
    timestamp: number,
): Promise<void> {
    const id = makeId(pool.id + timestamp)
    const usdPriceZero = await getPriceInUSD(store, pool.currencyZero, balanceZero, timestamp);
    const usdPriceOne = await getPriceInUSD(store, pool.currencyOne, balanceOne, timestamp);
    const usdTotalLiquidity = usdPriceZero + usdPriceOne;

    await store.save(new PoolLiquidity({ id, pool, usdPriceZero, usdPriceOne, usdTotalLiquidity, timestamp }))
}