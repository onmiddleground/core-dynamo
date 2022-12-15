"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentEntity = exports.StudentAttributeDefinition = exports.StudentDAO = exports.StudentAccessPattern = exports.StudentAccessPatternDefinition = void 0;
const tslib_1 = require("tslib");
const DynamoDAO_1 = require("../db/dynamo/DynamoDAO");
const assert = require("assert");
const dayjs = require("dayjs");
const KSUID = require('ksuid');
class StudentAccessPatternDefinition {
    /**
     * Can be used for all searches using Student IDs or when creating a new Student
     * @param studentId
     */
    static studentId(studentId) {
        return new DynamoDAO_1.AccessPatternDefinition(DynamoDAO_1.DynamoDAO.createKey(StudentAccessPattern.TYPE, studentId), DynamoDAO_1.DynamoDAO.createKey(StudentAccessPattern.TYPE, studentId));
    }
    /**
     * Used when creating a new student dynamo item
     *
     * @param id Student ID
     * @param registeredDate
     */
    static creatingRegisteredDate(id, registeredDate) {
        return new DynamoDAO_1.AccessPatternDefinition(DynamoDAO_1.DynamoDAO.createKey(StudentAccessPattern.TYPE), DynamoDAO_1.DynamoDAO.createKey(StudentAccessPattern.TYPE, "REGDT", registeredDate.toISOString()));
    }
    /**
     * Supports date search by range and by start or end date searches.
     *
     * @param registeredDate optional When not provided, typically looking for all registered date records
     */
    static findRegisteredDate(registeredDate) {
        let skKey = DynamoDAO_1.DynamoDAO.createKey(StudentAccessPattern.TYPE, "REGDT");
        if (registeredDate) {
            skKey = DynamoDAO_1.DynamoDAO.createKey(StudentAccessPattern.TYPE, "REGDT", registeredDate.toISOString());
        }
        return new DynamoDAO_1.AccessPatternDefinition(DynamoDAO_1.DynamoDAO.createKey(StudentAccessPattern.TYPE), skKey);
    }
}
exports.StudentAccessPatternDefinition = StudentAccessPatternDefinition;
class StudentAccessPattern {
    /**
     * Use the Student ID Access Pattern.
     *
     * @param studentId
     */
    static id(studentId) {
        let accessPatternDefinition = StudentAccessPatternDefinition.studentId(studentId);
        return DynamoDAO_1.AccessPattern.create(new DynamoDAO_1.PartitionKeyExpression("pk", DynamoDAO_1.QueryExpressionOperator.EQ, accessPatternDefinition.pk), new DynamoDAO_1.SortKeyExpression("sk", DynamoDAO_1.QueryExpressionOperator.EQ, accessPatternDefinition.sk));
    }
    /**
     * Get the latest Students  Type=_ST
     */
    static all() {
        // Don't pass the registered date so we can use the wild card BEGINS_WITH operator
        let accessPatternDefinition = StudentAccessPatternDefinition.findRegisteredDate();
        return DynamoDAO_1.AccessPattern.create(new DynamoDAO_1.PartitionKeyExpression("GSI1pk", DynamoDAO_1.QueryExpressionOperator.EQ, accessPatternDefinition.pk), new DynamoDAO_1.SortKeyExpression("GSI1sk", DynamoDAO_1.QueryExpressionOperator.BEGINS_WITH, accessPatternDefinition.sk), DynamoDAO_1.DynamoIndex.GSI_PK1);
    }
    /**
     * Get a range of students based on their created date.
     *
     * @param startDate Start Date of range
     * @param endDate End Date of range (optional, defaults to 30 days from start date
     */
    static range(startDate, endDate) {
        assert.ok(startDate, "Start Date is required");
        let _endDate = dayjs(startDate);
        if (!endDate) {
            // Add 30 days to the start date if not provided
            _endDate = dayjs().add(30, 'd');
        }
        else {
            _endDate = dayjs(endDate);
        }
        const accessPatternDefinition = StudentAccessPatternDefinition.findRegisteredDate();
        return DynamoDAO_1.AccessPattern.create(new DynamoDAO_1.PartitionKeyExpression("GSI1pk", DynamoDAO_1.QueryExpressionOperator.EQ, accessPatternDefinition.pk), new DynamoDAO_1.SortKeyExpression("GSI1sk", DynamoDAO_1.QueryExpressionOperator.BETWEEN, DynamoDAO_1.DynamoDAO.createKey(accessPatternDefinition.sk, startDate.toISOString()), DynamoDAO_1.DynamoDAO.createKey(accessPatternDefinition.sk, _endDate.toISOString())), DynamoDAO_1.DynamoIndex.GSI_PK1);
    }
}
exports.StudentAccessPattern = StudentAccessPattern;
StudentAccessPattern.TYPE = "_ST";
class StudentDAO extends DynamoDAO_1.DynamoDAO {
    findLatest(queryOptions = new DynamoDAO_1.QueryOptions([], 100, false)) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const accessPattern = StudentAccessPattern.all();
            const query = yield this.findByAccessPattern(accessPattern, queryOptions);
            return this.query(query, accessPattern);
        });
    }
    findById(studentId, nextPage) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const accessPattern = StudentAccessPattern.id(studentId);
            const query = yield this.findByAccessPattern(accessPattern, new DynamoDAO_1.QueryOptions([], 100, false, nextPage));
            return this.query(query, accessPattern);
        });
    }
    findRange(startDate, endDate, nextPage) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const accessPattern = StudentAccessPattern.range(startDate, endDate);
            const query = yield this.findByAccessPattern(accessPattern, new DynamoDAO_1.QueryOptions([], 100, false, nextPage));
            return this.query(query, accessPattern);
        });
    }
    createStudent(obj, validate = true) {
        const _super = Object.create(null, {
            create: { get: () => super.create }
        });
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const id = KSUID.randomSync().string;
            let accessPatternDefinition = StudentAccessPatternDefinition.studentId(id);
            obj.setPk(accessPatternDefinition.pk);
            obj.setSk(accessPatternDefinition.sk);
            obj.setType(StudentAccessPattern.TYPE);
            accessPatternDefinition = StudentAccessPatternDefinition.creatingRegisteredDate(id, obj.getRegisteredDate());
            obj.setGSI1Pk(accessPatternDefinition.pk);
            obj.setGSI1Sk(accessPatternDefinition.sk);
            obj.setId(id);
            return _super.create.call(this, obj, validate, true);
        });
    }
    txnCreateStudent(obj, validate = true) {
        const _super = Object.create(null, {
            transaction: { get: () => super.transaction }
        });
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const id = KSUID.randomSync().string;
            let accessPatternDefinition = StudentAccessPatternDefinition.studentId(id);
            obj.setPk(accessPatternDefinition.pk);
            obj.setSk(accessPatternDefinition.sk);
            obj.setType(StudentAccessPattern.TYPE);
            accessPatternDefinition = StudentAccessPatternDefinition.creatingRegisteredDate(id, obj.getRegisteredDate());
            obj.setGSI1Pk(accessPatternDefinition.pk);
            obj.setGSI1Sk(accessPatternDefinition.sk);
            obj.setId(id);
            const itemInput = yield this.getCreateParams(obj, validate, true);
            const transactionItem = new DynamoDAO_1.TransactionItem(itemInput, DynamoDAO_1.TransactionType.PUT);
            return _super.transaction.call(this, [transactionItem]);
        });
    }
}
exports.StudentDAO = StudentDAO;
class StudentAttributeDefinition {
}
exports.StudentAttributeDefinition = StudentAttributeDefinition;
StudentAttributeDefinition.FIRST_NAME = DynamoDAO_1.EntityColumn.create("firstName", "fn");
StudentAttributeDefinition.LAST_NAME = DynamoDAO_1.EntityColumn.create("lastName", "ln");
StudentAttributeDefinition.USER_NAME = DynamoDAO_1.EntityColumn.create("userName", "un");
StudentAttributeDefinition.EMAIL = DynamoDAO_1.EntityColumn.create("email", "eml");
StudentAttributeDefinition.REGISTERED_DATE = DynamoDAO_1.EntityColumn.create("registered", "regdt");
StudentAttributeDefinition.ID = DynamoDAO_1.EntityColumn.create("studentId", "stid");
class StudentEntity extends DynamoDAO_1.Entity {
    constructor() {
        super();
        this.registerAttribute(StudentAttributeDefinition.FIRST_NAME);
        this.registerAttribute(StudentAttributeDefinition.LAST_NAME);
        this.registerAttribute(StudentAttributeDefinition.EMAIL);
        this.registerAttribute(StudentAttributeDefinition.USER_NAME);
        this.registerAttribute(StudentAttributeDefinition.REGISTERED_DATE);
        this.registerAttribute(StudentAttributeDefinition.ID);
    }
    static create(firstName, lastName, email, userName, registeredDate = new Date(), id) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const studentEntity = new StudentEntity();
            studentEntity.getAttribute(StudentAttributeDefinition.FIRST_NAME).value = firstName;
            studentEntity.getAttribute(StudentAttributeDefinition.LAST_NAME).value = lastName;
            studentEntity.getAttribute(StudentAttributeDefinition.EMAIL).value = email;
            studentEntity.getAttribute(StudentAttributeDefinition.USER_NAME).value = userName;
            studentEntity.getAttribute(StudentAttributeDefinition.REGISTERED_DATE).value = registeredDate;
            if (id) {
                studentEntity.getAttribute(StudentAttributeDefinition.ID).value = lastName;
            }
            return studentEntity;
        });
    }
    getFirstName() {
        return this.getAttribute(StudentAttributeDefinition.FIRST_NAME).value;
    }
    getLastName() {
        return this.getAttribute(StudentAttributeDefinition.LAST_NAME).value;
    }
    getEmail() {
        return this.getAttribute(StudentAttributeDefinition.EMAIL).value;
    }
    getStudentId() {
        return this.getAttribute(StudentAttributeDefinition.ID).value;
    }
    getRegisteredDate() {
        return this.getAttribute(StudentAttributeDefinition.REGISTERED_DATE).value;
    }
    setId(id) {
        this.getAttribute(StudentAttributeDefinition.ID).value = id;
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
exports.StudentEntity = StudentEntity;
//# sourceMappingURL=StudentFixture.js.map