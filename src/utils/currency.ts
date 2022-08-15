import {Store} from "@subsquid/substrate-processor";
import {CoinGecko, Currency, CurrLiquidity, CurrPrice, CurrVolumeDay} from "../model";
import {getPriceUSD, getUsdPrice, getVolumeDay, searchCoinGeckoBySymbol} from "../mappings/utility";
import {CurrencyId} from "../types/v2041";
import {set} from "lodash";
import {Dayjs} from "dayjs";

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

export async function createCurrPrice(store: Store, currency: Currency, dateNow: Dayjs): Promise<void> {
    const usdPrice = await getUsdPrice(store, currency, dateNow);

    await store.save(new CurrPrice({
        id: currency.id + dateNow.unix(),
        currency,
        usdPrice,
        timestamp: BigInt(dateNow.unix())
    }))
}

export async function createCurrVolumeDay(store: Store, currency: Currency, dateNow: Dayjs): Promise<void> {
    const volumeDayNative = await getVolumeDay(store, currency, dateNow);
    const volumeDayUSD = await getPriceUSD(store, currency, volumeDayNative, dateNow);

    const timestamp = BigInt(dateNow.unix());
    const id = currency.id + timestamp;
    const currVolumeDay = await store.get(CurrVolumeDay, { where: { id, timestamp } });

    if (currVolumeDay) {
        await store.update(CurrVolumeDay, { id, timestamp }, { volumeDayNative, volumeDayUSD })
    } else {
        await store.save(new CurrVolumeDay({
            id,
            currency,
            volumeDayNative,
            volumeDayUSD,
            timestamp,
        }))
    }
}

export async function createCurrLiquidity(
    store: Store,
    currency: Currency,
    liquidity: bigint,
    dateNow: Dayjs,
): Promise<void> {
    const liquidityUSD = await getPriceUSD(store, currency, liquidity, dateNow);

    await store.save(new CurrLiquidity({
        id: currency.currencyName + dateNow.unix(),
        currency: currency,
        liquidity,
        liquidityUSD,
        timestamp: BigInt(dateNow.unix())
    }))
}