import {Store} from "@subsquid/substrate-processor";
import {Currency, CurrLiquidity, CurrPrice, CurrVolumeDay} from "../model";
import {get, getPrice, getUsdPrice, getVolumeDay, getVolumeDayUSD} from "../mappings/utility";
import {CurrencyId_Token} from "../types/v2041";

export async function getCurrencyByName(store: Store, currencyName: string): Promise<Currency> {
    const currency = await store.query(`
        SELECT * FROM currency c
        WHERE (c.currency_name = '${currencyName}')
    `);

    currency[0].currencyName = currency[0].currency_name;

    return currency[0];
}

export async function createCurrency(store: Store, currencyToken: CurrencyId_Token): Promise<Currency> {
    const currencyName = currencyToken.value.__kind;
    const id = currencyToken.__kind + '-' + currencyName;

    let currency = await get(store, Currency, id)

    if (!currency) {
        const props = { id, currencyName }

        currency = await store.save(new Currency(props))
    }

    return currency;
}

export async function createCurrPrice(store: Store, currencyName: string, timestamp: bigint): Promise<void> {
    const currency = await getCurrencyByName(store, currencyName);
    const usdPrice = await getUsdPrice(store, currency, timestamp);

    await store.save(new CurrPrice({
        id: currency.id + timestamp,
        currency,
        usdPrice,
        timestamp
    }))
}

export async function createCurrVolumeDay(store: Store, currencyName: string, timestamp: bigint): Promise<void> {
    const currency = await getCurrencyByName(store, currencyName);

    const volumeDayNative = await getVolumeDay(store, currencyName, timestamp);
    const volumeDayUSD = await getVolumeDayUSD(store, currencyName, timestamp);

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
    timestamp: bigint,
    amount: bigint,
    balance: bigint
): Promise<void> {
    const liquidityUSD = await getPrice(store, currency, timestamp, amount);

    await store.save(new CurrLiquidity({
        id: currency.currencyName + timestamp,
        currency: currency,
        liquidity: balance,
        liquidityUSD,
        timestamp,
    }))
}