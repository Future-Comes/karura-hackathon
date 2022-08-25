import {Arg, Int, Query, Resolver} from "type-graphql";
import {EntityManager} from "typeorm";
import {CurrLiquidity} from "../../model";
import {TvlByDay} from "../models";

@Resolver()
export class TvlResolver {
    constructor(private tx: () => Promise<EntityManager>) {
    }

    @Query(() => [TvlByDay])
    async tvlByDay(
        @Arg("limit", () => Int, { defaultValue: 10 }) limit: number
    ): Promise<TvlByDay[]> {
        const manager = await this.tx()

        return manager
            .getRepository(CurrLiquidity)
            .query(
                `
                    select timestamp, SUM(usd_total_liquidity) as liquidity
                    from pool_liquidity
                    group by timestamp
                    order by timestamp desc
                    limit ${limit}
                `,
            );
    }
}