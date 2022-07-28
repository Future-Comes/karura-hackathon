import {Store} from "@subsquid/substrate-processor";
import {CoinGecko, Currency, CurrLiquidity, CurrPrice, CurrVolumeDay} from "../model";
import {getPriceUSD, getUsdPrice, getVolumeDay, searchCoinGeckoBySymbol} from "../mappings/utility";
import {CurrencyId} from "../types/v2041";
import {set} from "lodash";

export function getTokenName(currency: CurrencyId): string | null {
    const type = currency.__kind;

    if (type === 'Token') {
        return currency.value.__kind
    }

    return null;
}

export async function getCurrency(store: Store, currencyName: string): Promise<Currency | null> {
    const currency = await store
        .getRepository(Currency)
        .createQueryBuilder('c')
        .where(
            'c.currencyName = :currencyName',
            { currencyName }
        )
        .leftJoinAndSelect('c.coinGecko', 'coinGecko')
        .getOne();
    
    return currency || null;
}

export async function createCurrency(store: Store, currencyName: string): Promise<Currency> {
    const currency = await getCurrency(store, currencyName);

    if (currency) {
        return currency;
    }

    let dataCurrency = { id: currencyName, currencyName };
    let dataCoinGecko = currencyName === 'KUSD'
        ? { id: 'tether', name: 'Karura USD', symbol: currencyName }
        : null;

    if (!dataCoinGecko) {
        const resultCoinGecko = await searchCoinGeckoBySymbol(currencyName);

        if (resultCoinGecko) {
            const { id, name, symbol } = resultCoinGecko;
            dataCoinGecko = { id, name, symbol }
        }
    }

    if (dataCoinGecko) {
        const coinGecko = await store.save(new CoinGecko(dataCoinGecko));

        set(dataCurrency, 'coinGecko', coinGecko)
    }

    return store.save(new Currency(dataCurrency))
}

export async function createCurrPrice(store: Store, currency: Currency, timestamp: bigint): Promise<void> {
    const usdPrice = await getUsdPrice(store, currency, timestamp);

    await store.save(new CurrPrice({
        id: currency.id + timestamp,
        currency,
        usdPrice,
        timestamp
    }))
}

export async function createCurrVolumeDay(store: Store, currency: Currency, timestamp: bigint): Promise<void> {
    const volumeDayNative = await getVolumeDay(store, currency, timestamp);
    const volumeDayUSD = await getPriceUSD(store, currency, volumeDayNative);

    await store.save(new CurrVolumeDay({
        id: currency.id + timestamp,
        currency,
        volumeDayNative,
        volumeDayUSD,
        timestamp,
    }))
}

export async function createCurrLiquidity(
    store: Store,
    currency: Currency,
    liquidity: bigint,
    timestamp: bigint,
): Promise<void> {
    const liquidityUSD = await getPriceUSD(store, currency, liquidity);

    await store.save(new CurrLiquidity({
        id: currency.currencyName + timestamp,
        currency: currency,
        liquidity,
        liquidityUSD,
        timestamp,
    }))
}