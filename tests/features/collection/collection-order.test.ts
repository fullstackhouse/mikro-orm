import { Collection, Entity, ManyToOne, MikroORM, OneToMany, PrimaryKey, Property, SimpleLogger } from '@mikro-orm/better-sqlite';

@Entity()
class Author {

  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @OneToMany(() => Book, b => b.author)
  books = new Collection<Book>(this);

  constructor(name: string) {
    this.name = name;
  }

}

@Entity()
class Book {

  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @ManyToOne(() => Author)
  author!: Author;

  constructor(author: Author, title: string) {
    this.author = author;
    this.title = title;
  }

}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    entities: [Author],
    dbName: ':memory:',
    loggerFactory: SimpleLogger.create,
  });

  await orm.schema.createSchema();
  await createEntities();
});

beforeEach(() => orm.em.clear());
afterAll(() => orm.close(true));

async function createEntities() {
  const author = new Author('john');
  author.books.add(
    new Book(author, 'a'),
    new Book(author, 'c'),
    new Book(author, 'b'),
  );
  await orm.em.fork().persistAndFlush(author);
}

test('collection is refreshed when loaded with a different order than previously', async () => {
  const author = await orm.em.findOneOrFail(Author, { name: 'john' });
  expect((await author.books.loadItems()).map(b => b.title)).toEqual(['a', 'c', 'b']);

  expect(
    (await author.books.loadItems({ orderBy: { title: 'ASC' } })).map(
      b => b.title,
    ),
  ).toEqual(['a', 'b', 'c']);

  expect(
    (await author.books.loadItems({ orderBy: { title: 'DESC' } })).map(
      b => b.title,
    ),
  ).toEqual(['c', 'b', 'a']);
});
