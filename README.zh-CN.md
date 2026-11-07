# @jsdevlab/valibot

从 [valibot](https://valibot.dev) schema 生成**确定性的初始化数据**与**可复现的 mock 数据**。

`create` 生成适合表单初始值的“空白”对象，同时仍然满足 schema；`mock` 生成遵守 schema 约束的随机数据。两者都返回 `v.InferOutput<T>`，生成结果与 schema 的类型推导完全一致。

[English](./README.md) | **简体中文**

## 特性

- **Schema 驱动**：直接使用 valibot schema，无需额外的 DSL 或代码生成。
- **两种模式**：`create` 生成确定性初始值，`mock` 生成可复现的随机数据。
- **约束感知**：支持长度、数值范围、格式、正则、`startsWith`/`endsWith`、`includes`/`excludes`、大小与条目数量等约束。
- **可复现**：相同 seed 生成相同结果（同一 faker 版本内）。
- **类型安全**：返回类型为 `v.InferOutput<T>`；`defaults` 按 `DeepPartial<v.InferOutput<T>>` 做编译期校验。
- **可扩展**：可按 schema 实例或 `schema.type` 注册自定义生成器，优先级高于内置生成器。
- **无侵入**：使用私有的 faker 实例，不会改变应用全局 faker 的 seed 与随机状态。
- **双格式**：同时提供 ESM 与 CommonJS 构建产物及 TypeScript 声明。

## 环境要求

- Node.js **20 及以上**（使用了全局 `Blob`、`File` 与 `btoa`）。
- 提供相同全局对象的现代浏览器同样可用。
- Peer 依赖：`valibot ^1.5.0`。

## 安装

```bash
pnpm add @jsdevlab/valibot valibot
```

```bash
npm install @jsdevlab/valibot valibot
```

```bash
yarn add @jsdevlab/valibot valibot
```

两种模块格式均受支持：

```ts
// ESM / TypeScript
import { create, mock } from '@jsdevlab/valibot';

// CommonJS
const { create, mock } = require('@jsdevlab/valibot');
```

## 快速开始

```ts
import * as v from 'valibot';
import { create, mock } from '@jsdevlab/valibot';

const userSchema = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  role: v.enum({ Admin: 'admin', User: 'user' }),
  page: v.optional(v.number(), 1), // 默认值
  note: v.fallback(v.string(), 'n/a'), // fallback 值
  tags: v.array(v.string()),
});

// 确定性初始化（例如表单默认值）
const init = create(userSchema);
// {
//   name: '',
//   email: 'Johnathon_Kertzmann@hotmail.com', // 确定性输出，seed 0
//   role: 'admin',
//   page: 1,
//   note: 'n/a',
//   tags: []
// }

// 随机 mock 数据（测试、演示、fixture）——相同 seed 可复现
const fakeUser = mock(userSchema, { seed: 42 });
// { name: 'XMFiidTFKb', email: 'Collin.Leffler@yahoo.com', role: 'admin',
//   page: 1, note: 'n/a', tags: ['xOkAEcFidX', 'QpfJwgzbVnIqBCjYOWUF', ...] }

// 覆盖生成结果的任意字段（编译期校验的深部分更新）
const draft = create(userSchema, {
  defaults: { name: 'Alice', role: 'admin' },
});
// { name: 'Alice', email: 'Johnathon_Kertzmann@hotmail.com', ... }
```

> 示例值来自当前锁定的 faker 版本。faker 更新随机序列后示例值可能变化；确定性仅在相同 faker 版本内保证。

## API

### `create(schema, options?)`

生成确定性的初始化数据。

- 在启用时优先使用字段默认值（`v.optional(schema, default)`、`v.nullable(schema, default)`）与 `v.fallback(...)`。
- 尽可能返回“最小合法值”：无约束字符串为 `''`，数字为 `0`，布尔为 `false`，数组为 `[]`，record 为 `{}`，map/set 为空实例，并填充所有对象字段。
- 遵守最小约束：`v.minLength(3)` 生成 3 个字符，`v.size(3)` 生成 3 个 map/set/blob/file 条目，`v.minValue(5)` 生成 `5`，依此类推。
- 对无法生成的 schema（`v.function()`、`v.custom()`、`v.never()`）默认抛错。可通过 `defaults`、自定义生成器或 `unhandled: 'skip'` 处理。

### `mock(schema, options?)`

生成可复现的随机数据。

- 字符串、日期及格式化值由 faker 生成。
- 应用[支持的约束](#支持的约束)中列出的 schema 约束。
- `seed` 默认 `1`；相同 seed 与 schema 在同一 faker 版本内生成相同结果。
- 两种模式默认都优先使用默认值与 fallback 值（可通过 `useDefault` / `useFallback` 关闭）。

### 选项

两个函数接受相同的选项；`defaults` 的额外类型由 schema 决定。

| 选项             | 类型                                      | 默认值                      | 说明                                                          |
| ---------------- | ----------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| `seed`           | `number`                                  | `1`                         | `mock` 的随机种子（`create` 固定使用种子 `0`）。              |
| `recursionLimit` | `number`                                  | `10`                        | lazy 自引用的最大递归深度。                                   |
| `generators`     | `GeneratorDefinition[]`                   | `[]`                        | 自定义生成器，按实例或 `schema.type` 匹配，优先于内置生成器。 |
| `array`          | `{ min?, max? }`                          | `{ min: 0, max: 10 }`       | 数组长度范围，与 `minLength`/`maxLength` 取交集。             |
| `record`         | `{ min?, max? }`                          | `{ min: 0, max: 10 }`       | record 条目数量范围。                                         |
| `map`            | `{ min?, max? }`                          | `{ min: 0, max: 10 }`       | map 条目数量范围。                                            |
| `set`            | `{ min?, max? }`                          | `{ min: 0, max: 10 }`       | set 条目数量范围。                                            |
| `optional`       | `{ chance? }`                             | `{ chance: 0.3 }`           | mock 模式下 `v.optional()` 生成 `undefined` 的概率。          |
| `nullable`       | `{ chance? }`                             | `{ chance: 0.3 }`           | mock 模式下 `v.nullable()` 生成 `null` 的概率。               |
| `useDefault`     | `boolean`                                 | `true`                      | 是否优先使用 schema 默认值。                                  |
| `useFallback`    | `boolean`                                 | `true`                      | 是否优先使用 `v.fallback()` 值。                              |
| `unhandled`      | `'throw' \| 'skip'`                       | `'throw'`                   | 无法生成的 schema 的处理方式：抛错或返回 `undefined`。        |
| `date`           | `{ min?: Date; max?: Date }`              | `1970-01-01` – `2100-01-01` | 日期范围，与日期约束取交集。                                  |
| `string`         | `{ length?: number \| [number, number] }` | `[5, 20]`                   | 字符串长度（或范围），与 schema 约束取交集。                  |
| `defaults`       | `DeepPartial<v.InferOutput<T>>`           | —                           | 字段覆盖值，深合并到结果中。                                  |

### `defaults` 语义

- 类型为 `DeepPartial<v.InferOutput<T>>`，未知字段与错误的字段类型都会导致编译期错误。
- 普通对象递归合并；其他所有值直接替换生成值。
- `null`、数组与类实例（包括 `Map` / `Set` / `Date`）都是替换而非合并。
- 同时作为无法生成 schema（例如 `v.custom()`）的兜底值来源。
- `undefined` 表示“不覆盖”，不会清除已生成字段。

```ts
const schema = v.object({
  profile: v.object({ name: v.string(), age: v.number() }),
  tags: v.array(v.string()),
  note: v.union([v.string(), v.null()]),
});

const value = create(schema, {
  defaults: {
    profile: { name: 'Alice' }, // age 仍会被生成
    tags: ['admin'], // 数组整体替换，不合并
    note: null, // null 是显式覆盖
  },
});
```

### 自定义生成器

生成器接收当前 schema 与生成上下文，可以返回任意值。

```ts
import * as v from 'valibot';
import { create, mock } from '@jsdevlab/valibot';

const idSchema = v.pipe(v.string(), v.uuid());

// 匹配特定 schema 实例
mock(schema, {
  generators: [
    {
      schema: idSchema,
      generator: () => '00000000-0000-4000-8000-000000000000',
    },
  ],
});

// 匹配某一类型的全部 schema（覆盖内置生成器）
create(schema, {
  generators: [{ type: 'number', generator: () => 42 }],
});

// 读取当前上下文（mode、path、options 等）
mock(schema, {
  generators: [
    {
      type: 'string',
      generator: (_schema, ctx) => `field_${ctx.path.join('_')}`,
    },
  ],
});
```

`ctx` 提供：

- `mode`：`'init'` 或 `'mock'`
- `path`：当前字段路径（`Array<string | number>`）
- `options`：归一化后的生成选项
- `random`：基于 faker 的 `Random` 工具（`float`、`int`、`pick`、`chance`、`string`）
- `defaults`：调用方传入的默认值
- `recursion`：单次生成运行的递归计数器

### 异常

```ts
import {
  NoGeneratorException,
  RecursionLimitReachedException,
} from '@jsdevlab/valibot';

try {
  create(v.function());
} catch (error) {
  if (error instanceof NoGeneratorException) {
    // 该 schema 类型没有生成器
  }
}
```

两个异常类都以运行时值导出，而不仅仅是类型。

## 工作原理

1. **Fallback 与默认值**：带 `v.fallback(...)` 或 optional/nullable 默认值的 schema 直接返回对应值（启用时）。
2. **自定义生成器**：先按 schema 实例匹配，再按 `schema.type` 匹配。
3. **内置生成器**：按 valibot 的 `schema.type` 字符串分发（例如 `exact_optional`、`object_with_rest`），不依赖 `instanceof`。
4. **验证兜底**：字符串、数字与日期候选值通过 `v.safeParse` 校验；对 `regex`、`includes`、`multipleOf`、日期范围等约束最多重试 20 次。
5. **递归保护**：lazy 自引用按 schema 实例计数，超过 `recursionLimit` 抛出 `RecursionLimitReachedException`。

约束从 schema 的 `pipe` 中按 action 的 `type` 字符串读取。schema 约束是硬边界；调用方选项只能在边界内收窄，不能违反。

## 支持的 schema 类型

| 分类     | valibot schema                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 标量     | `string`、`number`、`bigint`、`boolean`、`date`、`nan`、`symbol`、`instance`                                                       |
| 字面量   | `literal`、`enum`、`picklist`                                                                                                      |
| 对象     | `object`、`looseObject`、`strictObject`、`objectWithRest`                                                                          |
| 容器     | `array`、`tuple`、`looseTuple`、`strictTuple`、`tupleWithRest`、`record`、`map`、`set`、`blob`、`file`                             |
| 组合     | `union`、`variant`、`intersect`                                                                                                    |
| 包装     | `optional`、`nullable`、`nullish`、`undefinedable`、`exactOptional`、`nonNullable`、`nonNullish`、`nonOptional`、`lazy`、`promise` |
| 非结构化 | `any`、`unknown`、`undefined`、`null`、`void`、`never`                                                                             |
| 不可生成 | `function`、`custom`                                                                                                               |

各模式的行为：

| Schema                                       | `create`                     | `mock`                                    |
| -------------------------------------------- | ---------------------------- | ----------------------------------------- |
| `string`                                     | `''`，或满足约束的最小字符串 | 满足约束的随机字符串                      |
| `number` / `bigint`                          | 被限制在范围内的 `0`         | 范围内的随机值                            |
| `boolean`                                    | `false`                      | 随机                                      |
| `date`                                       | 被限制在范围内的 epoch       | 范围内的随机日期                          |
| `literal` / `enum` / `picklist`              | 第一个值                     | 随机值                                    |
| `union` / `variant`                          | 第一个分支                   | 随机分支                                  |
| `intersect`                                  | 合并对象分支                 | 合并对象分支                              |
| `array`                                      | `[]`，或 `minLength` 个元素  | 随机长度                                  |
| `tuple*`                                     | 全部固定元素                 | 全部固定元素（tupleWithRest 额外加 rest） |
| `record` / `map` / `set`                     | 为空，除非要求最小大小       | 随机大小                                  |
| `object*`                                    | 全部字段                     | 全部字段（loose/rest 对象额外加键）       |
| `optional` / `undefinedable`                 | `undefined`                  | 按概率生成 `undefined`                    |
| `nullable` / `nullish`                       | `null`                       | 按概率生成 `null`/`undefined`             |
| `exactOptional`                              | 内部值                       | 内部值                                    |
| `nonNullable` / `nonNullish` / `nonOptional` | 内部值                       | 内部值                                    |
| `lazy`                                       | 内部值                       | 内部值                                    |
| `promise`                                    | `Promise.resolve(undefined)` | `Promise.resolve(undefined)`              |
| `instance`                                   | 无参构造实例，或原型对象     | 同上                                      |
| `any` / `unknown`                            | `undefined`                  | `0`、`''`、`false` 或 `null`              |
| `undefined` / `void`                         | `undefined`                  | `undefined`                               |
| `null`                                       | `null`                       | `null`                                    |
| `never`                                      | 抛错 / `defaults` / 跳过     | 同上                                      |
| `function` / `custom`                        | 抛错 / `defaults` / 跳过     | 同上                                      |

> `v.brand()`、`v.flavor()`、`v.description()` 等元数据/变换 action 会被忽略：生成针对基础类型，校验仍会在 pipe 上执行。

## 支持的约束

| 输入                    | Actions                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| string                  | `minLength`、`maxLength`、`length`、`nonEmpty`、`empty`、`minBytes`、`maxBytes`、`minCodePoints`、`maxCodePoints`、`minGraphemes`、`maxGraphemes`、`regex`、`includes`、`excludes`、`startsWith`、`endsWith`                                                                                                                                                                                 |
| 字符串格式              | `email`、`rfcEmail`、`url`、`uuid`、`ip`、`ipv4`、`ipv6`、`mac`、`mac48`、`mac64`、`isoDate`、`isoTime`、`isoTimeSecond`、`isoDateTime`、`isoDateTimeSecond`、`isoTimestamp`、`isoWeek`、`emoji`、`base64`、`decimal`、`digits`、`hexadecimal`、`octal`、`slug`、`domain`、`bic`、`creditCard`、`hexColor`、`imei`、`isbn`、`isrc`、`jwsCompact`、`ksuid`、`cuid2`、`nanoid`、`ulid`、`hash` |
| number                  | `minValue`、`maxValue`、`gtValue`、`ltValue`、`integer`、`safeInteger`、`multipleOf`                                                                                                                                                                                                                                                                                                         |
| bigint                  | `minValue`、`maxValue`、`gtValue`、`ltValue`、`multipleOf`                                                                                                                                                                                                                                                                                                                                   |
| date                    | `minValue`、`maxValue`、`gtValue`、`ltValue`                                                                                                                                                                                                                                                                                                                                                 |
| array                   | `minLength`、`maxLength`、`nonEmpty`、`empty`                                                                                                                                                                                                                                                                                                                                                |
| record                  | `minEntries`、`maxEntries`                                                                                                                                                                                                                                                                                                                                                                   |
| map / set / blob / file | `minSize`、`maxSize`、`size`                                                                                                                                                                                                                                                                                                                                                                 |

对于无法内省的约束（例如任意 `v.check()` 谓词），生成是尽力而为的。重试 20 次后仍不满足校验的候选值会原样返回。

## 确定性

- `create` 使用固定种子 `0`，输出确定。
- `mock` 使用调用方传入的 `seed`（默认 `1`）。
- 生成过程是同步的，按 schema 顺序消耗 faker 的随机序列。修改 schema 或 faker 版本可能改变生成值；在同一版本内，相同输入始终产生相同输出。
- `create`/`mock` 使用私有 faker 实例，不会改变应用使用的全局 faker seed。

## TypeScript

```ts
import * as v from 'valibot';
import type { DeepPartial } from '@jsdevlab/valibot';
import { create } from '@jsdevlab/valibot';

const schema = v.object({ name: v.string(), age: v.number() });

type User = v.InferOutput<typeof schema>; // { name: string; age: number }

const user: User = create(schema);

const patch: DeepPartial<User> = { name: 'Alice' };
create(schema, { defaults: patch });

// @ts-expect-error `age` 必须是 number
create(schema, { defaults: { age: 'old' } });
```

## 限制

- **自定义谓词无法内省。** `v.check()`、`v.custom()`、`v.function()` 无法被分析。请使用 `defaults`、自定义生成器或 `unhandled: 'skip'`。
- **不会应用变换。** 当 pipe 中包含 `v.trim()`、`v.toLowerCase()`、`v.transform()` 等变换时，生成并返回的是变换前的原始值。通过 `v.parse` 运行 schema 可得到变换后的结果。
- **不支持异步 schema。** `v.lazy(async ...)` 会抛错，异步 `v.check` 无法被同步校验循环满足。`v.promise()` 返回 `Promise.resolve(undefined)`，因为其内部值不可内省。
- **正则生成是尽力而为。** 使用 faker 的 `fromRegExp`，并把 `\d`/`\w`/`\s` 转换为字符类。Lookaround、交替（alternation）与 Unicode 属性转义可能无法复现；20 次尝试后会返回最后一个候选值。
- **小数 `multipleOf`**：无法被二进制精确表示的值（例如 `0.1`）即使数学上合法，也可能无法通过 JavaScript 的 `%` 校验。
- **唯一容器**（`record`/`map`/`set`）：当值 schema 只能产生一个不同值（例如 `v.literal('x')`）时，生成大小可能小于要求值。
- **`v.instance(Class)`** 会尝试 `new Class()`；构造函数需要参数时退化为 `Object.create(Class.prototype)`，依赖构造状态的实例方法可能不可用。
- **`v.brand()` 在 valibot 1.x 中是 action**，不是 schema 包装器。带 brand 的 pipe schema 会按其基础类型生成。

## 开发

```bash
pnpm install
pnpm build        # rslib：ESM + CJS + 类型声明
pnpm test         # 类型级测试 + 单元测试
pnpm test:types   # tsc --noEmit -p tsconfig.typetests.json
pnpm test:watch   # rstest --watch
pnpm coverage     # 覆盖率报告与阈值检查
pnpm check        # biome check（CI 模式）
pnpm check:fix    # biome check --write
pnpm format       # biome format --write
```

覆盖率阈值：statements 85%、lines 85%、functions 90%、branches 75%。

版本发布使用 [changesets](https://changesets.dev)。准备变更时运行 `pnpm changeset`；CI 通过 GitHub Actions 发布。

## 许可证

[MIT](./LICENSE.txt) © jsdevlab
