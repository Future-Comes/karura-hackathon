import {Store} from "@subsquid/substrate-processor";
import {CoinGecko, Currency, CurrLiquidity, CurrPrice, CurrVolumeDay} from "../model";
import {
    getDailyNativeVolume,
    getPriceInUSD,
    makeId,
} from "../mappings/utility";
import {CurrencyId} from "../types/v2041";
import dayjs from "dayjs";
import axios from "axios";
import {timeout} from "./base";

export interface CurrencyCoinGecko {
    id: string,
    symbol: string,
    name: string,
    image?: {
        thumb: string,
        small: string,
        large: string
    }
}

interface SearchCoinGeckoData {
    coins: CurrencyCoinGecko[]
}

const DECIMALS: {[key: string]: number} = {
    KUSD: 12,
    KAR: 12,
    LKSM: 12,
    KSM: 12,
    PHA: 12,
    KINT: 12,
    KBTC: 8,
    BNC: 12,
}

export function getTokenName(currency: CurrencyId): string | null {
    const type = currency.__kind;

    if (type === 'Token') {
        return currency.value.__kind
    }

    return null;
}

export const getCurrencyId = (currency: Currency): CurrencyId => {
    const currencyId = {
        __kind: 'Token',
        value: { __kind: currency.symbol }
    }

    return currencyId as CurrencyId;
}

export async function getCurrency(store: Store, symbol: string): Promise<Currency | null> {
    const currency = await store
        .getRepository(Currency)
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.coinGecko', 'coinGecko')
        .where(`c.symbol = '${symbol}'`)
        .getOne();
    
    return currency || null;
}

export async function createCurrency(store: Store, symbol: string): Promise<Currency> {
    const currency = await getCurrency(store, symbol);

    if (currency) {
        return currency;
    }

    const coinGecko = await getCurrFromCoinGecko(store, symbol)

    return store.save(new Currency({ id: symbol, symbol, coinGecko, decimal: DECIMALS[symbol] }))
}

const getCurrFromCoinGecko = async (store: Store, symbol: string) => {
    const coin = await store.get(CoinGecko, { where: { symbol } })

    if (coin) {
        return coin;
    }

    const dataCoinGecko = symbol === 'KUSD'
        ? { id: 'tether', name: 'Karura USD', symbol }
        : await searchCoinGeckoBySymbol(symbol)

    if (dataCoinGecko) {
        return store.save(new CoinGecko(dataCoinGecko))
    }

    return null;
}

export async function createDailyPrice(store: Store, currency: Currency, timestamp: number): Promise<void> {
    const id = makeId(currency.id + timestamp)
    const usdPrice = await getCurrUsdPrice(store, currency, timestamp)

    await store.save(new CurrPrice({ id, currency, usdPrice, timestamp }))
}

export async function updateCurrVolumeForDay(store: Store, currency: Currency, timestamp: number): Promise<void> {
    const volumeDayNative = await getDailyNativeVolume(store, currency, null, timestamp);
    const volumeDayUSD = await getPriceInUSD(store, currency, volumeDayNative, timestamp);

    const currVolumeDay = await store.get(CurrVolumeDay, { where: { currency, timestamp } });

    if (currVolumeDay) {
        await store.update(CurrVolumeDay, { currency, timestamp }, { volumeDayNative, volumeDayUSD })
    } else {
        const id = makeId(currency.id + timestamp);
        await store.save(new CurrVolumeDay({ id, currency, volumeDayNative, volumeDayUSD, timestamp }))
    }
}

export async function updateCurrLiquidityForDay(
    store: Store,
    currency: Currency,
    liquidity: bigint,
    timestamp: number
): Promise<void> {
    const id = makeId(currency.id + timestamp);
    const liquidityUSD = await getPriceInUSD(store, currency, liquidity, timestamp);

    await store.save(new CurrLiquidity({ id, currency, liquidity, liquidityUSD, timestamp }))
}

export const getCurrUsdPrice = async (store: Store, currency: Currency, timestamp: number): Promise<number> => {
    const { id, symbol, coinGecko } = currency

    // StableCoin Karura USD
    if (symbol === 'KUSD') {
        return 1
    }

    // CoinGecko
    if (coinGecko && coinGecko.id) {
        const coinGeckoData = await store.getRepository(CoinGecko)
          .createQueryBuilder('cg')
          .where(`cg.id = '${coinGecko.id}'`)
          .andWhere(`cg.updated_at = ${timestamp}`)
          .getOne();

        if (coinGeckoData && coinGeckoData.price) {
            return coinGeckoData.price;
        }

        if (!coinGeckoData) {
            const isToday = timestamp === dayjs().startOf('day').unix()
            const price = await getPriceFromCoinGecko(coinGecko.id, timestamp)

            while (isToday && !price) {
                // TODO there is no data on price in CoinGecko at night
                await timeout(10 * 60 * 1000)
            }

            await store.update(CoinGecko, { id: coinGecko.id }, { updatedAt: timestamp, price })

            if (price) {
                return price;
            }
        }
    }

    const currPrice = await store
      .getRepository(CurrPrice)
      .createQueryBuilder('cp')
      .where(`cp.currency_id = '${id}'`)
      .orderBy('timestamp', 'DESC')
      .getOne();

    if (currPrice && currPrice.usdPrice) {
        return currPrice.usdPrice;
    }

    return 0;
}

const getPriceFromCoinGecko = async (id: string, timestamp: number): Promise<number | undefined> => {
    const date = dayjs.unix(timestamp).format('DD-MM-YYYY')
    const url = `https://api.coingecko.com/api/v3/coins/${id}/history?date=${date}`
    const { data } = await axios.get(url)

    return data.market_data?.current_price?.usd
}

export const searchCoinGeckoBySymbol = async (symbol: string): Promise<CurrencyCoinGecko | null> => {
    const { data }: { data: SearchCoinGeckoData } =
      await axios.get(`https://api.coingecko.com/api/v3/search?query=${symbol}`);

    if (!data.coins || data.coins.length === 0) {
        return null;
    }

    return data.coins.find((item) => item.symbol === symbol) || null;
}