import dayjs, {Dayjs} from 'dayjs'
import axios from 'axios'
import {Store} from "@subsquid/substrate-processor"
import {CurrencyId} from "../types/v2041"
import {CoinGecko, Currency, CurrPrice, Swap} from "../model"

interface CurrencyCoinGecko {
    id: string,
    symbol: string,
    name: string,
    image: {
        thumb: string,
        small: string,
        large: string
    }
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
    const { id, currencyName, coinGecko } = currency;

    // StableCoin Karura USD
    if (currencyName === 'KUSD') {
        return 1
    }

    const swaps = await store
        .getRepository(Swap)
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.fromCurrency', 'fromCurrency')
        .leftJoinAndSelect('s.toCurrency', 'toCurrency')
        .where((qb) => {
            qb
                .where('s.fromCurrency = :currencyId AND s.toCurrency = :kusdId')
                .orWhere('s.fromCurrency = :kusdId AND s.toCurrency = :currencyId')
        }, { currencyId: id, kusdId: 'KUSD' })
        .andWhere(
            's.timestamp >= :timestamp_qte AND s.timestamp <= :timestamp_lte',
            { timestamp_qte: Number(timestamp) - (1000 * 60 * 60 * 24), timestamp_lte: Number(timestamp) }
        )
        .getMany()

    const amounts: number[] = [];

    if (swaps && swaps.length > 0) {
        for (const swap of swaps) {
            const ratio = swap.fromCurrency.currencyName === 'KUSD'
                ? Number(swap.fromAmount) / Number(swap.toAmount)
                : Number(swap.toAmount) / Number(swap.fromAmount)

            amounts.push(ratio);
        }

        if (amounts && amounts.length > 0) {
            return amounts.reduce((a, b) => a + b) / amounts.length;
        }
    }

    // Search for a price in a service "CoinGecko"
    if (coinGecko?.id && coinGecko?.updatedAt) {
        const dateOne = dayjs(Number(coinGecko.updatedAt));
        const dateTwo = dayjs(Number(timestamp));

        if (formatDate(dateOne).diff(formatDate(dateTwo)) !== 0) {
            const date = dayjs(Number(timestamp)).format('DD-MM-YYYY');

            try {
                const url = `https://api.coingecko.com/api/v3/coins/${coinGecko.id}/history?date=${date}`;
                const { data } = await axios.get(url);

                const price = data.market_data?.current_price?.usd;

                await store.update(
                    CoinGecko,
                        { id: coinGecko.id },
                    { updatedAt: formatDate(dateOne).unix(), price }
                )

                if (price) {
                    return price;
                }
            } catch (e) {
                console.log(e)
            }
        }

        if (coinGecko.price) {
            return coinGecko.price;
        }
    }

    // Finding the last recorded price of a token
    const currPrice = await store
        .getRepository(CurrPrice)
        .createQueryBuilder('cp')
        .where('cp.currency_id = :id', { id })
        .orderBy('timestamp', 'DESC')
        .getOne();

    if (currPrice && currPrice.usdPrice) {
        return currPrice.usdPrice;
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

export const getCoinGecko = async (currencyName: string): Promise<CurrencyCoinGecko> => {
    const { data }: { data: CurrencyCoinGecko[] } = await axios.get('https://api.coingecko.com/api/v3/coins/list');

    return data.find((item) => item?.symbol === currencyName.toLowerCase())!;
}

export const formatDate = (date: Dayjs): Dayjs  => {
    return date.hour(0).minute(0).second(0).millisecond(0);
}