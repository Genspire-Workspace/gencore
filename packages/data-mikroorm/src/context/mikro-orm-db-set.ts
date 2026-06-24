import type { DbSet, ListOptions, IPageRequest, IPageResult } from "@genspire/data";
import type { EntityClass, EntityManager } from "@mikro-orm/core";

type WhereInput<TEntity extends object> = Partial<TEntity>;

export class MikroOrmDbSet<TEntity extends object, TId = string>
  implements DbSet<TEntity, TId> {
  constructor(
    private readonly em: EntityManager,
    private readonly entityClass: EntityClass<TEntity>,
    private readonly idField = "id",
  ) {}

  async list(options: ListOptions<TEntity> = {}): Promise<TEntity[]> {
    const findOptions = this.createFindOptions(options);

    return await this.em.find(
      this.entityClass,
      (options.where ?? {}) as object,
      findOptions,
    ) as TEntity[];
  }

  async page(options: IPageRequest<TEntity> = {}): Promise<IPageResult<TEntity>> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.max(1, options.pageSize ?? 25);
    const [items, total] = await this.em.findAndCount(
      this.entityClass,
      {},
      {
        orderBy: this.createOrderBy(options.orderBy, options.direction),
        limit: pageSize,
        offset: (page - 1) * pageSize,
      } as never,
    ) as [TEntity[], number];
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: TId): Promise<TEntity | null> {
    return await this.findOne({ [this.idField]: id } as Partial<TEntity>);
  }

  async findOne(where: WhereInput<TEntity>): Promise<TEntity | null> {
    return await this.em.findOne(
      this.entityClass,
      where as object,
    ) as TEntity | null;
  }

  async exists(where: WhereInput<TEntity>): Promise<boolean> {
    return (await this.findOne(where)) != null;
  }

  async add(entity: TEntity): Promise<TEntity> {
    this.em.persist(entity);
    return entity;
  }

  async update(entity: TEntity): Promise<TEntity> {
    this.em.persist(entity);
    return entity;
  }

  async remove(entity: TEntity): Promise<void> {
    this.em.remove(entity);
  }

  async removeById(id: TId): Promise<boolean> {
    const entity = await this.findById(id);

    if (!entity) {
      return false;
    }

    this.em.remove(entity);
    return true;
  }

  private createFindOptions(options: ListOptions<TEntity>) {
    return {
      orderBy: this.createOrderBy(options.orderBy, options.direction),
      limit: options.limit,
    } as never;
  }

  private createOrderBy(
    orderBy: keyof TEntity & string | undefined,
    direction: "asc" | "desc" | undefined,
  ): Record<string, "asc" | "desc"> | undefined {
    if (!orderBy) {
      return undefined;
    }

    return {
      [orderBy]: direction ?? "asc",
    };
  }
}
