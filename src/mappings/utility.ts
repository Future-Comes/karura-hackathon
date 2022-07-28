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

interface SearchCoinGeckoData {
    coins: CurrencyCoinGecko[]
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

    if (swaps && swaps.length > 0) {
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
    }

    // Search for a price in a service "CoinGecko"
    if (coinGecko) {
        const isExistUpdate = !!coinGecko?.updatedAt
        const dateUpdate = isExistUpdate ? formatDate(dayjs(Number(coinGecko?.updatedAt))) : null;
        const dateNow = formatDate(dayjs(Number(timestamp)));
        const isDiff = dateUpdate ? dateUpdate.diff(dateNow) : 0;
        const isUpdate = isExistUpdate ? isDiff !== 0 : true;

        if (isUpdate) {
            const date = dayjs(Number(timestamp)).format('DD-MM-YYYY');

            try {
                const url = `https://api.coingecko.com/api/v3/coins/${coinGecko.id}/history?date=${date}`;
                const { data } = await axios.get(url);

                const price = data.market_data?.current_price?.usd;

                await store.update(
                    CoinGecko,
                    { id: coinGecko.id },
                    { updatedAt: timestamp, price }
                )

                if (price) {
                    return price;
                }
            } catch (e) {
                console.log(e)
            }
        }
    }

    // Finding the last recorded price of a token
    const currPrice = await store
        .getRepository(CurrPrice)
        .createQueryBuilder('cp')
        .where('cp.currency_id = :id', { id })
        .andWhere(
            'cp.timestamp >= :timestamp_qte AND cp.timestamp <= :timestamp_lte',
            { timestamp_qte: Number(timestamp) - (1000 * 60 * 60 * 24), timestamp_lte: Number(timestamp) }
        )
        .orderBy('timestamp', 'ASC')
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
    tokens: bigint
): Promise<number> => {
    const coinGecko = await store.get(CoinGecko, { where: { id: currency.coinGecko?.id } })
    const price = coinGecko && coinGecko.price ? coinGecko.price : 0;

    if (price === 0) {
        return 0;
    }

    if (tokens < 0) {
        tokens = BigInt(tokens) * BigInt(-1);
    }

    const priceUsd = Number(tokens) / Math.pow(10, 12) * price;

    return Number(priceUsd);
}

export const getCoinGecko = async (currencyName: string): Promise<CurrencyCoinGecko> => {
    const { data }: { data: CurrencyCoinGecko[] } = await axios.get('https://api.coingecko.com/api/v3/coins/list');

    return data.find((item) => item?.symbol === currencyName.toLowerCase())!;
}

export const searchCoinGeckoBySymbol = async (symbol: string): Promise<CurrencyCoinGecko | null> => {
    const { data }: { data: SearchCoinGeckoData } =
        await axios.get(`https://api.coingecko.com/api/v3/search?query=${symbol}`);

    if (!data.coins || data.coins.length === 0) {
        return null;
    }

    return data.coins.find((item) => item.symbol === symbol) || null;
}

export const formatDate = (date: Dayjs): Dayjs  => {
    return date.hour(0).minute(0).second(0).millisecond(0);
}