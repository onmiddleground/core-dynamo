"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const dynamo_tools_1 = require("@onmiddleground/dynamo-tools");
const DynamoDAO_1 = require("../db/dynamo/DynamoDAO");
const StudentFixture_1 = require("./StudentFixture");
const TestFixture_1 = require("./TestFixture");
const jsonData = require("./data.json");
const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);
describe("DAO Create, Update, Delete suite", function () {
    this.timeout(0);
    const tableName = "students-db";
    const testDomain = "@gmail.com"; // Just fake a domain name
    let dynamoDbOptions = new DynamoDAO_1.DynamoDBOptions(tableName);
    dynamoDbOptions.enableLocal();
    let studentDAO;
    let testDAO;
    let dynamoTools = new dynamo_tools_1.DynamoTools(dynamoDbOptions.tableName, {});
    beforeEach(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield dynamoTools.createTable();
        yield dynamoTools.seedData(jsonData);
        studentDAO = new StudentFixture_1.StudentDAO(dynamoDbOptions);
        testDAO = new TestFixture_1.TestDAO(dynamoDbOptions);
    }));
    afterEach(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield dynamoTools.deleteTable();
    }));
    it("just load seeded data", () => tslib_1.__awaiter(this, void 0, void 0, function* () { }));
    it("should fail when the table does not exist", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let dynamoDbOptions = new DynamoDAO_1.DynamoDBOptions("non-existing-table");
        let testDAO1 = new StudentFixture_1.StudentDAO(dynamoDbOptions);
        expect(testDAO1.validate()).to.be.rejected;
    }));
    it("should create a record in Dynamo for Gary Waddell", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const testEmail = "garywaddell" + testDomain;
        const studentEntity = yield StudentFixture_1.StudentEntity.create("Gary", "Waddell", testEmail, "gwaddell");
        const created = yield studentDAO.createStudent(studentEntity);
        expect(created).to.not.be.undefined;
    }));
    // it("should fail validation when creating a record in Dynamo for Gary because of missing last name", async () => {
    //     const testEmail: string = "garywaddell" + testDomain;
    //     const studentEntity: Student = await Student.create(
    //         "Gary",
    //         undefined,
    //         testEmail,
    //         "gwaddell");
    //     await expect(studentDAO.createStudent(studentEntity)).to.be.rejectedWith(ValidationException);
    // });
    it("should create an entity for Alex Lifeson", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const testEmail = "alexlifeson" + testDomain;
        const studentEntity = yield StudentFixture_1.StudentEntity.create("Alex", "Lifeson", testEmail, "alexlifeson");
        yield expect(studentDAO.createStudent(studentEntity)).to.be.fulfilled;
    }));
    it("should create an entity for Tom Quayle", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const testEmail = "tomquayle" + testDomain;
        const studentEntity = yield StudentFixture_1.StudentEntity.create("Tom", "Quayle", testEmail, "tomquayle");
        yield expect(studentDAO.txnCreateStudent(studentEntity)).to.be.fulfilled;
    }));
    describe("Test scenarios", function () {
        it("should like a test", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const likeTestEntity = yield TestFixture_1.LikeTest.create("1xAdvQ2Y6Gy2koPWdllIAMwWapc", "1vlsmURaN4E7HmKeinJDUD4TpnU");
            let serviceResponse = yield testDAO.likeTest(likeTestEntity);
            yield expect(serviceResponse.statusCode).to.be.eq(200);
        }));
        it("should update the name and passmark of a test", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const testId = "1xAdvQ2Y6Gy2koPWdllIAMwWapc";
            let response = yield testDAO.updateTestDetails(testId, "Me is Updated", 99);
            expect(response.statusCode).to.be.eq(200);
        }));
        it("should delete a test", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const testId = "1xAdvQ2Y6Gy2koPWdllIAMwWapc";
            let response = yield testDAO.deleteTest(testId);
            expect(response.statusCode).to.eq(200);
        }));
        it("should fail delete when the test is not found", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const testId = "missingid";
            let response = yield testDAO.deleteTest(testId);
            expect(response.statusCode).to.eq(404);
        }));
    });
});
//# sourceMappingURL=dao-cud-spec.js.map