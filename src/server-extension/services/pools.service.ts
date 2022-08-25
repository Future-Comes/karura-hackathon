import {PoolSort} from "../models/pools.model";
import {EntityManager} from "typeorm";

enum Order {
  asc = 'ASC',
  desc = 'DESC',
}

const getSort = (sort: PoolSort) => {
  switch (sort) {
    case PoolSort.volume7D_ASC:
      return { sort: '"volume7D"', order: Order.asc }
    case PoolSort.volume7D_DESC:
      return { sort: '"volume7D"', order: Order.desc }
    case PoolSort.volume1D_ASC:
      return { sort: '"volume1D"', order: Order.asc }
    case PoolSort.volume1D_DESC:
      return { sort: '"volume1D"', order: Order.desc }
    case PoolSort.tvl_ASC:
      return { sort: 'tvl', order: Order.asc }
    case PoolSort.tvl_DESC:
      return { sort: 'tvl', order: Order.desc }
    case PoolSort.id_ASC:
      return { sort: 'id', order: Order.asc }
    case PoolSort.id_DESC:
    default:
      return { sort: 'id', order: Order.desc }
  }
}

const getQueryPools = (connection: EntityManager, currency?: string) => {
  const volume1DQuery = connection.createQueryBuilder('pool_volume_day', 'pv1')
      .select('pv1.volume_day_usd')
      .where('pv1.pool_id=p.id')
      .orderBy('pv1.timestamp', 'DESC')
      .limit(1)
      .getQuery()

  const volume7DAllQuery = connection.createQueryBuilder('pool_volume_day', 'pv2')
      .select('pv2.volume_day_usd', 'price')
      .where('pv2.pool_id=p.id')
      .orderBy('pv2.timestamp', 'DESC')
      .limit(7)
      .getQuery()
  const volume7DQuery = connection.createQueryBuilder()
      .select('sum(t.price)')
      .from(`(${volume7DAllQuery})`, 't')
      .getQuery()

  const tvlQuery = connection.createQueryBuilder('pool_liquidity', 'pl')
      .select('pl.usd_total_liquidity')
      .where('pl.pool_id=p.id')
      .orderBy('pl.timestamp', 'DESC')
      .limit(1)
      .getQuery()

  const mainQuery = connection.createQueryBuilder('pool', 'p')
      .select('p.id', 'id')
      .addSelect('cg1.name', "fromName")
      .addSelect('cg1.symbol', "fromSymbol")
      .addSelect('cg2.name', "toName")
      .addSelect('cg2.symbol', "toSymbol")
      .addSelect(`(${volume1DQuery})`, 'volume1D')
      .addSelect(`(${volume7DQuery})`, 'volume7D')
      .addSelect(`(${tvlQuery})`, 'tvl')
      .innerJoin('coin_gecko', 'cg1', 'cg1.symbol=p.currency_zero_id')
      .innerJoin('coin_gecko', 'cg2', 'cg2.symbol=p.currency_one_id')

  if (currency) {
    mainQuery
        .where(`p.currency_zero_id='${currency}'`)
        .orWhere(`p.currency_one_id='${currency}'`)
  }

  return connection.createQueryBuilder()
      .from(`(${mainQuery.getQuery()})`, 't')
}

interface CountFilter { currency: string }
const getCountPools = async (connection: EntityManager, filter?: CountFilter): Promise<number> => {
  const query = connection.createQueryBuilder('pool', 'p')
      .select('count(*)')

  if (filter?.currency) {
    query
        .where(`p.currency_zero_id='${filter.currency}'`)
        .orWhere(`p.currency_one_id='${filter.currency}'`)
  }

  const data: { count: number } | undefined = await query.getRawOne()

  return data?.count || 0
}

export {
  getSort,
  getQueryPools,
  getCountPools
}