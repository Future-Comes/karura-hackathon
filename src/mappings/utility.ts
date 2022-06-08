import {Store} from "@subsquid/substrate-processor"
import CoinGecko from 'coingecko-api'
import dayjs from 'dayjs'
import {CurrencyId} from "../types/v2041"
import {Currency, CurrPrice, Swap} from "../model"

interface CurrencyCoinGecko {
    id: string,
    symbol: string,
    name: string
}

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

export const getCurrencyId = (currency: Currency): CurrencyId => {
    const currencyId = {
        __kind: 'Token',
        value: { __kind: currency.currencyName }
    }

    return currencyId as CurrencyId;
}

export const getUsdPrice = async (store: Store, currency: Currency, timestamp: bigint): Promise<number> => {
    const { id, currencyName, coinGeckoID } = currency;

    if (coinGeckoID) {
        const CoinGeckoClient = new CoinGecko();
        const date = dayjs(Number(timestamp)).format('DD-MM-YYYY');

        const price = await CoinGeckoClient.coins.fetchHistory(coinGeckoID, { date })
            .then(({ data }) => data.market_data?.current_price?.usd || null)
            .catch(() => null);

        if (price) {
            return price;
        }
    }

    if (currencyName === 'KUSD') {
        return 1
    }

    const swaps = await store
        .getRepository(Swap)
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.fromCurrency', 'fromCurrency')
        .leftJoinAndSelect('s.toCurrency', "toCurrency")
        .where((qb) => {
            qb
                .where('s.fromCurrency = :currencyId AND s.toCurrency = :kusdId')
                .orWhere('s.fromCurrency = :kusdId AND s.toCurrency = :currencyId')
        }, { currencyId: id, kusdId: 'token-KUSD' })
        .andWhere(
            's.timestamp >= :timestamp',
            { timestamp: Number(timestamp) - (1000 * 60 * 60 * 24) }
        )
        .getMany()

    if (!swaps) {
        const currPrice = await store
            .getRepository(CurrPrice)
            .createQueryBuilder('cp')
            .where('cp.currency_id = :id', { id })
            .orderBy('timestamp', 'DESC')
            .getOne();

        return currPrice?.usdPrice || 0;
    }

    const amounts: number[] = [];

    for (const swap of swaps) {
        const ratio = swap.fromCurrency.currencyName === 'KUSD'
            ? Number(swap.fromAmount) / Number(swap.toAmount)
            : Number(swap.toAmount) / Number(swap.fromAmount)

        amounts.push(ratio);
    }

    if (amounts && amounts.length > 0) {
        return amounts.reduce((a, b) => a + b) / amounts.length;
    }

    return 0;
}

export const getVolumeDay = async (store: Store, currency: Currency, timestamp: bigint): Promise<bigint> => {
    const { sum } = await store
        .getRepository(Swap)
        .createQueryBuilder('s')
        .select('SUM(s.fromAmount)', "sum")
        .where(
            's.fromCurrency = :currencyId OR s.toCurrency = :currencyId',
            { currencyId: currency.id }
        )
        .andWhere(
            's.timestamp >= :timestamp',
            { timestamp: Number(timestamp) - (1000 * 60 * 60 * 24) }
        )
        .getRawOne();

    return sum || BigInt(0);
}

export const getPriceUSD = async (
    store: Store,
    currency: Currency,
    tokens: bigint,
    timestamp: bigint
): Promise<number> => {
    const usdPrice = await getUsdPrice(store, currency, timestamp);

    if (usdPrice === 0) {
        return 0;
    }

    if (tokens < 0) {
        tokens = BigInt(tokens) * BigInt(-1);
    }

    const priceUsd = Number(tokens) / Math.pow(10, 12) * usdPrice;

    return Number(priceUsd);
}

export const getCoinGeckoId = async (currencyName: string): Promise<string | null> => {
    const CoinGeckoClient = new CoinGecko();
    // @ts-ignore
    const currencyCoinGecko = await CoinGeckoClient.coins.list().then((request: { data: CurrencyCoinGecko[] }) => {
        return request.data.find(({ symbol }) => symbol === currencyName.toLowerCase());
    }).catch(() => null);

    return currencyCoinGecko ? currencyCoinGecko.id : null;
}