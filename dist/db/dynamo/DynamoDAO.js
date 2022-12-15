"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDAO = exports.DynamoIndex = exports.QueryOptions = exports.AccessPattern = exports.DynamoKeyPair = exports.SortKeyExpression = exports.PartitionKeyExpression = exports.DynamoExpression = exports.QueryExpressionOperator = exports.Entity = exports.EntityColumnDefinitions = exports.EntityAttribute = exports.DynamoAttributeType = exports.DynamoDBOptions = exports.AccessPatternDefinition = exports.EntityColumn = exports.TransactionItem = exports.TransactionType = void 0;
const tslib_1 = require("tslib");
const logger_1 = require("../../logger");
const DAOException_1 = require("../DAOException");
const class_validator_1 = require("class-validator");
const AWS = require("aws-sdk");
const assert = require("assert");
const models_1 = require("../../models");
var TransactionType;
(function (TransactionType) {
    TransactionType[TransactionType["PUT"] = 0] = "PUT";
    TransactionType[TransactionType["UPDATE"] = 1] = "UPDATE";
    TransactionType[TransactionType["DELETE"] = 2] = "DELETE";
    TransactionType[TransactionType["CONDITION_EXPRESSION"] = 3] = "CONDITION_EXPRESSION";
})(TransactionType = exports.TransactionType || (exports.TransactionType = {}));
class TransactionItem {
    constructor(queryInput, type) {
        this.queryInput = queryInput;
        this.type = type;
    }
}
exports.TransactionItem = TransactionItem;
class EntityColumn {
    constructor() {
    }
    static create(fullName, shortAliasName) {
        const entityColumns = new EntityColumn();
        if (!(0, class_validator_1.isNotEmpty)(fullName) && !(0, class_validator_1.isNotEmpty)(shortAliasName)) {
            throw new models_1.ValidationException("Failed Validation", "Full name and Short Alias name are required fields");
        }
        entityColumns.fullName = fullName;
        entityColumns.shortAliasName = shortAliasName;
        return entityColumns;
    }
}
exports.EntityColumn = EntityColumn;
class AccessPatternDefinition {
    constructor(pk, sk) {
        this.pk = pk;
        this.sk = sk;
    }
}
exports.AccessPatternDefinition = AccessPatternDefinition;
class DynamoDBOptions {
    constructor(tableName) {
        this.region = "us-east-1";
        assert.ok(tableName);
        this.tableName = tableName;
    }
    enableLocal() {
        this.endpoint = "http://localhost:4566";
    }
}
exports.DynamoDBOptions = DynamoDBOptions;
var DynamoAttributeType;
(function (DynamoAttributeType) {
    DynamoAttributeType[DynamoAttributeType["STRING"] = 0] = "STRING";
    DynamoAttributeType[DynamoAttributeType["NUMBER"] = 1] = "NUMBER";
    DynamoAttributeType[DynamoAttributeType["DATE"] = 2] = "DATE";
})(DynamoAttributeType = exports.DynamoAttributeType || (exports.DynamoAttributeType = {}));
class EntityAttribute {
    constructor(columnAlias, columnName, value, type = DynamoAttributeType.STRING) {
        this.type = type;
        this._columnName = columnName;
        this._columnAlias = columnAlias;
        this._value = value;
    }
    get columnName() {
        return this._columnName;
    }
    get columnAlias() {
        return this._columnAlias;
    }
    get value() {
        return this._value;
    }
    set value(v) {
        this._value = v;
    }
    validate() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return (0, class_validator_1.validate)(this);
        });
    }
}
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EntityAttribute.prototype, "_columnName", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EntityAttribute.prototype, "_columnAlias", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", Object)
], EntityAttribute.prototype, "_value", void 0);
exports.EntityAttribute = EntityAttribute;
class EntityColumnDefinitions {
}
exports.EntityColumnDefinitions = EntityColumnDefinitions;
EntityColumnDefinitions.PK = EntityColumn.create("pk", "pk");
EntityColumnDefinitions.SK = EntityColumn.create("sk", "sk");
EntityColumnDefinitions.TYPE = EntityColumn.create("type", "type");
EntityColumnDefinitions.CREATED_AT = EntityColumn.create("createdAt", "cadt");
EntityColumnDefinitions.UPDATED_AT = EntityColumn.create("updatedAt", "uadt");
EntityColumnDefinitions.GSI1PK = EntityColumn.create("GSI1pk", "GSI1pk");
EntityColumnDefinitions.GSI1SK = EntityColumn.create("GSI1sk", "GSI1sk");
class Entity {
    constructor() {
        this.attributes = new Map();
        const now = new Date();
        this.registerAttribute(EntityColumnDefinitions.TYPE);
        this.registerAttribute(EntityColumnDefinitions.PK);
        this.registerAttribute(EntityColumnDefinitions.SK);
        this.registerAttribute(EntityColumnDefinitions.CREATED_AT, now);
        this.registerAttribute(EntityColumnDefinitions.UPDATED_AT, now);
        this.registerAttribute(EntityColumnDefinitions.GSI1PK);
        this.registerAttribute(EntityColumnDefinitions.GSI1SK);
    }
    registerAttribute(entityColumns, value, useShortNameAsKey = true) {
        const entityAttribute = new EntityAttribute(entityColumns.shortAliasName, entityColumns.fullName, value);
        if (useShortNameAsKey) {
            this.attributes.set(entityColumns.shortAliasName, entityAttribute);
        }
        else {
            this.attributes.set(entityColumns.fullName, entityAttribute);
        }
        return entityAttribute;
    }
    getAttributes() {
        return this.attributes;
    }
    getAttributeUsingShortName(shortName) {
        return this.attributes.get(shortName);
    }
    getAttributeUsingFullname(fullName) {
        return this.attributes.get(fullName);
    }
    getAttribute(entityColumn, useAliasName = true) {
        return this.getAttributes().get(useAliasName ? entityColumn.shortAliasName : entityColumn.fullName);
    }
    setAttributeValue(entityColumn, value, useAliasName = true) {
        let attribute = this.getAttribute(entityColumn, useAliasName);
        attribute._value = value;
    }
    getAttributeValue(entityColumn, useAliasName = true) {
        let result = this.getAttribute(entityColumn, useAliasName);
        if (result) {
            result = result.value;
        }
        return result;
    }
    formatDateValue(entityAttribute) {
        if (entityAttribute.value instanceof Date) {
            return entityAttribute.value.toISOString();
        }
        else {
            return entityAttribute.value;
        }
    }
    getEntityAttribute(entityColumn) {
        return this.getAttributes().get(entityColumn.fullName);
    }
    static convert(E, serviceResponse, deleteKeyColumns = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let converted;
            const entity = new E;
            const items = serviceResponse.getData().map(data => {
                const t = Object.create({});
                const keys = Object.keys(data);
                keys.map(key => {
                    const entityAttribute = entity.getAttributeUsingShortName(key);
                    if (entityAttribute) {
                        t[entityAttribute._columnName] = data[key];
                        if (deleteKeyColumns) {
                            if (entityAttribute.columnAlias === EntityColumnDefinitions.PK.shortAliasName ||
                                entityAttribute.columnAlias === EntityColumnDefinitions.SK.shortAliasName ||
                                entityAttribute.columnAlias === EntityColumnDefinitions.GSI1PK.shortAliasName ||
                                entityAttribute.columnAlias === EntityColumnDefinitions.GSI1SK.shortAliasName ||
                                entityAttribute.columnAlias === EntityColumnDefinitions.TYPE.shortAliasName)
                                delete t[entityAttribute._columnName];
                        }
                    }
                    else {
                        logger_1.default.error(`Could not locate entity attribute on Thread Entity using key ${key}`);
                    }
                });
                return t;
            });
            if (items) {
                converted = models_1.ServiceResponse.createSuccess(items, serviceResponse.nextToken);
            }
            else {
                converted = models_1.ServiceResponse.createEmpty();
            }
            return converted;
        });
    }
    // Entity Attribute Getters
    getPk() {
        return this.getAttribute(EntityColumnDefinitions.PK);
    }
    getSk() {
        return this.getAttribute(EntityColumnDefinitions.SK);
    }
    getType() {
        return this.getAttribute(EntityColumnDefinitions.TYPE);
    }
    getCreatedAt() {
        return this.getAttribute(EntityColumnDefinitions.CREATED_AT);
    }
    getUpdatedAt() {
        return this.getAttribute(EntityColumnDefinitions.UPDATED_AT);
    }
    getGSI1Pk() {
        return this.getAttribute(EntityColumnDefinitions.GSI1PK);
    }
    getGSI1Sk() {
        return this.getAttribute(EntityColumnDefinitions.GSI1SK);
    }
    // Quick functions to return the values of Entity Attributes
    getPkValue() {
        return this.getPk().value;
    }
    getSkValue() {
        return this.getSk().value;
    }
    getTypeValue() {
        return this.getType().value;
    }
    getCreatedAtValue() {
        let entityAttribute = this.getCreatedAt();
        return this.formatDateValue(entityAttribute);
    }
    getUpdatedAtValue() {
        let entityAttribute = this.getUpdatedAt();
        return this.formatDateValue(entityAttribute);
    }
    getGSI1pkValue() {
        return this.getGSI1Pk().value;
    }
    getGSI1skValue() {
        return this.getGSI1Sk().value;
    }
    static getFields(...entityColumns) {
        return entityColumns.map(entityColumn => entityColumn.shortAliasName);
    }
    // SETTERs
    setPk(value) {
        this.getPk().value = value;
    }
    setSk(value) {
        this.getSk().value = value;
    }
    setCreatedAt(date) {
        this.getCreatedAt().value = date.toISOString();
    }
    setUpdatedAt(date) {
        this.getUpdatedAt().value = date.toISOString();
    }
    setType(type) {
        this.getType().value = type;
    }
    setGSI1Pk(value) {
        this.getGSI1Pk().value = value;
    }
    setGSI1Sk(value) {
        this.getGSI1Sk().value = value;
    }
    /**
     * Throws a ValidationException when not valid containing the status code and validation errors.
     */
    isValid(obj) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const errors = yield (0, class_validator_1.validate)(obj || this);
            if (errors.length > 0) {
                throw new models_1.ValidationException("Failed Validation", errors, 400);
            }
        });
    }
}
exports.Entity = Entity;
var QueryExpressionOperator;
(function (QueryExpressionOperator) {
    QueryExpressionOperator["GT"] = ">";
    QueryExpressionOperator["LT"] = "<";
    QueryExpressionOperator["EQ"] = "=";
    QueryExpressionOperator["GTE"] = ">=";
    QueryExpressionOperator["LTE"] = "<=";
    QueryExpressionOperator["BETWEEN"] = "between";
    QueryExpressionOperator["BEGINS_WITH"] = "begins_with";
})(QueryExpressionOperator = exports.QueryExpressionOperator || (exports.QueryExpressionOperator = {}));
class DynamoExpression {
    constructor(keyName, operator, value1) {
        this.comparator = operator;
        this.keyName = keyName;
        this.value1 = value1;
    }
    validate() {
        return (0, class_validator_1.validate)(this);
    }
}
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], DynamoExpression.prototype, "comparator", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], DynamoExpression.prototype, "keyName", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], DynamoExpression.prototype, "value1", void 0);
tslib_1.__decorate([
    (0, class_validator_1.ValidateIf)(o => o.comparator.toLowerCase() === 'between'),
    (0, class_validator_1.IsNotEmpty)({ message: "value2 is required when using the between operator" }),
    tslib_1.__metadata("design:type", String)
], DynamoExpression.prototype, "value2", void 0);
exports.DynamoExpression = DynamoExpression;
class PartitionKeyExpression extends DynamoExpression {
}
exports.PartitionKeyExpression = PartitionKeyExpression;
class SortKeyExpression extends DynamoExpression {
    constructor(keyName, operator, value1, value2) {
        super(keyName, operator, value1);
        this.value2 = value2;
    }
}
exports.SortKeyExpression = SortKeyExpression;
class DynamoKeyPair {
    constructor(keyName, keyValue) {
        this.keyName = keyName;
        this.keyValue = keyValue;
    }
}
exports.DynamoKeyPair = DynamoKeyPair;
class AccessPattern {
    constructor(partitionKeyExpression, sortKeyExpression, indexName) {
        this.partitionKeyExpression = partitionKeyExpression;
        this.sortKeyExpression = sortKeyExpression;
        this.indexName = indexName;
    }
    static create(partitionKeyExpression, sortKeyExpression, indexName) {
        return new AccessPattern(partitionKeyExpression, sortKeyExpression, indexName);
    }
    static createUsingPk(partitionKeyExpression, indexName) {
        return new AccessPattern(partitionKeyExpression, undefined, indexName);
    }
}
exports.AccessPattern = AccessPattern;
class QueryOptions {
    constructor(fields = [], limit = 100, sortAscending = true, nextPageToken) {
        this.fields = fields;
        this.limit = limit;
        this.sortAscending = sortAscending;
        this.nextPageToken = nextPageToken;
        this.fields = fields;
        this.limit = limit;
        this.sortAscending = sortAscending;
    }
}
exports.QueryOptions = QueryOptions;
var DynamoIndex;
(function (DynamoIndex) {
    DynamoIndex["GSI_SK"] = "GSIsk";
    // GSI_TYPE = "GSItype",
    DynamoIndex["GSI_PK1"] = "GSI1pk";
})(DynamoIndex = exports.DynamoIndex || (exports.DynamoIndex = {}));
/**
 * Used in all DAO implementations to save you the hassle of fetching data and creating data.
 * Global Secondary Indexes are created for sk and type.  Also handles pagination for GETs.
 * You can always access the document client (client) to customize any work you need to do.
 */
class DynamoDAO {
    findByAccessPattern(accessPattern, queryOptions = new QueryOptions()) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const queryData = Object.assign({}, this.getTemplate(queryOptions.limit, queryOptions.sortAscending));
            if (accessPattern.indexName) {
                queryData.IndexName = accessPattern.indexName;
            }
            yield this.buildExpression(accessPattern, queryData, queryOptions.nextPageToken);
            yield this.mapProjectionExpressions(queryData, queryOptions.fields);
            return queryData;
        });
    }
    constructor(dynamoDBOptions) {
        this.dynamoDBOptions = dynamoDBOptions;
        assert.ok(dynamoDBOptions);
        this.client = new AWS.DynamoDB.DocumentClient(dynamoDBOptions);
    }
    validate() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const checkDb = new AWS.DynamoDB();
                const data = yield checkDb.describeTable({
                    TableName: this.dynamoDBOptions.tableName
                }).promise();
            }
            catch (err) {
                throw new models_1.NotFoundException("Table error or it does not exist", 500);
            }
        });
    }
    buildKeyConditionExpression(queryInput, expression, nextPageToken) {
        if (queryInput.KeyConditionExpression) {
            queryInput.KeyConditionExpression += " and ";
        }
        else {
            queryInput.KeyConditionExpression = "";
        }
        if (expression instanceof SortKeyExpression && nextPageToken) {
            queryInput.KeyConditionExpression += ` #${expression.keyName} < :token `;
        }
        else {
            if (expression.comparator === QueryExpressionOperator.BEGINS_WITH) {
                queryInput.KeyConditionExpression += (expression.comparator + " (#" + expression.keyName) + ", :" + expression.keyName + ") ";
            }
            else if (expression.comparator === QueryExpressionOperator.BETWEEN) {
                queryInput.KeyConditionExpression += " #" + expression.keyName + " " + expression.comparator + " :" + expression.keyName + "1 " + " and :" + expression.keyName + "2";
            }
            else {
                queryInput.KeyConditionExpression += "#" + expression.keyName + " " + expression.comparator + " :" + expression.keyName;
            }
        }
    }
    buildExpressionAttributes(queryInput, expression, nextPageToken) {
        queryInput.ExpressionAttributeNames["#" + expression.keyName] = expression.keyName;
        if (expression instanceof SortKeyExpression && nextPageToken) {
            queryInput.ExpressionAttributeValues[":token"] = nextPageToken;
        }
        else {
            if (expression.comparator.toLowerCase() === QueryExpressionOperator.BETWEEN) {
                queryInput.ExpressionAttributeValues[":" + expression.keyName + "1"] = expression.value1;
                queryInput.ExpressionAttributeValues[":" + expression.keyName + "2"] = expression.value2;
            }
            else {
                queryInput.ExpressionAttributeValues[":" + expression.keyName] = expression.value1;
            }
        }
    }
    initQueryInput(queryInput) {
        if (!queryInput.ExpressionAttributeValues) {
            queryInput.ExpressionAttributeValues = {};
        }
        if (!queryInput.ExpressionAttributeNames) {
            queryInput.ExpressionAttributeNames = {};
        }
    }
    buildQuery(expr, queryInput, nextPageToken) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let errors = yield expr.validate();
            if (errors.length > 0) {
                throw new models_1.ValidationException("DynamoExpression Failed Validation", errors, 400);
            }
            this.buildKeyConditionExpression(queryInput, expr, nextPageToken);
            this.buildExpressionAttributes(queryInput, expr, nextPageToken);
        });
    }
    buildExpression(accessPattern, queryInput, nextPageToken) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!accessPattern) {
                return;
            }
            // Add the custom expressions
            this.initQueryInput(queryInput);
            yield this.buildQuery(accessPattern.partitionKeyExpression, queryInput, nextPageToken);
            if (accessPattern.sortKeyExpression) {
                yield this.buildQuery(accessPattern.sortKeyExpression, queryInput, nextPageToken);
            }
        });
    }
    hasResults(dynamoResult) {
        let result = false;
        if (dynamoResult && dynamoResult.getData() && dynamoResult.getData().length > 0) {
            logger_1.default.debug(`DB results were found. Size ${dynamoResult.getData().length}`);
            result = true;
        }
        else {
            logger_1.default.warn("::DynamoDB => hasResults: false");
        }
        return result;
    }
    handleException(err, message, code) {
        logger_1.default.error("::Failed => handleException", err);
        if (err instanceof models_1.AuthException) {
            logger_1.default.error("::Failed => AuthError", err);
            throw err;
        }
        else if (err instanceof models_1.ValidationException) {
            logger_1.default.error("::Failed Validation", err);
            throw err;
        }
        else if (err instanceof models_1.NotFoundException) {
            logger_1.default.error("::Resource Not Found", err);
            throw err;
        }
        else {
            logger_1.default.error("::Failed => DAO Exception", err);
            throw new DAOException_1.DAOException(message, 500, err);
        }
    }
    getDocumentClient() {
        return this.client;
    }
    getOptions() {
        return this.dynamoDBOptions;
    }
    getTableName() {
        return this.dynamoDBOptions.tableName;
    }
    query(params, accessPattern) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let results;
            try {
                logger_1.default.info(params);
                results = yield this.getDocumentClient()
                    .query(params)
                    .promise();
                logger_1.default.debug(results, "Returned Query Data");
            }
            catch (err) {
                logger_1.default.error("Error in Dynamo Query", params);
                if (err.code === "ResourceNotFoundException") {
                    throw new models_1.NotFoundException("Resource Not Found", 404);
                }
                throw err;
            }
            return this.mapResponse(results, accessPattern);
        });
    }
    nativeCreate(params) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const result = this.getDocumentClient().put(params).promise();
            logger_1.default.debug("Item inserted", result);
            return result;
        });
    }
    nativeUpdate(params) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const result = yield this.getDocumentClient().update(params).promise();
            logger_1.default.debug("Item Updated", result);
            return result;
        });
    }
    nativeDelete(params) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const result = yield this.getDocumentClient().delete(params).promise();
            logger_1.default.debug("Item Delete", result);
            return result;
        });
    }
    getCreateParams(obj, validate = true, useSkInCondition) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield obj.isValid(obj);
            const now = new Date().toISOString();
            let newItem = {};
            // Assign values to the "system/core" attributes
            obj.getAttributes().forEach((attr) => {
                if (attr.columnAlias === EntityColumnDefinitions.TYPE.shortAliasName) {
                    attr.value = attr.value;
                }
                else if (attr.columnAlias === EntityColumnDefinitions.CREATED_AT.shortAliasName ||
                    attr.columnAlias === EntityColumnDefinitions.UPDATED_AT.shortAliasName) {
                    if (!attr.value) {
                        attr.value = now;
                    }
                    else if (attr.value instanceof Date) {
                        attr.value = attr.value.toISOString();
                    }
                }
                else if (attr.columnAlias === EntityColumnDefinitions.PK.shortAliasName || attr.columnAlias === EntityColumnDefinitions.SK.shortAliasName) {
                    attr.value = attr.value;
                }
                if (attr.value instanceof Date) {
                    newItem[attr.columnAlias] = attr.value.toISOString();
                }
                else {
                    newItem[attr.columnAlias] = attr.value;
                }
            });
            const itemInput = {
                TableName: this.getTableName(),
                Item: newItem,
                ConditionExpression: "attribute_not_exists(#pk)",
                ExpressionAttributeNames: {
                    ["#" + obj.getPk().columnAlias]: obj.getPk().value,
                }
            };
            // Add the SK fields if necessary
            if (useSkInCondition) {
                itemInput.ConditionExpression += " and attribute_not_exists(#" + obj.getSk().columnAlias + ")";
                itemInput.ExpressionAttributeNames["#" + obj.getSk().columnAlias] = obj.getSk().value;
            }
            return itemInput;
        });
    }
    create(obj, validate = true, useSkInCondition) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const itemInput = yield this.getCreateParams(obj, validate, useSkInCondition);
            return this.nativeCreate(itemInput);
        });
    }
    update(pk, sk, items, validate = true) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const itemInput = yield this.getUpdateParams(pk, sk, items, validate);
            return this.nativeUpdate(itemInput);
        });
    }
    delete(pk, sk) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const serviceResponse = new models_1.ServiceResponse();
            const itemInput = yield this.getDeleteParams(pk, sk);
            let deleteItemOutput = yield this.nativeDelete(itemInput);
            if (!deleteItemOutput.Attributes) {
                serviceResponse.statusCode = 404;
                serviceResponse.message = `Not found ${pk} / ${sk}`;
            }
            else {
                serviceResponse.statusCode = 200;
                serviceResponse.message = JSON.stringify(deleteItemOutput.Attributes);
            }
            logger_1.default.debug("Delete Complete", deleteItemOutput.ConsumedCapacity);
            return serviceResponse;
        });
    }
    aggregateIncrementCount(pk, sk, incrementingFieldName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const itemInput = {
                Key: {
                    [pk.keyName]: pk.keyValue,
                    [sk.keyName]: sk.keyValue
                },
                ConditionExpression: `attribute_exists(#${pk.keyName})`,
                TableName: this.getTableName(),
                ExpressionAttributeNames: {
                    ["#" + incrementingFieldName]: incrementingFieldName,
                    ["#" + pk.keyName]: pk.keyName
                },
                UpdateExpression: `SET #${incrementingFieldName} = #${incrementingFieldName} + :inc`,
                ExpressionAttributeValues: {
                    ":inc": 1
                }
            };
            return itemInput;
        });
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
     */
    getUpdateParams(pk, sk, items, validate = true, type = "SET") {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const now = new Date().toISOString();
            let updateExpression = [];
            let expressionAttributeNames = {
                ["#" + pk.keyName]: pk.keyName
            };
            let expressionAttributeValues = {};
            items.forEach((attr) => {
                if (validate) {
                    if (!attr || !attr.value || !attr.columnName || !attr.columnAlias) {
                        throw new models_1.ValidationException(`Failed Validation.  Missing required attributes for ${attr.columnName}.`, attr);
                    }
                }
                if (attr.type === DynamoAttributeType.DATE || attr.value instanceof Date) {
                    if (!attr.value) {
                        attr.value = now;
                    }
                    else {
                        attr.value = attr.value.toISOString();
                    }
                }
                updateExpression.push(` #${attr.columnAlias} = :${attr.columnAlias} `);
                expressionAttributeNames[`#${attr.columnAlias}`] = attr.columnAlias;
                expressionAttributeValues[`:${attr.columnAlias}`] = attr.value;
            });
            const hasUpdatedDefinition = items.find(item => item.columnAlias === EntityColumnDefinitions.UPDATED_AT.shortAliasName);
            if (!hasUpdatedDefinition) {
                const now = new Date().toISOString();
                updateExpression.push(` #${EntityColumnDefinitions.UPDATED_AT.shortAliasName} = :${EntityColumnDefinitions.UPDATED_AT.shortAliasName} `);
                expressionAttributeNames[`#${EntityColumnDefinitions.UPDATED_AT.shortAliasName}`] = EntityColumnDefinitions.UPDATED_AT.shortAliasName;
                expressionAttributeValues[`:${EntityColumnDefinitions.UPDATED_AT.shortAliasName}`] = now;
            }
            return {
                Key: {
                    [pk.keyName]: pk.keyValue,
                    [sk.keyName]: sk.keyValue
                },
                TableName: this.getTableName(),
                ReturnConsumedCapacity: "TOTAL",
                UpdateExpression: " SET " + updateExpression.join(", "),
                ConditionExpression: `attribute_exists(#${pk.keyName})`,
                ExpressionAttributeValues: expressionAttributeValues,
                ExpressionAttributeNames: expressionAttributeNames
            };
        });
    }
    /**
     * Delete a specific dynamo item.
     *
     * @param pk
     * @param sk
     */
    getDeleteParams(pk, sk) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return {
                Key: {
                    [pk.keyName]: pk.keyValue,
                    [sk.keyName]: sk.keyValue
                },
                TableName: this.getTableName(),
                ReturnValues: "ALL_OLD",
                // ConditionExpression: `attribute_exists(#${pk.keyName})`,
                // ExpressionAttributeNames: {
                //     ["#" + pk.keyName]: pk.keyValue,
                // }
            };
        });
    }
    transaction(transactionItems) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const _txn = {
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
            const dynamoResponse = yield this.client.transactWrite(_txn).promise();
            logger_1.default.info("Transaction Response", dynamoResponse);
            return dynamoResponse;
        });
    }
    mapResponse(dynamoResult, accessPattern) {
        let result = new models_1.ServiceResponse();
        if (!dynamoResult) {
            throw new DAOException_1.DAOException("Dynamo Service Failed", 500, dynamoResult);
        }
        else {
            if (dynamoResult.Items) {
                for (let item of dynamoResult.Items) {
                    result.addData(item);
                }
                if (dynamoResult.LastEvaluatedKey) {
                    result.nextToken = dynamoResult.LastEvaluatedKey[accessPattern.sortKeyExpression.keyName];
                }
            }
        }
        return result;
    }
    mapProjectionExpressions(queryData, fields) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (fields && fields.length > 0) {
                const attributes = fields.map(f => `#${f}`);
                queryData.ProjectionExpression = attributes.join(",");
                for (const attribute of attributes) {
                    queryData.ExpressionAttributeNames[attribute] = attribute.substr(1, attribute.length - 1);
                }
            }
            else {
                logger_1.default.warn("No ProjectionExpression was defined when invoking findBySK.  It is strongly recommended you use a ProjectionExpression.");
            }
        });
    }
    static getLimit(limit) {
        return !limit || limit > DynamoDAO.MAX_LIMIT ? DynamoDAO.MAX_LIMIT : limit;
    }
    getTemplate(limit, sortAscending = true) {
        return {
            TableName: this.getTableName(),
            Limit: DynamoDAO.getLimit(limit),
            ScanIndexForward: sortAscending,
            ReturnConsumedCapacity: "INDEXES"
        };
    }
    findByPrimaryKey(pk, entityType, queryOptions = new QueryOptions()) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let accessPattern = AccessPattern.create(new PartitionKeyExpression("pk", QueryExpressionOperator.EQ, DynamoDAO.createKey(entityType, pk)), new SortKeyExpression("sk", QueryExpressionOperator.EQ, DynamoDAO.createKey(entityType, pk)));
            return this.findByAccessPattern(accessPattern, queryOptions);
        });
    }
    ;
    static createKey(...params) {
        return params.join(DynamoDAO.DELIMITER);
    }
    static parseKey(key) {
        return key.split(DynamoDAO.DELIMITER);
    }
}
exports.DynamoDAO = DynamoDAO;
DynamoDAO.MAX_LIMIT = process.env.DYNAMO_MAX_LIMIT_RESULT &&
    !isNaN(Number(process.env.DYNAMO_MAX_LIMIT_RESULT)) ? Number(process.env.DYNAMO_MAX_LIMIT_RESULT) : 100;
DynamoDAO.DELIMITER = "#";
//# sourceMappingURL=DynamoDAO.js.map