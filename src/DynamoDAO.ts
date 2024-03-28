// Transformation of DocumentClient named import from deep path is unsupported in aws-sdk-js-codemod.
// Please convert to a default import, and re-run aws-sdk-js-codemod.
// Transformation of DocumentClient named import from deep path is unsupported in aws-sdk-js-codemod.
// Please convert to a default import, and re-run aws-sdk-js-codemod.
import logger from "./logger";
import {DAOException} from "./DAOException";
import {isDate, isEmail, isNotEmpty, IsNotEmpty, validate, ValidateIf} from "class-validator";
import {AuthException, NotFoundException, DynamoServiceResponse, ValidationException} from "./models";
import * as Assert from "assert";
import {
    AttributeValue,
    BatchGetItemInput,
    BatchGetItemOutput,
    DeleteItemInput,
    DeleteItemOutput,
    DynamoDB,
    PutItemInput,
    QueryInput,
    QueryOutput,
    TransactWriteItemsInput,
    TransactWriteItemsOutput,
    UpdateItemInput,
    UpdateItemOutput,
} from '@aws-sdk/client-dynamodb';
import assert = require("assert");

export enum TransactionType {
    PUT, UPDATE, DELETE, CONDITION_EXPRESSION
}

export class TransactionItem {
    constructor(public readonly queryInput: any,
                public readonly type: TransactionType) {}
}

export class EntityColumn {
    fullName: string;
    shortAliasName: string;
    type: DynamoAttributeType;
    validationRule: EntityValidation;

    private constructor() {}

    public static create(fullName: string,
                         shortAliasName: string,
                         type: DynamoAttributeType = DynamoAttributeType.STRING,
                         validationRule?: EntityValidation) {
        const entityColumn = new EntityColumn();
        if (!isNotEmpty(fullName) && !isNotEmpty(shortAliasName)) {
            throw new ValidationException("Failed Validation", "Full name and Short Alias name are required fields");
        }
        entityColumn.fullName = fullName;
        entityColumn.shortAliasName = shortAliasName;
        entityColumn.type = type;
        entityColumn.validationRule = validationRule;

        return entityColumn;
    }
}

export class AccessPatternDefinition {
    pk: string;
    sk: string;
    lsi: Record<string, string>;
    indexName?: string;

    constructor(pk: string, sk?: string, indexName?: string);
    constructor(pk: string, sk?: Record<string, string>, indexName?: string);
    constructor(pk: string, sk?: string | Record<string, string>, indexName?: string) {
        this.pk = pk;
        if (typeof sk === "object") {
            this.lsi = sk;
        } else if (typeof sk === "string") {
            this.sk = sk;
        }
        this.indexName = indexName;
    }
}


export class DynamoDBOptions {
    public readonly tableName: string;

    public endpoint: string;

    constructor(tableName: string) {
        assert.ok(tableName);

        this.tableName = tableName;
    }

    enableLocal(host: string = "localhost", port: number = 8000) {
        console.log(`Using port ${port} for host ${host}`);
        this.endpoint = `http://${host}:${port}`;
        console.log(`Endpoint is set as ${this.endpoint}`);
    }
}

export enum DynamoAttributeType {
    STRING= "S",
    NUMBER = "N",
    DATE = "D",
    BINARY = "B",
    STRING_SET = "SS",
    NUMBER_SET = "NS",
    BINARY_SET = "BS",
    MAP = "M",
    LIST = "L",
    NULL = "Null",
    BOOLEAN = "Boolean"
}

export class EntityAttribute {
    @IsNotEmpty()
    public readonly entityColumn: EntityColumn;

    @IsNotEmpty()
    public _value: any;

    constructor(entityColumn: EntityColumn, value?: any) {
        Assert.ok(entityColumn, "Entity Column is a required field");

        this.entityColumn = entityColumn;
        this._value = value;
    }

    get columnName() {
        return this.entityColumn.fullName;
    }

    get columnAlias() {
        return this.entityColumn.shortAliasName;
    }

    get value() {
        return this._value;
    }

    set value(v: any) {
        this._value = v;
    }

    getType() {
        return this.entityColumn.type;
    }

    getValidationRule() {
        return this.entityColumn.validationRule;
    }

    isValid(): EntityValidation {
        if (this.getValidationRule()) {
            if (!this.getValidationRule().isValid(this.value)) {
                return this.getValidationRule();
            }
        }
    }

    // async validate(): Promise<ValidationError[]> {
    //     return validate(this);
    // }
}

export interface EntityValidation {
    isValid(value: string): boolean;
    getMessage(): string;
}

export const isRequired = (key: string): EntityValidation => {
    return {
        getMessage(): string {
            return `${key} is required`;
        },

        isValid(value: string): boolean {
            return isNotEmpty(value);
        }
    }
}

export const isValidEmail = (key: string): EntityValidation => {
    return {
        getMessage(): string {
            return `${key} is required and must be a valid email address`;
        },

        isValid(value: string): boolean {
            return isNotEmpty(value) && isEmail(value);
        }
    }
}

export const isValidDate = (key: string): EntityValidation => {
    return {
        getMessage(): string {
            return `${key} is required and must be a valid Date`;
        },

        isValid(value: string): boolean {
            return isNotEmpty(value) && isDate(value);
        }
    }
}

export interface ValidationError {
    message: string;
    fieldName: string;
}

export class EntityColumnDefinitions {
    public static PK = EntityColumn.create("pk", "pk", DynamoAttributeType.STRING, isRequired("pk"));
    public static SK = EntityColumn.create("sk", "sk", DynamoAttributeType.STRING, isRequired("sk"));
    public static TYPE = EntityColumn.create("type", "typ", DynamoAttributeType.STRING);
    public static CREATED_AT = EntityColumn.create("createdAt", "cadt", DynamoAttributeType.STRING);
    public static UPDATED_AT = EntityColumn.create("updatedAt", "uadt", DynamoAttributeType.STRING);
    public static GSI1PK = EntityColumn.create("GSI1pk", "GSI1pk");
    public static GSI1SK = EntityColumn.create("GSI1sk", "GSI1sk");
}

export abstract class Entity {
    private attributes: Map<string, EntityAttribute> = new Map();

    protected constructor() {
        const now = new Date();
        this.registerAttribute(EntityColumnDefinitions.TYPE);
        this.registerAttribute(EntityColumnDefinitions.PK);
        this.registerAttribute(EntityColumnDefinitions.SK);
        this.registerAttribute(EntityColumnDefinitions.CREATED_AT, now);
        this.registerAttribute(EntityColumnDefinitions.UPDATED_AT, now);
        this.registerAttribute(EntityColumnDefinitions.GSI1PK);
        this.registerAttribute(EntityColumnDefinitions.GSI1SK);
    }

    public registerAttribute(entityColumn: EntityColumn, value?: any, useShortNameAsKey: boolean = true): EntityAttribute {
        const entityAttribute: EntityAttribute = new EntityAttribute(entityColumn,value);
        if (useShortNameAsKey) {
            this.attributes.set(entityColumn.shortAliasName, entityAttribute);
        } else {
            this.attributes.set(entityColumn.fullName, entityAttribute);
        }
        return entityAttribute;
    }

    public getAttributes(): Map<string, EntityAttribute> {
        return this.attributes;
    }

    public getAttributeUsingShortName(shortName: string): EntityAttribute {
        return this.attributes.get(shortName);
    }

    public getAttributeUsingFullname(fullName: string): EntityAttribute {
        return this.attributes.get(fullName);
    }

    public getAttribute(entityColumn: EntityColumn, useAliasName: boolean = true) {
        return this.getAttributes().get(useAliasName ? entityColumn.shortAliasName : entityColumn.fullName);
    }

    public setAttributeValue(entityColumn: EntityColumn, value: any, useAliasName: boolean = true) {
        let attribute = this.getAttribute(entityColumn, useAliasName);
        attribute._value = value;
    }

    public getAttributeValue(entityColumn: EntityColumn, useAliasName: boolean = true): string {
        let result: any = this.getAttribute(entityColumn, useAliasName);
        if (result) {
            result = result.value;
        }

        return result;
    }

    protected formatDateValue(entityAttribute: EntityAttribute) {
        if (entityAttribute.value instanceof Date) {
            return (<Date>entityAttribute.value).toISOString();
        } else {
            return entityAttribute.value;
        }
    }

    public getEntityAttribute(entityColumn: EntityColumn): EntityAttribute {
        return this.getAttributes().get(entityColumn.fullName);
    }

    static processMap(mapElement: any): Promise<any> {
        let result: any = {};
        const keys = Object.keys(mapElement);
        let typeKey: any;
        for (let key of keys) {
            typeKey = Object.keys(mapElement[key])[0];
            result[key] = mapElement[key][typeKey];
        }

        return result;
    }

    static async convert(E: any, serviceResponse: DynamoServiceResponse,
                  deleteKeyColumns = true,
                  onRecord?: any,
                  assignDefaultOnNulls: boolean = true): Promise<DynamoServiceResponse> {
        let converted: DynamoServiceResponse;
        const entity = new E;
        let items = serviceResponse.getData().map(data => {
            let t = Object.create({});
            const keys = Object.keys(data);
            keys.map(key => {
                const entityAttribute: EntityAttribute = entity.getAttributeUsingShortName(key);

                if (entityAttribute) {
                    t[entityAttribute.columnName] = data[key]["S"];
                    if (entityAttribute.getType() === DynamoAttributeType.NUMBER) {
                        if (assignDefaultOnNulls && !data[key]) {
                            t[entityAttribute.columnName] = 0;  // default for numbers
                        } else {
                            t[entityAttribute.columnName] = data[key]["N"];  // default for numbers
                        }
                    }
                    if (entityAttribute.getType() === DynamoAttributeType.MAP) {
                        try {
                            t[entityAttribute.columnName] = Entity.processMap(data[key]["M"]);
                            // t[entityAttribute.columnName] = data[key]["M"];
                        } catch (err) {
                            // leave the default if we can't parse the Map
                        }
                    }

                    if (deleteKeyColumns) {
                        if (entityAttribute.columnAlias === EntityColumnDefinitions.PK.shortAliasName ||
                            entityAttribute.columnAlias === EntityColumnDefinitions.SK.shortAliasName ||
                            entityAttribute.columnAlias === EntityColumnDefinitions.GSI1PK.shortAliasName ||
                            entityAttribute.columnAlias === EntityColumnDefinitions.GSI1SK.shortAliasName
                            // entityAttribute.columnAlias === EntityColumnDefinitions.TYPE.shortAliasName
                        )
                            delete t[entityAttribute.columnName];
                    }
                } else {
                    logger.error(`Could not locate attribute on Entity using key ${key}`);
                }
            });

            return t;
        });

        // Determine if a filter is applied
        if (items) {
            items = items.filter(i => {
                if (onRecord) {
                    return onRecord(i);
                } else {
                    return i;
                }
            })
        }

        if (items) {
            converted = DynamoServiceResponse.createSuccess(items,serviceResponse.nextToken);
        } else {
            converted = DynamoServiceResponse.createEmpty();
        }
        return converted;
    }

    // Entity Attribute Getters
    public getPk(): EntityAttribute {
        return this.getAttribute(EntityColumnDefinitions.PK);
    }

    public getSk(): EntityAttribute {
        return this.getAttribute(EntityColumnDefinitions.SK);
    }

    public getType(): EntityAttribute {
        return this.getAttribute(EntityColumnDefinitions.TYPE);
    }

    public getCreatedAt(): EntityAttribute {
        return this.getAttribute(EntityColumnDefinitions.CREATED_AT);
    }

    public getUpdatedAt(): EntityAttribute {
        return this.getAttribute(EntityColumnDefinitions.UPDATED_AT);
    }

    public getGSI1Pk(): EntityAttribute {
        return this.getAttribute(EntityColumnDefinitions.GSI1PK);
    }

    public getGSI1Sk(): EntityAttribute {
        return this.getAttribute(EntityColumnDefinitions.GSI1SK);
    }

    // Quick functions to return the values of Entity Attributes
    public getPkValue(): string {
        return this.getPk().value;
    }

    public getSkValue(): string {
        return this.getSk().value;
    }

    public getTypeValue(): string {
        return this.getType().value;
    }

    public getCreatedAtValue(): string {
        let entityAttribute = this.getCreatedAt();
        return this.formatDateValue(entityAttribute);
    }

    public getUpdatedAtValue(): string {
        let entityAttribute = this.getUpdatedAt();
        return this.formatDateValue(entityAttribute);
    }

    public getGSI1pkValue(): string {
        return this.getGSI1Pk().value;
    }

    public getGSI1skValue(): string {
        return this.getGSI1Sk().value;
    }

    public static getFields(...entityColumns: EntityColumn[]): string[] {
        return entityColumns.map(entityColumn => entityColumn.shortAliasName);
    }

    // SETTERs
    public setPk(value: string) {
        this.getPk().value = value;
    }

    public setSk(value: string) {
        this.getSk().value = value;
    }

    public setCreatedAt(date: Date) {
        this.getCreatedAt().value = date.toISOString();
    }

    public setUpdatedAt(date: Date) {
        this.getUpdatedAt().value = date.toISOString();
    }

    public setType(type: string) {
        this.getType().value = type;
    }

    public setGSI1Pk(value: string) {
        this.getGSI1Pk().value = value;
    }

    public setGSI1Sk(value: string) {
        this.getGSI1Sk().value = value;
    }

    /**
     * Throws a ValidationException when not valid containing the status code and validation errors.
     */
    async validate(): Promise<void> {
        let isValid: boolean = false;
        const errors: ValidationError[] = [];
        this.getAttributes().forEach( (ea: EntityAttribute) => {
            if (ea.getValidationRule()) {
                if (!ea.getValidationRule().isValid(ea.value)) {
                    errors.push({
                        message: ea.getValidationRule().getMessage(),
                        fieldName: ea.columnName
                    });
                }
            }
        })
        if (errors.length > 0) {
            throw new ValidationException("Failed Validation", errors);
        }
    }

    protected setCoreDefaults(accessPatternDefinition: AccessPatternDefinition, type: string, callback?: Function) {
        Assert.ok(accessPatternDefinition !== null, "accessPatternDefinition is required");
        const now = new Date();
        this.getAttribute(EntityColumnDefinitions.PK).value = accessPatternDefinition.pk;
        if (typeof accessPatternDefinition.sk === "object") {
            logger.warn("Your sort key is defined as an object, make sure you register and set the appropriate LSI value");
        } else {
            this.getAttribute(EntityColumnDefinitions.SK).value = accessPatternDefinition.sk;
        }
        this.getAttribute(EntityColumnDefinitions.CREATED_AT).value = now.toISOString();
        this.getAttribute(EntityColumnDefinitions.UPDATED_AT).value = now.toISOString();
        this.getAttribute(EntityColumnDefinitions.TYPE).value = type;

        if (callback) {
            callback(now, type);
        }
    }

}

export enum QueryExpressionOperator {
    GT = ">",
    LT = "<",
    EQ = "=",
    GTE = ">=",
    LTE = "<=",
    BETWEEN = "between",
    BEGINS_WITH = "begins_with"
}

export abstract class DynamoExpression {
    @IsNotEmpty()
    public comparator: QueryExpressionOperator;   // begins_with, between etc

    @IsNotEmpty()
    public keyName?: string;

    @IsNotEmpty()
    public value1: string;

    @ValidateIf(o => o.comparator.toLowerCase() === 'between')
    @IsNotEmpty({message: "value2 is required when using the between operator"})
    public value2: string;

    constructor(keyName: string, operator: QueryExpressionOperator, value1: string) {
        this.comparator = operator;
        this.keyName = keyName;
        this.value1 = value1;
    }

    public validate() {
        return validate(this);
    }
}

export class PartitionKeyExpression extends DynamoExpression {}

export class SortKeyExpression extends DynamoExpression {
    value2: string;

    constructor(keyName: string, operator: QueryExpressionOperator, value1: string, value2?: string) {
        super(keyName, operator, value1);
        this.value2 = value2;
    }
}

export class DynamoKeyPair {

    constructor(public readonly keyName: string, public readonly keyValue: string) {}

}

export class AccessPattern {
    private constructor(public readonly partitionKeyExpression: PartitionKeyExpression,
                public readonly sortKeyExpression?: SortKeyExpression,
                public readonly indexName?: string) {
    }

    static create(partitionKeyExpression: PartitionKeyExpression): AccessPattern;
    static create(partitionKeyExpression: PartitionKeyExpression,
                  sortKeyExpression?: SortKeyExpression,
                  indexName? : string): AccessPattern;

    static create(partitionKeyExpression: PartitionKeyExpression,
                  sortKeyExpression?: SortKeyExpression,
                  indexName? : string):AccessPattern {
        return new AccessPattern(partitionKeyExpression, sortKeyExpression, indexName);
    }

    static createUsingPk(partitionKeyExpression: PartitionKeyExpression,
                  indexName? : string):AccessPattern {
        return new AccessPattern(partitionKeyExpression, undefined, indexName);
    }

}

export class QueryOptions {
    
    private nextPageToken: string;
    
    constructor(public fields: any[] = [], public limit: number = 100, public sortAscending: boolean = true, nextPageToken?: string) {
        this.fields = fields;
        this.limit = limit;
        this.sortAscending = sortAscending;
        if (nextPageToken) {
            this.setNextPageToken(nextPageToken);
        }
    }

    getNextPageToken() {
        return this.nextPageToken;
    }

    setNextPageToken(nextToken: string) {
        this.nextPageToken = Buffer.from(nextToken, 'base64').toString('utf8');
    }
}

export enum DynamoIndex {
    GSI_SK = "GSIsk",
    GSI_PK1 = "GSI1pk"
}

/**
 * Used in all DAO implementations to save you the hassle of fetching data and creating data.
 * Global Secondary Indexes are created for sk and type.  Also handles pagination for GETs.
 * You can always access the document client (client) to customize any work you need to do.
 */
export abstract class DynamoDAO {

    public static MAX_LIMIT: number =
        process.env.DYNAMO_MAX_LIMIT_RESULT &&
        !isNaN(Number(process.env.DYNAMO_MAX_LIMIT_RESULT)) ? Number(process.env.DYNAMO_MAX_LIMIT_RESULT) : 100;

    public static DELIMITER: string = "#";

    public readonly client: DynamoDB;

    public constructor(protected readonly dynamoDBOptions: DynamoDBOptions) {
        assert.ok(dynamoDBOptions);
        this.client = new DynamoDB(dynamoDBOptions);
    }

    protected async findByAccessPattern(accessPattern: AccessPattern,
                                        queryOptions: QueryOptions = new QueryOptions()): Promise<QueryInput> {
        const queryData: QueryInput = {
            ...this.getQueryInputTemplate(queryOptions.limit, queryOptions.sortAscending)
        };

        if (accessPattern.indexName) {
            queryData.IndexName = accessPattern.indexName;
        }

        await this.buildExpression(accessPattern, queryData, queryOptions.getNextPageToken());
        await this.mapProjectionExpressions(queryData, queryOptions.fields);
        return queryData;
    }

    public async getTableMetaData() {
        try {
            const checkDb = new DynamoDB();
            return await checkDb.describeTable({
                TableName: this.dynamoDBOptions.tableName
            });
        } catch (err) {
            throw new NotFoundException("Table error or it does not exist", 500);
        }
    }

    public async tableExists(): Promise<boolean> {
        await this.getTableMetaData();
        return true;
    }

    protected buildKeyConditionExpression(queryInput: QueryInput, expression: DynamoExpression, nextPageToken?: string) {
        if (queryInput.KeyConditionExpression) {
            queryInput.KeyConditionExpression += " and ";
        } else {
            queryInput.KeyConditionExpression = "";
        }

        const nextTokenOperator = queryInput.ScanIndexForward ? QueryExpressionOperator.GT : QueryExpressionOperator.LT;
        if (expression instanceof SortKeyExpression && nextPageToken) {
            queryInput.KeyConditionExpression += ` #${expression.keyName} ${nextTokenOperator} :token `;
        } else {
            if (expression.comparator === QueryExpressionOperator.BEGINS_WITH) {
                queryInput.KeyConditionExpression += (expression.comparator + " (#" + expression.keyName) + ", :" + expression.keyName + ") ";
            } else if (expression.comparator === QueryExpressionOperator.BETWEEN) {
                queryInput.KeyConditionExpression += " #" + expression.keyName + " " + expression.comparator + " :" + expression.keyName + "1 " + " and :" + expression.keyName + "2";
            } else {
                queryInput.KeyConditionExpression += "#" + expression.keyName + " " + expression.comparator + " :" + expression.keyName;
            }
        }
    }

    protected buildExpressionAttributes(queryInput: QueryInput, expression: DynamoExpression, nextPageToken?: string) {
        queryInput.ExpressionAttributeNames["#" + expression.keyName] = expression.keyName;

        if (expression instanceof SortKeyExpression && nextPageToken) {
            queryInput.ExpressionAttributeValues[":token"] = <AttributeValue>{};
            queryInput.ExpressionAttributeValues[":token"].S = nextPageToken;
        } else {
            if (expression.comparator.toLowerCase() === QueryExpressionOperator.BETWEEN) {
                queryInput.ExpressionAttributeValues[":" + expression.keyName + "1"] = <AttributeValue>{};
                queryInput.ExpressionAttributeValues[":" + expression.keyName + "1"].S = expression.value1;
                queryInput.ExpressionAttributeValues[":" + expression.keyName + "2"] = <AttributeValue>{};
                queryInput.ExpressionAttributeValues[":" + expression.keyName + "2"].S = expression.value2;
            } else {
                queryInput.ExpressionAttributeValues[":" + expression.keyName] = <AttributeValue>{};
                queryInput.ExpressionAttributeValues[":" + expression.keyName].S = expression.value1;
            }
        }
    }

    protected initQueryInput(queryInput: QueryInput) {
        if (!queryInput.ExpressionAttributeValues) {
            queryInput.ExpressionAttributeValues = {};
        }
        if (!queryInput.ExpressionAttributeNames) {
            queryInput.ExpressionAttributeNames = {};
        }
    }

    protected async buildQuery(expr: DynamoExpression,
                               queryInput: QueryInput,
                               nextPageToken?: string) {
        let errors = await expr.validate();
        if (errors.length > 0) {
            throw new ValidationException("DynamoExpression Failed Validation", errors, 400);
        }
        this.buildKeyConditionExpression(queryInput, expr, nextPageToken);
        this.buildExpressionAttributes(queryInput, expr, nextPageToken);
    }

    protected async buildExpression(accessPattern: AccessPattern, queryInput: QueryInput, nextPageToken?: string) {
        if (!accessPattern) {
            return;
        }
        // Add the custom expressions
        this.initQueryInput(queryInput);
        await this.buildQuery(accessPattern.partitionKeyExpression, queryInput, nextPageToken);
        if (accessPattern.sortKeyExpression) {
            await this.buildQuery(accessPattern.sortKeyExpression, queryInput, nextPageToken);
        }
    }

    public async updateCount(pk: DynamoKeyPair, sk: DynamoKeyPair, incrementingFieldName: string, incrementing = true) {
        const template = incrementing ?
            await this.aggregateIncrementCount(pk, sk, incrementingFieldName)
            :
            await this.aggregateDecrementCount(pk, sk, incrementingFieldName);
        return this.nativeUpdate(template);
    }

    protected hasResults(dynamoResult: DynamoServiceResponse): boolean {
        let result: boolean = false;
        if (dynamoResult && dynamoResult.getData() && dynamoResult.getData().length > 0) {
            logger.info(`DB results were found. Size ${dynamoResult.getData().length}`);
            result = true;
        } else {
            logger.warn("::DynamoDB => hasResults: false");
        }

        return result;
    }

    protected handleException(err: any, message: string, code?: number) {
        logger.error("::Failed => handleException", err);
        if (err instanceof AuthException) {
            logger.error("::Failed => AuthError", err);
            throw err;
        } else if (err instanceof ValidationException) {
            logger.error("::Failed Validation", err);
            throw err;
        } else if (err instanceof NotFoundException) {
            logger.error("::Resource Not Found", err);
            throw err;
        } else {
            logger.error("::Failed => DAO Exception", err);
            throw new DAOException(message, 500, err);
        }
    }

    protected getDocumentClient(): DynamoDB {
        return this.client;
    }

    public getOptions() {
        return this.dynamoDBOptions;
    }

    public getTableName() {
        return this.dynamoDBOptions.tableName;
    }

    protected async query(params: QueryInput, accessPattern: AccessPattern): Promise<DynamoServiceResponse> {
        let results;
        try {
            logger.info(params);
            results = await this.getDocumentClient()
                .query(params);
            logger.info(results, "Returned Query Data");
        } catch (err) {
            logger.error({ err }, "Failed Query!");
            logger.error({params}, "Error in Dynamo Query");
            if (err.code === "ResourceNotFoundException") {
                throw new NotFoundException("Resource Not Found", 404);
            }
            throw err;
        }

        return this.mapResponse(results, accessPattern);
    }

    /************************************************  NATIVE QUERIES ************************************************/

    protected async nativeCreate(params: PutItemInput) {
        const result = this.getDocumentClient().putItem(params);
        logger.info("Item inserted",result);
        return result;
    }

    protected async nativeUpdate(params: UpdateItemInput): Promise<UpdateItemOutput> {
        const result: UpdateItemOutput = await this.getDocumentClient().updateItem(params);
        logger.info("Item Updated",result);
        return result;
    }

    protected async nativeDelete(params: DeleteItemInput): Promise<DeleteItemOutput> {
        const result: DeleteItemOutput = await this.getDocumentClient().deleteItem(params);
        logger.info("Item Delete",result);
        return result;
    }



    /************************************************  QUERY TEMPLATES ************************************************/
    protected convertToMapType(element: EntityAttribute) {
        let result: any = {"M" : {}};
        const keys = Object.keys(element.value);
        for (let key of keys) {
            result["M"][key] = {
                "S" : element.value[key]
            }
        }
        return result;
    }
    /**
     * Returns a Dynamo Template you can use to perform a Put.  You can update the template with your own custom code
     * after you get the template.
     *
     * @param obj
     * @protected
     * @returns Promise<DocumentClient.PutItemInput>
     */
    protected async getCreateTemplate<T extends Entity>(obj: T): Promise<PutItemInput> {
        await obj.validate();
        const now = new Date().toISOString();
        let newItem: any = {};

        obj.getAttributes().forEach((attr) => {
            if (attr.columnAlias === EntityColumnDefinitions.TYPE.shortAliasName) {
                attr.value = attr.value;
            } else if (attr.columnAlias === EntityColumnDefinitions.CREATED_AT.shortAliasName ||
                attr.columnAlias === EntityColumnDefinitions.UPDATED_AT.shortAliasName) {
                if (!attr.value) {
                    attr.value = attr.value.toISOString();
                } else if (attr.value instanceof Date) {
                    attr.value = attr.value.toISOString();
                }
            } else if (attr.columnAlias === EntityColumnDefinitions.PK.shortAliasName || attr.columnAlias === EntityColumnDefinitions.SK.shortAliasName) {
                attr.value = attr.value;
            }
            if (attr.value instanceof Date) {
                newItem[attr.columnAlias] = {
                    [attr.getType()] : attr.value.toISOString()
                };
            } else if (attr.entityColumn?.type === "M") {
                newItem[attr.columnAlias] = this.convertToMapType(attr);
            } else {
                newItem[attr.columnAlias] = {
                    [attr.getType()] : attr.value
                };
            }
        });

        return {
            TableName: this.getTableName(),
            Item: newItem,
            ConditionExpression: ` attribute_not_exists(#${EntityColumnDefinitions.PK.shortAliasName})`,
            ExpressionAttributeNames: {
                ["#" + obj.getPk().columnAlias]: obj.getPk().columnAlias,
            }
        }
    }

    /**
     * Updates specific dynamo item attributes based on the items parameter assuming the pk exists.  You can pass in the
     * updated column definition yourself via the EntityAttrbiutes or let the function use the default core attribute value.
     *
     * @param pk
     * @param sk
     * @param items
     * @param type Uses SET at this time, other types are not supported yet but plan to be later on
     */
    protected async getUpdateTemplate(
        pk: DynamoKeyPair,
        sk: DynamoKeyPair,
        items: EntityAttribute[]): Promise<UpdateItemInput> {

        const now = new Date().toISOString();
        let updateExpression: string[] = [];
        let expressionAttributeNames: any = {
            ["#"+pk.keyName] : pk.keyName,
            ["#"+sk.keyName] : sk.keyName
        };
        let expressionAttributeValues: any = {};

        items.forEach((attr) => {
            if (attr.getType() === DynamoAttributeType.DATE || attr.value instanceof Date) {
                if (!attr.value) {
                    attr.value = now;
                } else {
                    attr.value = attr.value.toISOString();
                }
            }
            updateExpression.push(` #${attr.columnAlias} = :${attr.columnAlias} `);
            expressionAttributeNames[`#${attr.columnAlias}`] = attr.columnAlias;
            expressionAttributeValues[`:${attr.columnAlias}`] = { "S" : attr.value };
        })

        const hasUpdatedDefinition:EntityAttribute = items.find(item => item.columnAlias === EntityColumnDefinitions.UPDATED_AT.shortAliasName);
        if (!hasUpdatedDefinition) {
            const now = new Date().toISOString();
            updateExpression.push(` #${EntityColumnDefinitions.UPDATED_AT.shortAliasName} = :${EntityColumnDefinitions.UPDATED_AT.shortAliasName} `);
            expressionAttributeNames[`#${EntityColumnDefinitions.UPDATED_AT.shortAliasName}`] = EntityColumnDefinitions.UPDATED_AT.shortAliasName;
            expressionAttributeValues[`:${EntityColumnDefinitions.UPDATED_AT.shortAliasName}`] = { "S" : now };
        }

        let conditionExpr: string = ` attribute_exists(#${pk.keyName}) and attribute_exists(#${sk.keyName}) `;

        return {
            Key: {
                [pk.keyName] : { S: pk.keyValue },
                [sk.keyName] : { S: sk.keyValue }
            },
            TableName: this.getTableName(),
            ReturnConsumedCapacity: "TOTAL",
            UpdateExpression: " SET " + updateExpression.join(", "),
            ConditionExpression: conditionExpr,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames
        }
    }

    // protected async getCreateParams<T extends Entity>(obj: T, validate: boolean = true, useSkInCondition?: boolean): Promise<DocumentClient.PutItemInput> {
    //     if (validate) {
    //         await obj.validate();
    //     }
    //
    //     const now = new Date().toISOString();
    //
    //     let newItem: any = {};
    //
    //     // Assign values to the "system/core" attributes
    //     obj.getAttributes().forEach((attr) => {
    //         if (attr.columnAlias === EntityColumnDefinitions.TYPE.shortAliasName) {
    //             attr.value = attr.value;
    //         } else if (attr.columnAlias === EntityColumnDefinitions.CREATED_AT.shortAliasName ||
    //             attr.columnAlias === EntityColumnDefinitions.UPDATED_AT.shortAliasName) {
    //             if (!attr.value) {
    //                 attr.value = now;
    //             } else if (attr.value instanceof Date) {
    //                 attr.value = attr.value.toISOString();
    //             }
    //         } else if (attr.columnAlias === EntityColumnDefinitions.PK.shortAliasName || attr.columnAlias === EntityColumnDefinitions.SK.shortAliasName) {
    //             attr.value = attr.value;
    //         }
    //         if (attr.value instanceof Date) {
    //             newItem[attr.columnAlias] = attr.value.toISOString();
    //         } else {
    //             newItem[attr.columnAlias] = attr.value;
    //         }
    //     });
    //
    //     const itemInput: DocumentClient.PutItemInput = {
    //         TableName: this.getTableName(),
    //         Item: newItem,
    //         ConditionExpression: "attribute_not_exists(#pk)",
    //         ExpressionAttributeNames: {
    //             ["#" + obj.getPk().columnAlias]: obj.getPk().value,
    //         }
    //     }
    //
    //     // Add the SK fields if necessary
    //     if (useSkInCondition) {
    //         itemInput.ConditionExpression += " and attribute_not_exists(#" + obj.getSk().columnAlias + ")";
    //         itemInput.ExpressionAttributeNames["#" + obj.getSk().columnAlias] = obj.getSk().value;
    //     }
    //     return itemInput;
    // }

    protected async create<T extends Entity>(obj: T, validate: boolean = true, useSkInCondition?: boolean): Promise<any> {
        const itemInput:PutItemInput = await this.getCreateTemplate(obj);
        return this.nativeCreate(itemInput);
    }

    protected async update(pk: DynamoKeyPair,
                           sk: DynamoKeyPair,
                           items: EntityAttribute[]): Promise<any> {
        const itemInput:UpdateItemInput = await this.getUpdateTemplate(pk, sk, items);
        return this.nativeUpdate(itemInput);
    }

    protected async delete(pk: DynamoKeyPair,
                           sk: DynamoKeyPair): Promise<DynamoServiceResponse> {
        const serviceResponse: DynamoServiceResponse = new DynamoServiceResponse();
        const itemInput:DeleteItemInput = await this.getDeleteParams(pk, sk);
        let deleteItemOutput = await this.nativeDelete(itemInput);
        if (!deleteItemOutput.Attributes) {
            serviceResponse.statusCode = 404;
            serviceResponse.message = `Not found ${pk} / ${sk}`;
        } else {
            serviceResponse.statusCode = 200;
            serviceResponse.message = JSON.stringify(deleteItemOutput.Attributes);
        }
        logger.info("Delete Complete", deleteItemOutput.ConsumedCapacity);

        return serviceResponse;
    }

    protected async incDecCount(pk: DynamoKeyPair,
                      sk: DynamoKeyPair,
                      fieldName: string,
                      isIncrement: boolean = true) {
        const itemInput: UpdateItemInput = {
            Key: {
                [pk.keyName]: { S: pk.keyValue },
                [sk.keyName]: { S: sk.keyValue }
            },
            ConditionExpression: `attribute_exists(#${pk.keyName})`,
            TableName: this.getTableName(),
            ExpressionAttributeNames: {
                ["#" + fieldName]: fieldName,
                ["#" + pk.keyName]: pk.keyName
            },
            UpdateExpression: `SET #${fieldName} = #${fieldName} ${isIncrement ? "+" : "-"} :inc`,
            ExpressionAttributeValues: {
                ":inc": { N: "1" }
            }
        }

        return itemInput;
    }

    async aggregateIncrementCount(pk: DynamoKeyPair,
                                  sk: DynamoKeyPair,
                                  incrementingFieldName: string) {
        return this.incDecCount(pk, sk, incrementingFieldName);
    }

    async aggregateDecrementCount(pk: DynamoKeyPair,
                                  sk: DynamoKeyPair,
                                  decrementingFieldName: string) {
        return this.incDecCount(pk, sk, decrementingFieldName, false);
    }

    /**
     * Updates specific dynamo item attributes based on the items parameter assuming the pk exists.  You can pass in the
     * updated column definition yourself via the EntityAttrbiutes or let the function use the default core attribute value.
     *
     * @param pk
     * @param sk
     * @param items
     * @param validate
     * @param type Uses SET at this time, other types are not supported yet but plan to be later on
     * @deprecated Use getUpdateTemplate
     */
    protected async getUpdateParams(
        pk: DynamoKeyPair,
        sk: DynamoKeyPair,
        items: EntityAttribute[],
        validate: boolean = true,
        type: string = "SET"): Promise<UpdateItemInput> {

        const now = new Date().toISOString();
        let updateExpression: string[] = [];
        let expressionAttributeNames: any = {
            ["#"+pk.keyName] : pk.keyName
        };
        let expressionAttributeValues: any = {};

        items.forEach((attr) => {
            if (attr.getType() === DynamoAttributeType.DATE || attr.value instanceof Date) {
                if (!attr.value) {
                    attr.value = now;
                } else {
                    attr.value = attr.value.toISOString();
                }
            }
            updateExpression.push(` #${attr.columnAlias} = :${attr.columnAlias} `);
            expressionAttributeNames[`#${attr.columnAlias}`] = attr.columnAlias;
            expressionAttributeValues[`:${attr.columnAlias}`] = attr.value;
        })

        const hasUpdatedDefinition:EntityAttribute = items.find(item => item.columnAlias === EntityColumnDefinitions.UPDATED_AT.shortAliasName);
        if (!hasUpdatedDefinition) {
            const now = new Date().toISOString();
            updateExpression.push(` #${EntityColumnDefinitions.UPDATED_AT.shortAliasName} = :${EntityColumnDefinitions.UPDATED_AT.shortAliasName} `);
            expressionAttributeNames[`#${EntityColumnDefinitions.UPDATED_AT.shortAliasName}`] = EntityColumnDefinitions.UPDATED_AT.shortAliasName;
            expressionAttributeValues[`:${EntityColumnDefinitions.UPDATED_AT.shortAliasName}`] = now;
        }

        return {
            Key: {
                [pk.keyName] : { S: pk.keyValue },
                [sk.keyName] : { S: sk.keyValue }
            },
            TableName: this.getTableName(),
            ReturnConsumedCapacity: "TOTAL",
            UpdateExpression: " SET " + updateExpression.join(", "),
            ConditionExpression: `attribute_exists(#${pk.keyName})`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames
        }
    }

    /**
     * Delete a specific dynamo item.
     *
     * @param pk
     * @param sk
     * @param conditionalFields
     */
    protected async getDeleteParams(
        pk: DynamoKeyPair,
        sk: DynamoKeyPair,
        conditionalFields?: string[]): Promise<DeleteItemInput> {

        const param:DeleteItemInput = {
            Key: {
                [pk.keyName] : { S: pk.keyValue },
                [sk.keyName] : { S: sk.keyValue }
            },
            TableName: this.getTableName(),
            ReturnValues: "ALL_OLD",
        }

        let conditions: string[] = [];
        if (conditionalFields && conditionalFields.length > 0) {
            for (let cf of conditionalFields) {
                 conditions.push(`attribute_exists(#${cf})`);
                 param.ExpressionAttributeNames["#" + cf] = cf
            }
            if (conditions) {
                param.ConditionExpression = conditions.join(" and ")
            }

        }

        return param;
    }

    public async transaction(transactionItems: TransactionItem[]): Promise<TransactWriteItemsOutput> {
        const _txn:TransactWriteItemsInput = {
            TransactItems: []
        };

        for (let transactionItem of transactionItems) {
            if (transactionItem.type === TransactionType.PUT) {
                _txn.TransactItems.push({
                    Put: transactionItem.queryInput
                });
            }

            if (transactionItem.type === TransactionType.UPDATE) {
                _txn.TransactItems.push({
                    Update: transactionItem.queryInput
                });
            }

            if (transactionItem.type === TransactionType.DELETE) {
                _txn.TransactItems.push({
                    Delete: transactionItem.queryInput
                });
            }
        }

        const dynamoResponse: TransactWriteItemsOutput = await this.client.transactWriteItems(_txn);
        logger.info("Transaction Response", dynamoResponse);
        return dynamoResponse;
    }

    protected mapResponse(dynamoResult: QueryOutput, accessPattern: AccessPattern): DynamoServiceResponse {
        let result = new DynamoServiceResponse();
        if (!dynamoResult) {
            throw new DAOException("Dynamo Service Failed", 500, dynamoResult);
        } else {
            if (dynamoResult.Items) {
                for (let item of dynamoResult.Items) {
                    result.addData(item);
                }
                if (dynamoResult.LastEvaluatedKey) {
                    let lastEvaluatedKeyElement = dynamoResult.LastEvaluatedKey[accessPattern.sortKeyExpression.keyName];
                    result.nextToken = lastEvaluatedKeyElement ? lastEvaluatedKeyElement.S : undefined;
                    // Base 64 Encode the Token 
                    logger.debug("Next token in raw format is " + result.nextToken);
                    result.nextToken = Buffer.from(result.nextToken, 'utf8').toString('base64')  
                    logger.debug("Next token Base64 Encoded as " + result.nextToken);
                }
            }
        }
        return result;
    }

    protected async mapProjectionExpressions(queryData: QueryInput, fields?: string[]): Promise<void> {
        if (fields && fields.length > 0) {
            const attributes = fields.map(f => `#${f}`);
            queryData.ProjectionExpression = attributes.join(",");
            for (const attribute of attributes) {
                queryData.ExpressionAttributeNames[attribute] = attribute.substr(1, attribute.length - 1);
            }
        } else {
            logger.warn("No ProjectionExpression was defined when invoking findBySK.  It is strongly recommended you use a ProjectionExpression.");
        }
    }

    protected static getLimit(limit: number) {
        return !limit || limit > DynamoDAO.MAX_LIMIT ? DynamoDAO.MAX_LIMIT : limit;
    }

    protected getQueryInputTemplate(limit?: number, sortAscending: boolean = true): QueryInput {
        return {
            TableName: this.getTableName(),
            Limit: DynamoDAO.getLimit(limit),
            ScanIndexForward: !(typeof sortAscending === "string" && sortAscending === "false" || !sortAscending),
            ReturnConsumedCapacity: "INDEXES"
        }
    }

    protected getBatchGetTemplate(accessPatterns:AccessPattern[]): BatchGetItemInput {
        Assert.ok(accessPatterns !== undefined, "Access Patterns is a required parameter for getBatchGetTemplate");

        const template: BatchGetItemInput = {
            RequestItems: {
                [this.getTableName()] : {
                    Keys: []
                },
            },
            ReturnConsumedCapacity: "TOTAL"
        }

        let queryData: any;
        for (let ap of accessPatterns) {
            queryData = {};
            queryData[ap.partitionKeyExpression.keyName] = { "S" : ap.partitionKeyExpression.value1 };
            if (ap.sortKeyExpression?.keyName) {
                queryData[ap.sortKeyExpression.keyName] = { "S" : ap.sortKeyExpression.value1 };
            }

            template.RequestItems[this.getTableName()].Keys.push(queryData);
        }

        return template;
    }

    protected async batchGet(batchGetItemInput: BatchGetItemInput) {
        const response: BatchGetItemOutput = await this.client.batchGetItem(batchGetItemInput);
        return response.Responses[this.getTableName()];
    }

    protected async findByPrimaryKey(pk: string,
                                     entityType: string,
                                     queryOptions: QueryOptions = new QueryOptions()): Promise<QueryInput> {
        let accessPattern = AccessPattern.create(
            new PartitionKeyExpression("pk", QueryExpressionOperator.EQ, DynamoDAO.createKey(entityType, pk)),
            new SortKeyExpression("sk", QueryExpressionOperator.EQ, DynamoDAO.createKey(entityType, pk))
        );
        return this.findByAccessPattern(accessPattern, queryOptions)
    };


    static createKey(...params: string[]) {
        return params.join(DynamoDAO.DELIMITER);
    }

    static parseKey(key: string) {
        return key.split(DynamoDAO.DELIMITER);
    }
}