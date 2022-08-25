import {Field, ObjectType} from "type-graphql";
import {Type} from "../../mappings/utility";

interface IPageInfo {
  lastPage: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface IEdgeType<T> {
  cursor: string;
  node: T;
}

export interface IPaginatedType<T> {
  edges: IEdgeType<T>[];
  pageInfo: IPageInfo;
  totalCount: number;
}

@ObjectType()
class PageInfo {
  @Field()
  lastPage!: number;

  @Field()
  currentPage!: number;

  @Field()
  hasNextPage!: boolean;

  @Field()
  hasPreviousPage!: boolean;
}

export function Paginated<T>(classRef: Type<T>): Type<IPaginatedType<T>> {
  @ObjectType(`${classRef.name}Edge`)
  abstract class EdgeType {
    @Field()
    cursor!: string;

    @Field(() => classRef)
    node!: T;
  }

  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements IPaginatedType<T> {
    @Field(() => [EdgeType], { nullable: true })
    edges!: EdgeType[];

    @Field(() => PageInfo)
    pageInfo!: PageInfo;

    @Field()
    totalCount!: number;
  }

  return PaginatedType as Type<IPaginatedType<T>>;
}
