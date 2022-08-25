import {Arg, Int, Query, Resolver} from "type-graphql";
import {EntityManager} from "typeorm";
import {CurrenciesPagination, CurrencyInfo, CurrencyInfoToday, CurrencySort, CurrencyWhereInput} from "../models";
import {getCountCurrencies, getFilter, getQueryCurrencies, getSort} from "../services/currencies.service";
import {pagination} from "../../mappings/utility";
import {IPaginatedType} from "../models/paginated.model";
import {getCountPools, getQueryPools} from "../services/pools.service";
import {PoolInfoToday} from "../models/pools.model";
import {getCountTransactions, getTransactionsQuery} from "../services/transactions.service";
import {Transaction} from "../models/transactions.model";

@Resolver()
export class CurrenciesResolver {
    constructor(private tx: () => Promise<EntityManager>) {}

    @Query(() => CurrencyInfo)
    async currencyInfo(@Arg('id', () => String, { validate: true }) id: string) {
        const connection = await this.tx()
        const filter = { currencyId: id, isTvlChange: true, isVolumeChange: true, isVolume7D: true }
        const mainQuery = getQueryCurrencies(connection, filter)
        const volumeList = await connection.createQueryBuilder('curr_volume_day', 'cv')
            .select('cv.timestamp', 'timestamp')
            .addSelect('cv.volume_day_usd', 'price')
            .where(`cv.currency_id='${id}'`)
            .orderBy('cv.timestamp', 'DESC')
            .limit(90)
            .getRawMany()
        const tvlList = await connection.createQueryBuilder('curr_liquidity', 'cl')
            .select('cl.timestamp', 'timestamp')
            .addSelect('cl.liquidity_usd', 'price')
            .where(`cl.currency_id='${id}'`)
            .orderBy('cl.timestamp', 'DESC')
            .limit(90)
            .getRawMany()
        const priceList = await connection.createQueryBuilder('curr_price', 'cp')
            .select('cp.timestamp', 'timestamp')
            .addSelect('cp.usd_price', 'price')
            .where(`cp.currency_id='${id}'`)
            .orderBy('cp.timestamp', 'DESC')
            .limit(90)
            .getRawMany()
        const pools = await getQueryPools(connection, id).limit(5).getRawMany()
        const poolsCount = await getCountPools(connection, { currency: id })
        const transactions = await getTransactionsQuery(connection, { currency: id })
            .orderBy('timestamp', 'DESC')
            .limit(10)
            .getRawMany()
        const transactionsCount = await getCountTransactions(connection, { currency: id })

        return {
            ...(await mainQuery.getRawOne()),
            volumeList,
            tvlList,
            priceList,
            pools: pagination<PoolInfoToday>(5, 0, poolsCount, pools),
            transactions: pagination<Transaction>(10, 0, transactionsCount, transactions),
        };
    }

    @Query(() => [CurrencyInfoToday])
    async currenciesInfoToday(
        @Arg('limit', () => Int, { defaultValue: 10, validate: true }) limit: number,
        @Arg('sort', () => CurrencySort, { nullable: true, validate: true }) sort: CurrencySort,
        @Arg('where', () => CurrencyWhereInput, { nullable: true, validate: true }) where: CurrencyWhereInput
    ): Promise<CurrencyInfoToday[]> {
        const sortData = getSort(sort)
        const filterData = getFilter(where)

        const connection = await this.tx()
        const query = await getQueryCurrencies(connection)

        // FILTER
        if (filterData && filterData.length) {
            filterData.forEach((value, i) => {
                (i === 0) ? query.where(value) : query.andWhere(value);
            })
        }

        // SORT
        if (sort) {
            query.orderBy(sortData.sort, sortData.order)
        }

        return query.limit(limit).getRawMany();
    }

    @Query(() => CurrenciesPagination)
    async currenciesPagination(
        @Arg('limit', () => Int, { defaultValue: 10, validate: true }) limit: number,
        @Arg('offset', () => Int, { defaultValue: 0, validate: true }) offset: number,
        @Arg('sort', () => CurrencySort, { nullable: true, validate: true }) sort: CurrencySort,
        @Arg('where', () => CurrencyWhereInput, { nullable: true, validate: true }) where: CurrencyWhereInput
    ): Promise<IPaginatedType<CurrencyInfoToday>> {
        const sortData = getSort(sort)
        const filterData = getFilter(where)

        const connection = await this.tx()
        const query = await getQueryCurrencies(connection)

        // FILTER
        if (filterData && filterData.length) {
            filterData.forEach((value, i) => {
                (i === 0) ? query.where(value) : query.andWhere(value);
            })
        }

        // SORT
        if (sort) {
            query.orderBy(sortData.sort, sortData.order)
        }

        if (offset) {
            query.offset(offset)
        }

        const node = await query.limit(limit).getRawMany()
        const totalCount = await getCountCurrencies(connection)

        return pagination<CurrencyInfoToday>(limit, offset, totalCount, node)
    }
}