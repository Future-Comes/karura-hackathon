import {Arg, Int, Query, Resolver} from "type-graphql";
import {EntityManager} from "typeorm";
import {PoolInfoToday, PoolSort, PoolsPagination} from "../models/pools.model";
import {getCountPools, getQueryPools, getSort} from "../services/pools.service";
import {pagination} from "../../mappings/utility";
import {IPaginatedType} from "../models/paginated.model";

@Resolver()
export class PoolsResolver {
    constructor(private tx: () => Promise<EntityManager>) {}

    @Query(() => [PoolInfoToday])
    async poolsInfoToday(
        @Arg('limit', () => Int, { defaultValue: 10, validate: true }) limit: number,
        @Arg('sort', () => PoolSort, { nullable: true, validate: true }) sort: PoolSort
    ): Promise<PoolInfoToday[]> {
        const connection = await this.tx()
        const query = getQueryPools(connection)

        // SORT
        if (sort) {
            const sortData = getSort(sort)
            query.orderBy(sortData.sort, sortData.order)
        }

        return query.limit(limit).getRawMany()
    }

    @Query(() => PoolsPagination)
    async poolsPagination(
        @Arg('limit', () => Int, { defaultValue: 10, validate: true }) limit: number,
        @Arg('offset', () => Int, { defaultValue: 0, validate: true }) offset: number,
        @Arg('sort', () => PoolSort, { nullable: true, validate: true }) sort: PoolSort
    ): Promise<IPaginatedType<PoolInfoToday>> {
        const connection = await this.tx()
        const query = getQueryPools(connection)

        // SORT
        if (sort) {
            const sortData = getSort(sort)
            query.orderBy(sortData.sort, sortData.order)
        }

        if (offset) {
            query.offset(offset)
        }

        const node = await query.limit(limit).getRawMany()
        const totalCount = await getCountPools(connection)

        return pagination<PoolInfoToday>(limit, offset, totalCount, node)
    }
}