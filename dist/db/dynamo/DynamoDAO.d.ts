import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { ValidationError } from "class-validator/types/validation/ValidationError";
import { ServiceResponse } from "../../models";
export declare enum TransactionType {
    PUT = 0,
    UPDATE = 1,
    DELETE = 2,
    CONDITION_EXPRESSION = 3
}
export declare class TransactionItem {
    readonly queryInput: any;
    readonly type: TransactionType;
    constructor(queryInput: any, type: TransactionType);
}
export declare class EntityColumn {
    fullName: string;
    shortAliasName: string;
    private constructor();
    static create(fullName: string, shortAliasName: string): EntityColumn;
}
export declare class AccessPatternDefinition {
    readonly pk: string;
    readonly sk?: string;
    constructor(pk: string, sk?: string);
}
export declare class DynamoDBOptions {
    readonly tableName: string;
    region: string;
    endpoint: string;
    constructor(tableName: string);
    enableLocal(): void;
}
export declare enum DynamoAttributeType {
    STRING = 0,
    NUMBER = 1,
    DATE = 2
}
export declare class EntityAttribute {
    readonly type: DynamoAttributeType;
    readonly _columnName: string;
    readonly _columnAlias: string;
    _value: any;
    constructor(columnAlias: string, columnName: string, value?: any, type?: DynamoAttributeType);
    get columnName(): string;
    get columnAlias(): string;
    get value(): any;
    set value(v: any);
    validate(): Promise<ValidationError[]>;
}
export declare class EntityColumnDefinitions {
    static PK: EntityColumn;
    static SK: EntityColumn;
    static TYPE: EntityColumn;
    static CREATED_AT: EntityColumn;
    static UPDATED_AT: EntityColumn;
    static GSI1PK: EntityColumn;
    static GSI1SK: EntityColumn;
}
export declare abstract class Entity {
    private attributes;
    protected constructor();
    registerAttribute(entityColumns: EntityColumn, value?: any, useShortNameAsKey?: boolean): EntityAttribute;
    getAttributes(): Map<string, EntityAttribute>;
    getAttributeUsingShortName(shortName: string): EntityAttribute;
    getAttributeUsingFullname(fullName: string): EntityAttribute;
    getAttribute(entityColumn: EntityColumn, useAliasName?: boolean): EntityAttribute;
    setAttributeValue(entityColumn: EntityColumn, value: any, useAliasName?: boolean): void;
    getAttributeValue(entityColumn: EntityColumn, useAliasName?: boolean): string;
    protected formatDateValue(entityAttribute: EntityAttribute): any;
    getEntityAttribute(entityColumn: EntityColumn): EntityAttribute;
    static convert<E extends Entity, T extends Object>(E: any, serviceResponse: ServiceResponse, deleteKeyColumns?: boolean): Promise<ServiceResponse>;
    getPk(): EntityAttribute;
    getSk(): EntityAttribute;
    getType(): EntityAttribute;
    getCreatedAt(): EntityAttribute;
    getUpdatedAt(): EntityAttribute;
    getGSI1Pk(): EntityAttribute;
    getGSI1Sk(): EntityAttribute;
    getPkValue(): string;
    getSkValue(): string;
    getTypeValue(): string;
    getCreatedAtValue(): string;
    getUpdatedAtValue(): string;
    getGSI1pkValue(): string;
    getGSI1skValue(): string;
    static getFields(...entityColumns: EntityColumn[]): string[];
    setPk(value: string): void;
    setSk(value: string): void;
    setCreatedAt(date: Date): void;
    setUpdatedAt(date: Date): void;
    setType(type: string): void;
    setGSI1Pk(value: string): void;
    setGSI1Sk(value: string): void;
    /**
     * Throws a ValidationException when not valid containing the status code and validation errors.
     */
    isValid(obj: Entity): Promise<void>;
}
export declare enum QueryExpressionOperator {
    GT = ">",
    LT = "<",
    EQ = "=",
    GTE = ">=",
    LTE = "<=",
    BETWEEN = "between",
    BEGINS_WITH = "begins_with"
}
export declare abstract class DynamoExpression {
    comparator: QueryExpressionOperator;
    keyName?: string;
    value1: string;
    value2: string;
    constructor(keyName: string, operator: QueryExpressionOperator, value1: string);
    validate(): Promise<ValidationError[]>;
}
export declare class PartitionKeyExpression extends DynamoExpression {
}
export declare class SortKeyExpression extends DynamoExpression {
    value2: string;
    constructor(keyName: string, operator: QueryExpressionOperator, value1: string, value2?: string);
}
export declare class DynamoKeyPair {
    readonly keyName: string;
    readonly keyValue: string;
    constructor(keyName: string, keyValue: string);
}
export declare class AccessPattern {
    readonly partitionKeyExpression: PartitionKeyExpression;
    readonly sortKeyExpression?: SortKeyExpression;
    readonly indexName?: string;
    private constructor();
    static create(partitionKeyExpression: PartitionKeyExpression): AccessPattern;
    static create(partitionKeyExpression: PartitionKeyExpression, sortKeyExpression?: SortKeyExpression, indexName?: string): AccessPattern;
    static createUsingPk(partitionKeyExpression: PartitionKeyExpression, indexName?: string): AccessPattern;
}
export declare class QueryOptions {
    fields: any[];
    limit: number;
    sortAscending: boolean;
    nextPageToken?: string;
    constructor(fields?: any[], limit?: number, sortAscending?: boolean, nextPageToken?: string);
}
export declare enum DynamoIndex {
    GSI_SK = "GSIsk",
    GSI_PK1 = "GSI1pk"
}
/**
 * Used in all DAO implementations to save you the hassle of fetching data and creating data.
 * Global Secondary Indexes are created for sk and type.  Also handles pagination for GETs.
 * You can always access the document client (client) to customize any work you need to do.
 */
export declare abstract class DynamoDAO {
    private readonly dynamoDBOptions;
    static MAX_LIMIT: number;
    static DELIMITER: string;
    readonly client: DocumentClient;
    protected findByAccessPattern(accessPattern: AccessPattern, queryOptions?: QueryOptions): Promise<DocumentClient.QueryInput>;
    constructor(dynamoDBOptions: DynamoDBOptions);
    validate(): Promise<void>;
    protected buildKeyConditionExpression(queryInput: DocumentClient.QueryInput, expression: DynamoExpression, nextPageToken?: string): void;
    protected buildExpressionAttributes(queryInput: DocumentClient.QueryInput, expression: DynamoExpression, nextPageToken?: string): void;
    protected initQueryInput(queryInput: DocumentClient.QueryInput): void;
    protected buildQuery(expr: DynamoExpression, queryInput: DocumentClient.QueryInput, nextPageToken?: string): Promise<void>;
    protected buildExpression(accessPattern: AccessPattern, queryInput: DocumentClient.QueryInput, nextPageToken?: string): Promise<void>;
    protected hasResults(dynamoResult: ServiceResponse): boolean;
    protected handleException(err: any, message: string, code?: number): void;
    protected getDocumentClient(): DocumentClient;
    getOptions(): DynamoDBOptions;
    getTableName(): string;
    query(params: DocumentClient.QueryInput, accessPattern: AccessPattern): Promise<ServiceResponse>;
    protected nativeCreate(params: DocumentClient.PutItemInput): Promise<import("aws-sdk/lib/request").PromiseResult<DocumentClient.PutItemOutput, import("aws-sdk/lib/error").AWSError>>;
    protected nativeUpdate(params: DocumentClient.UpdateItemInput): Promise<DocumentClient.UpdateItemOutput>;
    protected nativeDelete(params: DocumentClient.DeleteItemInput): Promise<DocumentClient.DeleteItemOutput>;
    protected getCreateParams<T extends Entity>(obj: T, validate?: boolean, useSkInCondition?: boolean): Promise<DocumentClient.PutItemInput>;
    protected create<T extends Entity>(obj: T, validate?: boolean, useSkInCondition?: boolean): Promise<any>;
    protected update(pk: DynamoKeyPair, sk: DynamoKeyPair, items: EntityAttribute[], validate?: boolean): Promise<any>;
    protected delete(pk: DynamoKeyPair, sk: DynamoKeyPair): Promise<ServiceResponse>;
    aggregateIncrementCount(pk: DynamoKeyPair, sk: DynamoKeyPair, incrementingFieldName: string): Promise<DocumentClient.UpdateItemInput>;
    /**
     * Updates specific dynamo item attributes based on the items parameter assuming the pk exists.  You can pass in the
     * updated column definition yourself via the EntityAttrbiutes or let the function use the default core attribute value.
     *
     * @param pk
     * @param sk
     * @param items
     * @param validate
     * @param type Uses SET at this time, other types are not supported yet but plan to be later on
     */
    protected getUpdateParams(pk: DynamoKeyPair, sk: DynamoKeyPair, items: EntityAttribute[], validate?: boolean, type?: string): Promise<DocumentClient.UpdateItemInput>;
    /**
     * Delete a specific dynamo item.
     *
     * @param pk
     * @param sk
     */
    protected getDeleteParams(pk: DynamoKeyPair, sk: DynamoKeyPair): Promise<DocumentClient.DeleteItemInput>;
    transaction(transactionItems: TransactionItem[]): Promise<DocumentClient.TransactWriteItemsOutput>;
    protected mapResponse(dynamoResult: DocumentClient.QueryOutput, accessPattern: AccessPattern): ServiceResponse;
    protected mapProjectionExpressions(queryData: DocumentClient.QueryInput, fields?: string[]): Promise<void>;
    protected static getLimit(limit: number): number;
    protected getTemplate(limit?: number, sortAscending?: boolean): DocumentClient.QueryInput;
    protected findByPrimaryKey(pk: string, entityType: string, queryOptions?: QueryOptions): Promise<DocumentClient.QueryInput>;
    static createKey(...params: string[]): string;
    static parseKey(key: string): string[];
}
