import { EventHandlerContext } from "@subsquid/substrate-processor";
import { CurrencyId_Token } from "../types/v2041"
import { Swap } from "../model";

interface Token {
    token: CurrencyId_Token,
    amount: bigint
}
interface Tokens {
    from: Token,
    to: Token
}

export async function createSwap(ctx: EventHandlerContext, tokens: Tokens, step: number): Promise<void> {
    const { store, event, block } = ctx;
    const timestamp = BigInt(ctx.block.timestamp);

    await store.save(new Swap({
        id: event.id + '-' + step,
        blockNumber: block.height,
        eventIdx: event.indexInBlock,
        step,
        timestamp,
        fromCurrency: tokens.from.token.value.__kind,
        fromAmount: tokens.from.amount,
        toCurrency: tokens.to.token.value.__kind,
        toAmount: tokens.to.amount
    }))
}