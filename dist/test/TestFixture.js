"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestEntity = exports.TestDTO = exports.LikeTest = exports.TestAttributeDefinition = exports.TestDAO = exports.TestAccessPattern = void 0;
const tslib_1 = require("tslib");
const DynamoDAO_1 = require("../db/dynamo/DynamoDAO");
const class_validator_1 = require("class-validator");
const logger_1 = require("../logger");
const models_1 = require("../models");
class TestAccessPattern {
    static likeStudentTestDefinition(testId, studentId) {
        return new DynamoDAO_1.AccessPatternDefinition(DynamoDAO_1.DynamoDAO.createKey(TestAccessPattern.TEST_TYPE, testId), DynamoDAO_1.DynamoDAO.createKey(TestAccessPattern.LIKE_TEST_TYPE, TestAccessPattern.STUDENT_TYPE, studentId));
    }
    /**
     * Create an Access pattern for a single Test using the index pk as _TEST#123 and ask as _TEST#123 where 123 is the
     * test ID
     *
     * @param testId
     */
    static testId(testId) {
        let accessPatternDefinition = new DynamoDAO_1.AccessPatternDefinition(DynamoDAO_1.DynamoDAO.createKey(this.TEST_TYPE, testId), DynamoDAO_1.DynamoDAO.createKey(this.TEST_TYPE, testId));
        return DynamoDAO_1.AccessPattern.create(new DynamoDAO_1.PartitionKeyExpression("pk", DynamoDAO_1.QueryExpressionOperator.EQ, accessPatternDefinition.pk), new DynamoDAO_1.SortKeyExpression("sk", DynamoDAO_1.QueryExpressionOperator.EQ, accessPatternDefinition.sk));
    }
    static tests() {
        return DynamoDAO_1.AccessPattern.createUsingPk(new DynamoDAO_1.PartitionKeyExpression("GSI1pk", DynamoDAO_1.QueryExpressionOperator.EQ, DynamoDAO_1.DynamoDAO.createKey(this.TEST_TYPE)), DynamoDAO_1.DynamoIndex.GSI_PK1);
    }
    static studentTests(studentId) {
        let accessPatternDefinition = new DynamoDAO_1.AccessPatternDefinition(DynamoDAO_1.DynamoDAO.createKey(TestAccessPattern.STUDENT_TYPE, studentId), DynamoDAO_1.DynamoDAO.createKey(this.TEST_TYPE));
        return DynamoDAO_1.AccessPattern.create(new DynamoDAO_1.PartitionKeyExpression("pk", DynamoDAO_1.QueryExpressionOperator.EQ, accessPatternDefinition.pk), new DynamoDAO_1.SortKeyExpression("sk", DynamoDAO_1.QueryExpressionOperator.BEGINS_WITH, accessPatternDefinition.sk));
    }
    static testLikes(testId) {
        let accessPatternDefinition = new DynamoDAO_1.AccessPatternDefinition(DynamoDAO_1.DynamoDAO.createKey(TestAccessPattern.TEST_TYPE, testId), DynamoDAO_1.DynamoDAO.createKey(TestAccessPattern.LIKE_TEST_TYPE, TestAccessPattern.STUDENT_TYPE));
        return DynamoDAO_1.AccessPattern.create(new DynamoDAO_1.PartitionKeyExpression("pk", DynamoDAO_1.QueryExpressionOperator.EQ, accessPatternDefinition.pk), new DynamoDAO_1.SortKeyExpression("sk", DynamoDAO_1.QueryExpressionOperator.BEGINS_WITH, accessPatternDefinition.sk));
    }
}
exports.TestAccessPattern = TestAccessPattern;
TestAccessPattern.STUDENT_TYPE = "_ST";
TestAccessPattern.TEST_TYPE = "_TEST";
TestAccessPattern.LIKE_TEST_TYPE = "_LIKTEST";
class TestDAO extends DynamoDAO_1.DynamoDAO {
    /**
     * Ideally this function would not send back 2 Service Responses, but it's used for illustration only where you can
     * invoke 2 Dynamo GET services to return multiple sets of data, in this case, all Tests and the corresponding
     * Student Test results for tests they've taken.  You would probably have this kind of code inside of some proxy
     * service or api gateway client to call into 2 separate microservices where you would massage the results into a
     * nice object response.
     *
     * @param studentId
     * @param queryOptions
     */
    findStudentTests(studentId, queryOptions = new DynamoDAO_1.QueryOptions([], 100, false)) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const promises = [];
            const accessPatternStudentTests = TestAccessPattern.studentTests(studentId);
            const accessPatternTests = TestAccessPattern.tests();
            let query = yield this.findByAccessPattern(accessPatternStudentTests, queryOptions);
            promises.push(this.query(query, accessPatternStudentTests));
            query = yield this.findByAccessPattern(accessPatternTests, queryOptions);
            promises.push(this.query(query, accessPatternTests));
            return Promise.all(promises);
        });
    }
    findTestLikes(testId, queryOptions = new DynamoDAO_1.QueryOptions([], 100, false)) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const accessPattern = TestAccessPattern.testLikes(testId);
            let query = yield this.findByAccessPattern(accessPattern, queryOptions);
            return this.query(query, accessPattern);
        });
    }
    updateTestDetails(testId, testName, passingMark) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const serviceResponse = new models_1.ServiceResponse();
            try {
                const accessPattern = TestAccessPattern.testId(testId);
                const attributes = yield TestEntity.forUpdate(testName, passingMark);
                let queryInput = yield this.getUpdateParams(new DynamoDAO_1.DynamoKeyPair(accessPattern.partitionKeyExpression.keyName, accessPattern.partitionKeyExpression.value1), new DynamoDAO_1.DynamoKeyPair(accessPattern.sortKeyExpression.keyName, accessPattern.sortKeyExpression.value1), attributes);
                const result = yield this.nativeUpdate(queryInput);
                logger_1.default.debug("Update Test Details Complete", result.ConsumedCapacity);
                serviceResponse.statusCode = 200;
                serviceResponse.message = JSON.stringify(result.Attributes);
            }
            catch (err) {
                serviceResponse.statusCode = 500;
                serviceResponse.message = err;
            }
            return serviceResponse;
        });
    }
    deleteTest(testId) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let serviceResponse = new models_1.ServiceResponse();
            try {
                const accessPattern = TestAccessPattern.testId(testId);
                serviceResponse = yield this.delete(new DynamoDAO_1.DynamoKeyPair(accessPattern.partitionKeyExpression.keyName, accessPattern.partitionKeyExpression.value1), new DynamoDAO_1.DynamoKeyPair(accessPattern.sortKeyExpression.keyName, accessPattern.sortKeyExpression.value1));
            }
            catch (err) {
                serviceResponse.statusCode = 500;
                serviceResponse.message = err;
            }
            return serviceResponse;
        });
    }
    likeTest(obj, validate = true) {
        const _super = Object.create(null, {
            transaction: { get: () => super.transaction }
        });
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = new models_1.ServiceResponse();
            try {
                let accessPatternDefinition = TestAccessPattern.likeStudentTestDefinition(obj.getTestId(), obj.getStudentId());
                obj.setPk(accessPatternDefinition.pk);
                obj.setSk(accessPatternDefinition.sk);
                obj.setType(TestAccessPattern.LIKE_TEST_TYPE);
                obj.setGSI1Pk(accessPatternDefinition.pk);
                obj.setGSI1Sk(accessPatternDefinition.sk);
                const transactionItems = [
                    {
                        type: DynamoDAO_1.TransactionType.PUT,
                        queryInput: yield this.getCreateParams(obj, validate, true)
                    },
                    {
                        type: DynamoDAO_1.TransactionType.UPDATE,
                        queryInput: yield this.aggregateIncrementCount(new DynamoDAO_1.DynamoKeyPair("pk", accessPatternDefinition.pk), new DynamoDAO_1.DynamoKeyPair("sk", accessPatternDefinition.pk), TestAttributeDefinition.LIKE_COUNT.shortAliasName)
                    }
                ];
                yield _super.transaction.call(this, transactionItems);
                response.statusCode = 200;
            }
            catch (err) {
                response.statusCode = 500;
                response.message = err;
            }
            return response;
        });
    }
}
exports.TestDAO = TestDAO;
class TestAttributeDefinition {
}
exports.TestAttributeDefinition = TestAttributeDefinition;
TestAttributeDefinition.ID = DynamoDAO_1.EntityColumn.create("testid", "testid");
TestAttributeDefinition.STUDENT_ID = DynamoDAO_1.EntityColumn.create("studentid", "stid");
TestAttributeDefinition.NAME = DynamoDAO_1.EntityColumn.create("name", "nm");
TestAttributeDefinition.PASSING_MARK = DynamoDAO_1.EntityColumn.create("passingMark", "passmrk");
TestAttributeDefinition.LIKE_COUNT = DynamoDAO_1.EntityColumn.create("likeCount", "likcnt");
class LikeTest extends DynamoDAO_1.Entity {
    constructor() {
        super();
        this.testId = this.registerAttribute(TestAttributeDefinition.ID);
        this.studentId = this.registerAttribute(TestAttributeDefinition.STUDENT_ID);
    }
    static create(testId, studentId) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const likeTestEntity = new LikeTest();
            likeTestEntity.testId.value = testId;
            likeTestEntity.studentId.value = studentId;
            return likeTestEntity;
        });
    }
    getTestId() {
        return this.testId.value;
    }
    getStudentId() {
        return this.studentId.value;
    }
    isValid() {
        const _super = Object.create(null, {
            isValid: { get: () => super.isValid }
        });
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return _super.isValid.call(this, this);
        });
    }
}
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", DynamoDAO_1.EntityAttribute)
], LikeTest.prototype, "studentId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", DynamoDAO_1.EntityAttribute)
], LikeTest.prototype, "testId", void 0);
exports.LikeTest = LikeTest;
class TestDTO {
    constructor() {
        this.likeCount = 0;
    }
    validate() {
        return (0, class_validator_1.validate)(this);
    }
}
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], TestDTO.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], TestDTO.prototype, "passingMark", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], TestDTO.prototype, "likeCount", void 0);
exports.TestDTO = TestDTO;
class TestEntity extends DynamoDAO_1.Entity {
    constructor() {
        super();
        this.registerAttribute(TestAttributeDefinition.ID);
        this.registerAttribute(TestAttributeDefinition.LIKE_COUNT);
        this.registerAttribute(TestAttributeDefinition.NAME);
        this.registerAttribute(TestAttributeDefinition.PASSING_MARK);
    }
    static forUpdate(name, passingMark) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const entity = new TestEntity();
            entity.getAttribute(TestAttributeDefinition.NAME).value = name;
            entity.getAttribute(TestAttributeDefinition.PASSING_MARK).value = passingMark;
            return [
                entity.getAttribute(TestAttributeDefinition.NAME),
                entity.getAttribute(TestAttributeDefinition.PASSING_MARK)
            ];
        });
    }
    static fromDTO(testDTO) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const entity = new TestEntity();
            entity.getAttribute(TestAttributeDefinition.NAME).value = testDTO.name;
            entity.getAttribute(TestAttributeDefinition.PASSING_MARK).value = testDTO.passingMark;
            entity.getAttribute(TestAttributeDefinition.LIKE_COUNT).value = testDTO.likeCount;
            if (testDTO.id) {
                entity.getAttribute(TestAttributeDefinition.ID).value = testDTO.id;
            }
            return entity;
        });
    }
    getName() {
        return this.getAttribute(TestAttributeDefinition.NAME).value;
    }
    getLikeCount() {
        return this.getAttribute(TestAttributeDefinition.LIKE_COUNT).value;
    }
    getTestId() {
        return this.getAttribute(TestAttributeDefinition.ID).value;
    }
    getPassingMark() {
        return this.getAttribute(TestAttributeDefinition.PASSING_MARK).value;
    }
    isValid() {
        const _super = Object.create(null, {
            isValid: { get: () => super.isValid }
        });
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return _super.isValid.call(this, this);
        });
    }
}
exports.TestEntity = TestEntity;
//# sourceMappingURL=TestFixture.js.map