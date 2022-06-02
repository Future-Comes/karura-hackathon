import {Store} from "@subsquid/substrate-processor";
import {Currency, CurrLiquidity, CurrPrice, CurrVolumeDay} from "../model";
import {get, getPriceUSD, getUsdPrice, getVolumeDay} from "../mappings/utility";
import {CurrencyId} from "../types/v2041";

export function getTokenName(currency: CurrencyId): string | null {
    const type = currency.__kind;

    if (type === 'Token') {
        return currency.value.__kind
    }

    return null;
}

export async function createCurrency(store: Store, currencyName: string): Promise<Currency> {
    const id = 'token-' + currencyName;

    let currency = await get(store, Currency, id)

    if (!currency) {
        const props = { id, currencyName }

        currency = await store.save(new Currency(props))
    }

    return currency;
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