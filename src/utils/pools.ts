import {Store} from "@subsquid/substrate-processor";
import {Currency, Pool, PoolLiquidity, PoolVolumeDay, Swap} from "../model";
import {getPriceUSD} from "../mappings/utility";

export async function createPool(store: Store, currencyZero: Currency, currencyOne: Currency): Promise<Pool> {
    const id = currencyZero.currencyName + '-' + currencyOne.currencyName;

    let pool = await store
        .getRepository(Pool)
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.currencyZero', 'currencyZero')
        .leftJoinAndSelect('p.currencyOne', "currencyOne")
        .where('p.id = :id', { id })
        .getOne();

    if (!pool) {
        const props = { id, currencyZero, currencyOne };

        pool = await store.save(new Pool(props))
    }

    return pool;
}

export const getVolumeDay = async (
    store: Store,
    currencyZero: Currency,
    currencyOne: Currency,
    timestamp: bigint
): Promise<bigint> => {
    const query: Swap[] = await store
        .getRepository(Swap)
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.fromCurrency', 'fromCurrency')
        .leftJoinAndSelect('s.toCurrency', "toCurrency")
        .where((qb) => {
            qb
                .where('s.from_currency_id = :currencyZero AND s.to_currency_id = :currencyOne')
                .orWhere('s.from_currency_id = :currencyZero AND s.to_currency_id = :currencyOne')
        }, { currencyZero: currencyZero.id, currencyOne: currencyOne.id })
        .andWhere(
            's.timestamp >= :timestamp',
            { timestamp: Number(timestamp) - (1000 * 60 * 60 * 24) }
        )
        .getMany();

    if (query.length === 0) {
        return BigInt(0);
    }

    return query.reduce((acc, {fromCurrency, fromAmount, toAmount}) => {
        acc += currencyZero.currencyName === fromCurrency.currencyName ? fromAmount : toAmount;

        return acc;
    }, BigInt(0));
}

export async function addPoolVolume(
    store: Store,
    pool: Pool,
    timestamp: bigint
): Promise<void> {
    const { currencyZero, currencyOne } = pool;
    const id = pool.id + '-' + timestamp;

    const volumeDay = await getVolumeDay(store, currencyZero, currencyOne, timestamp);
    const volumeDayUSD = await getPriceUSD(store, currencyZero, volumeDay, timestamp);

    const props = { id, pool, volumeDayUSD, timestamp };

    await store.save(new PoolVolumeDay(props))
}

export async function addPoolLiquidity(
    store: Store,
    pool: Pool,
    balanceZero: bigint,
    balanceOne: bigint,
    timestamp: bigint
): Promise<void> {
    const id = pool.id + '-' + timestamp;
    const usdPriceZero = await getPriceUSD(store, pool.currencyZero, balanceZero, timestamp);
    const usdPriceOne = await getPriceUSD(store, pool.currencyOne, balanceOne, timestamp);
    const usdTotalLiquidity = usdPriceZero + usdPriceOne;

    const props = { id, pool, usdPriceZero, usdPriceOne, usdTotalLiquidity, timestamp };

    await store.save(new PoolLiquidity(props))
}