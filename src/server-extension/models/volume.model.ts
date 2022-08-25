import {Field, Float, ObjectType} from "type-graphql";

@ObjectType()
export class VolumeByDay {
    @Field(() => Float, { nullable: false })
    volume!: number;

    @Field(() => Number, { nullable: false })
    timestamp!: number
}