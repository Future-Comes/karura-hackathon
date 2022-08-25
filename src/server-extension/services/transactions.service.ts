import {EntityManager} from "typeorm";

interface QueryFilter { currency: string }
export const getTransactionsQuery = (connection: EntityManager, filter?: QueryFilter) => {
    const mainQuery = connection.createQueryBuilder()
        .from('liquidity_change', 'lc')
        .select('total_liquidity_one', 'totalLiquidityOne')
        .addSelect('total_liquidity_zero', 'totalLiquidityZero')
        .addSelect('amount_zero', 'amountZero')
        .addSelect('amount_one', 'amountOne')
        .addSelect('block_number', 'blockNumber')
        .addSelect('change_reason', 'changeReason')
        .addSelect('event_id', 'eventId')
        .addSelect('event_idx', 'eventIdx')
        .addSelect('c1.symbol', 'currencyZero')
        .addSelect('c2.symbol', 'currencyOne')
        .addSelect('lc.id', 'id')
        .addSelect(['hash', 'account', 'timestamp'])
        .innerJoin('currency', 'c1', 'c1.id=lc.currency_zero_id')
        .innerJoin('currency', 'c2', 'c2.id=lc.currency_one_id')

    if (filter?.currency) {
        mainQuery
            .where(`lc.currency_zero_id='${filter.currency}'`)
            .orWhere(`lc.currency_one_id='${filter.currency}'`)
    }

    return connection.createQueryBuilder()
        .from(`(${mainQuery.getQuery()})`, 't')
}

interface CountFilter { currency: string }
export const getCountTransactions = async (connection: EntityManager, filter?: CountFilter): Promise<number> => {
    const query = connection.createQueryBuilder('liquidity_change', 'lc')
        .select('count(*)')

    if (filter?.currency) {
        query.where(`lc.currency_zero_id='${filter.currency}'`)
    }

    const data: { count: number } | undefined = await query.getRawOne()

    return data?.count || 0
}