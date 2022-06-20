import {Store} from "@subsquid/substrate-processor";
import {CoinGecko, Currency, CurrLiquidity, CurrPrice, CurrVolumeDay} from "../model";
import {getCoinGecko, getPriceUSD, getUsdPrice, getVolumeDay} from "../mappings/utility";
import {CurrencyId} from "../types/v2041";

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

    let props;

    if (currencyName === 'KUSD') {
        props = { id: 'tether', name: 'Karura USD', symbol: currencyName };
    } else {
        const dataCoinGecko = await getCoinGecko(currencyName);
        const { id, name, symbol } = dataCoinGecko;
        props = { id, name, symbol }
    }
    
    const coinGecko = await store.save(new CoinGecko(props));

    return store.save(new Currency({ id: currencyName, coinGecko, currencyName }))
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
    const volumeDayUSD = await getPriceUSD(store, currency, volumeDayNative, timestamp);

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
    const liquidityUSD = await getPriceUSD(store, currency, liquidity, timestamp);

    await store.save(new CurrLiquidity({
        id: currency.currencyName + timestamp,
        currency: currency,
        liquidity,
        liquidityUSD,
        timestamp,
    }))
}