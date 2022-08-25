import {createHash} from "crypto";
import {Store} from "@subsquid/substrate-processor"
import {Currency, CurrPrice, Swap} from "../model"
import {IPaginatedType} from "../server-extension/models/paginated.model";

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

export const getPriceInUSD = async (store: Store, currency: Currency, tokens: bigint, timestamp: number): Promise<number> => {
    const currPrice = await store.get(CurrPrice, { where: { currency, timestamp } })
    const price = currPrice ? currPrice.usdPrice : 0

    if (price === 0) {
        return 0;
    }

    if (tokens < 0) {
        tokens = tokens * BigInt(-1);
    }

    return Number(tokens) / 10 ** currency.decimal * price;
}

export const getDailyNativeVolume = async (
    store: Store,
    fromCurrency: Currency,
    toCurrency: Currency | null = null,
    timestamp: number
): Promise<bigint> => {
    const date = timestamp * 1000
    const query = store
        .getRepository(Swap)
        .createQueryBuilder('s')
        .select('SUM(s.fromAmount)', "sum")
        .where(`s.fromCurrency = '${fromCurrency.id}'`)
        .andWhere(`s.step = 1`)
        .andWhere(`s.timestamp >= ${date}`)

    if (toCurrency) {
        query.andWhere(`s.toCurrency = '${toCurrency.id}'`)
    }

    const { sum } = await query.getRawOne();

    return sum || BigInt(0);
}

export const makeId = (str: string) => {
    return createHash('sha1').update(str).digest('hex');
}

export const pagination = <T>(
    limit: number,
    offset: number,
    totalCount: number,
    nodes: T[],
): IPaginatedType<T> => {
    const lastPage = Math.ceil(totalCount / limit)
    const currentPage = Math.ceil(lastPage * offset / totalCount)
    const pageInfo = {
        lastPage,
        currentPage,
        hasNextPage: currentPage < lastPage,
        hasPreviousPage: currentPage !== 1,
    };
    const edges = nodes.map((node, index) => ({
        cursor: (index + 1 + offset).toString(),
        node,
    }));

    return {
        totalCount,
        pageInfo,
        edges,
    };
};

export interface Type<T = any> extends Function {
    new (...args: any[]): T;
}