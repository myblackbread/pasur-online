/**
 * Базовая форма конверта в рантайме.
 */
export interface Envelope<TType extends string = string, TData = any> {
    readonly type: TType;
    readonly data: TData;
}

/**
 * Обобщенный конверт с произвольными данными.
 */
export type AnyEnvelope = Envelope<string, any>;

/**
 * Функция создания конверта с учетом опциональности data.
 */
export type ContractCreator<TType extends string, TData> = [TData] extends [void]
    ? () => Envelope<TType, void>
    : [undefined] extends [TData]
    ? (data?: TData) => Envelope<TType, TData>
    : (data: TData) => Envelope<TType, TData>;

/**
 * Дескриптор контракта.
 */
export interface Contract<TType extends string, TData> {
    readonly type: TType;
    readonly create: ContractCreator<TType, TData>;
    readonly match: (envelope: unknown) => envelope is Envelope<TType, TData>;
}

/* -------------------------------------------------------------------------- */
/*                               Хелперы типов                                */
/* -------------------------------------------------------------------------- */

/**
 * Извлекает готовый Envelope из переданного дескриптора Contract.
 */
export type InferEnvelope<TContract> = TContract extends Contract<infer TType, infer TData>
    ? Envelope<TType, TData>
    : never;

/**
 * Извлекает тип полезной нагрузки data из переданного дескриптора Contract.
 */
export type InferData<TContract> = TContract extends Contract<any, infer TData>
    ? TData
    : never;

/**
 * Извлекает литеральный тип type из переданного дескриптора Contract.
 */
export type InferType<TContract> = TContract extends Contract<infer TType, any>
    ? TType
    : never;