import {Store} from "@subsquid/substrate-processor";
import {Currency, Pool, PoolLiquidity, PoolVolumeDay, Swap} from "../model";
import {getPriceUSD} from "../mappings/utility";
import {Dayjs} from "dayjs";

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
    dateNow: Dayjs
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
        .andWhere('s.timestamp >= :timestamp', { timestamp: dateNow.unix() })
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
    dateNow: Dayjs
): Promise<void> {
    const { currencyZero, currencyOne } = pool;
    const timestamp = BigInt(dateNow.unix());
    const id = pool.id + '-' + timestamp;

    const volumeDay = await getVolumeDay(store, currencyZero, currencyOne, dateNow);
    const volumeDayUSD = await getPriceUSD(store, currencyZero, volumeDay, dateNow);

    const poolVolumeDay = await store.get(PoolVolumeDay, { where: { id, timestamp } });

    if (poolVolumeDay) {
        await store.update(
            PoolVolumeDay,
            { id, timestamp },
            { volumeDayUSD }
        )
    } else {
        await store.save(new PoolVolumeDay({
            id,
            pool,
            volumeDayUSD,
            timestamp,
        }))
    }
}

export async function addPoolLiquidity(
    store: Store,
    pool: Pool,
    balanceZero: bigint,
    balanceOne: bigint,
    dateNow: Dayjs,
): Promise<void> {
    const id = pool.id + '-' + dateNow.unix();
    const usdPriceZero = await getPriceUSD(store, pool.currencyZero, balanceZero, dateNow);
    const usdPriceOne = await getPriceUSD(store, pool.currencyOne, balanceOne, dateNow);
    const usdTotalLiquidity = usdPriceZero + usdPriceOne;

    const props = { id, pool, usdPriceZero, usdPriceOne, usdTotalLiquidity, timestamp: BigInt(dateNow.unix()) };

    await store.save(new PoolLiquidity(props))
}