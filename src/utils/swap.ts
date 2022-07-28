import {EventHandlerContext, Store} from "@subsquid/substrate-processor";
import {CurrencyId} from "../types/v2041"
import {Currency, Swap} from "../model";
import {createCurrency, getTokenName} from "./currency";

interface NormalizationSwap {
    step: number,
    fromCurrency: Currency,
    fromAmount: bigint,
    toCurrency: Currency,
    toAmount: bigint,
}
type Currencies = { [k: string]: Currency };

export async function createSwap(ctx: EventHandlerContext, swap: NormalizationSwap): Promise<void> {
    const { step, fromCurrency, fromAmount, toCurrency, toAmount } = swap;
    const { store, event, block } = ctx;
    const timestamp = BigInt(ctx.block.timestamp);

    await store.save(new Swap({
        id: event.id + '-' + step,
        blockNumber: block.height,
        eventIdx: event.indexInBlock,
        step,
        timestamp,
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
    }))
}

export async function getSwaps(
    store: Store,
    propPath: CurrencyId[],
    liquidityChanges: bigint[]
): Promise<NormalizationSwap[]> {
    const swaps: NormalizationSwap[] = [];
    const currencies: Currencies = {};

    for (let step = 1; step < propPath.length; step++) {
        const fromTokenName = getTokenName(propPath[step - 1]);
        const toTokenName = getTokenName(propPath[step]);

        if (!fromTokenName || !toTokenName) continue

        const fromAmount = liquidityChanges[step - 1];
        const toAmount = liquidityChanges[step];

        let fromCurrency = currencies[fromTokenName];
        let toCurrency = currencies[toTokenName];

        if (!fromCurrency) {
            fromCurrency = await createCurrency(store, fromTokenName);
            currencies[fromTokenName] = fromCurrency;
        }

        if (!toCurrency) {
            toCurrency = await createCurrency(store, toTokenName);
            currencies[toTokenName] = toCurrency;
        }

        swaps.push({
            step,
            fromCurrency,
            fromAmount,
            toCurrency,
            toAmount
        })
    }

    return swaps;
}