import {CurrencySort, CurrencyWhereInput} from "../models";
import {EntityManager} from "typeorm";
import dayjs from "dayjs";

enum Order {
    asc = 'ASC',
    desc = 'DESC',
}

const getSort = (sort: CurrencySort) => {
    switch (sort) {
        case CurrencySort.price_ASC:
            return { sort: 'price', order: Order.asc }
        case CurrencySort.price_DESC:
            return { sort: 'price', order: Order.desc }
        case CurrencySort.priceChange_ASC:
            return { sort: '"priceChange"', order: Order.asc }
        case CurrencySort.priceChange_DESC:
            return { sort: '"priceChange"', order: Order.desc }
        case CurrencySort.volume_ASC:
            return { sort: 'volume', order: Order.asc }
        case CurrencySort.volume_DESC:
            return { sort: 'volume', order: Order.desc }
        case CurrencySort.tvl_ASC:
            return { sort: 'tvl', order: Order.asc }
        case CurrencySort.tvl_DESC:
            return { sort: 'tvl', order: Order.desc }
        case CurrencySort.id_ASC:
            return { sort: 'id', order: Order.asc }
        case CurrencySort.id_DESC:
        default:
            return { sort: 'id', order: Order.desc }
    }
}

const getFilter = (filters: CurrencyWhereInput): string[] | null => {
    if (!filters) return null;

    const result = [];

    if ('price_from' in filters) {
        result.push(`price>=${filters.price_from}`)
    }

    if ('price_to' in filters) {
        result.push(`price<=${filters.price_to}`)
    }

    if ('priceChange_from' in filters) {
        result.push(`priceChange>=${filters.priceChange_from}`)
    }

    if ('priceChange_to' in filters) {
        result.push(`priceChange<=${filters.priceChange_to}`)
    }

    return result
}

export interface Filters {
    currencyId?: string
    isTvlChange?: boolean
    isVolume7D?: boolean
    isVolumeChange?: boolean
}

const getQueryCurrencies = (connection: EntityManager, filters?: Filters) => {
    const startDay = dayjs().startOf('day')
    const today = startDay.unix()
    const yesterday = startDay.subtract(1, "day").unix()

    const mainQuery = connection.createQueryBuilder('currency', 'c')
        .select('c.id', 'id')
        .distinctOn(['c.id'])
        .addSelect('cg.name', 'name')
        .addSelect('cg.symbol', 'symbol')
        .addSelect('cp.usd_price', 'price')
        .addSelect('(100 * (cp.usd_price / cp1.usd_price - 1))', "priceChange")
        .addSelect('cl.liquidity_usd', 'tvl')
        .addSelect('cv.volume_day_usd', 'volume')
        .innerJoin('coin_gecko', 'cg', 'cg.symbol=c.id')
        .innerJoin('curr_liquidity', 'cl', `cl.currency_id=c.id and cl.timestamp=${today}`)
        .innerJoin('curr_volume_day', 'cv', `cv.currency_id=c.id and cv.timestamp=${today}`)
        .innerJoin('curr_price', 'cp', `cp.currency_id=c.id and cp.timestamp=${today} `)
        .innerJoin('curr_price', 'cp1', `cp1.currency_id=c.id and cp1.timestamp=${yesterday}`)
        .orderBy({ 'c.id': 'DESC', 'cp.timestamp': 'DESC' })

    if (filters?.isTvlChange) {
        mainQuery
            .addSelect('(100 * (cl.liquidity_usd / cl1.liquidity_usd - 1))', "tvlChange")
            .innerJoin('curr_liquidity', 'cl1', `cl1.currency_id=c.id and cl1.timestamp=${yesterday}`)
    }

    if (filters?.isVolumeChange) {
        mainQuery
            .addSelect('(100 * (cv.volume_day_usd / cv1.volume_day_usd - 1))', "volumeChange")
            .innerJoin('curr_volume_day', 'cv1', `cv1.currency_id=c.id and cv1.timestamp=${yesterday}`)
    }

    if (filters?.isVolume7D) {
        const volume7DAllQuery = connection.createQueryBuilder('curr_volume_day', 'cv2')
            .select('cv2.volume_day_usd', 'price')
            .where('cv2.currency_id=c.id')
            .orderBy('cv2.timestamp', 'DESC')
            .limit(7)
            .getQuery();
        const volume7DQuery = connection.createQueryBuilder()
            .select('sum(t.price)')
            .from(`(${volume7DAllQuery})`, 't')
            .getQuery();
        mainQuery.addSelect(`(${volume7DQuery})`, 'volume7D')
    }

    if (filters?.currencyId) {
        mainQuery.where(`c.id='${filters.currencyId}'`)
    }
    console.log(mainQuery.getQuery())

    return connection.createQueryBuilder()
        .from(`(${mainQuery.getQuery()})`, 't')
}

const getCountCurrencies = async (connection: EntityManager): Promise<number> => {
    const data: any = await connection.createQueryBuilder('currency', 'c')
        .select('count(*)')
        .getRawOne()

    return data?.count || 0
}

export {
    getSort,
    getFilter,
    getQueryCurrencies,
    getCountCurrencies
}