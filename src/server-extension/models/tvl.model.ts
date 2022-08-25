import {Field, Float, ObjectType} from "type-graphql";

@ObjectType()
export class TvlByDay {
    @Field(() => Float, { nullable: false })
    liquidity!: number;

    @Field(() => Number, { nullable: false })
    timestamp!: number
}