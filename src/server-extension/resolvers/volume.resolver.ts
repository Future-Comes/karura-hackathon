import {Arg, Int, Query, Resolver} from "type-graphql";
import {EntityManager} from "typeorm";
import {CurrVolumeDay} from "../../model";
import {VolumeByDay} from "../models";

@Resolver()
export class VolumeResolver {
    constructor(private tx: () => Promise<EntityManager>) {
    }

    @Query(() => [VolumeByDay])
    async volumeByDay(
        @Arg("limit", () => Int, { defaultValue: 10 }) limit: number
    ): Promise<VolumeByDay[]> {
        const manager = await this.tx()

        return manager
            .getRepository(CurrVolumeDay)
            .query(
                `
                    select timestamp, SUM(volume_day_usd) as volume
                    from pool_volume_day
                    group by timestamp
                    order by timestamp desc
                    limit ${limit}
                `,
            );
    }
}
// 33827766961373,215
// 4007065,6130243717