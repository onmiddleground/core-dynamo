"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const dynamo_tools_1 = require("@onmiddleground/dynamo-tools");
const DynamoDAO_1 = require("../db/dynamo/DynamoDAO");
const StudentFixture_1 = require("./StudentFixture");
const TestFixture_1 = require("./TestFixture");
const dayjs = require("dayjs");
const jsonData = require("./data.json");
const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);
describe("DAO Query suite", function () {
    this.timeout(0);
    const tableName = "students-db";
    const testDomain = "@gmail.com"; // Just fake a domain name
    let dynamoDbOptions = new DynamoDAO_1.DynamoDBOptions(tableName);
    dynamoDbOptions.enableLocal();
    let studentDAO;
    let testDAO;
    let dynamoTools = new dynamo_tools_1.DynamoTools(dynamoDbOptions.tableName, {});
    before(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield dynamoTools.createTable();
        yield dynamoTools.seedData(jsonData);
        studentDAO = new StudentFixture_1.StudentDAO(dynamoDbOptions);
        testDAO = new TestFixture_1.TestDAO(dynamoDbOptions);
    }));
    after(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield dynamoTools.deleteTable();
    }));
    it("just load seeded data", () => tslib_1.__awaiter(this, void 0, void 0, function* () { }));
    it("should get the most current Students", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let daoResponse = yield studentDAO.findLatest();
        expect(daoResponse.getData().length).to.eq(50);
        expect(daoResponse.getData()[0]['stid']).to.eq('1vlsmYBTMZJWCjxM9AVYk6ZKahD');
        expect(daoResponse.getData()[0]['ln']).to.eq("Casper");
    }));
    it("should get pages of Students in descending order", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const queryOptions = new DynamoDAO_1.QueryOptions([], 10, false);
        let response = yield studentDAO.findLatest(queryOptions);
        expect(response.getData().length).to.eq(10);
        expect(response.getData()[0]['stid']).to.eq('1vlsmYBTMZJWCjxM9AVYk6ZKahD');
        expect(response.getData()[0]['ln']).to.eq("Casper");
        queryOptions.nextPageToken = response.nextToken;
        response = yield studentDAO.findLatest(queryOptions);
        expect(response.getData().length).to.eq(10);
    }));
    it("should get a range of Students based on dates", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const startDate = dayjs("2021-09-28T08:03:21.736Z").add(-6, 'M').toDate();
        const endDate = dayjs("2021-09-28T08:03:21.736Z").toDate();
        let daoResponse = yield studentDAO.findRange(startDate, endDate);
        expect(daoResponse.getData().length).to.eq(2);
        expect(daoResponse.getData()[1].ln).to.eq("Kris");
    }));
    it("should not find any results from a Dynamo query", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const response = yield studentDAO.findById("NOTFOUND");
        expect(response.getData().length).to.eq(0);
    }));
    it("should get all tests and the corresponding student test results", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let daoResponses = yield testDAO.findStudentTests("1vlsmURaN4E7HmKeinJDUD4TpnU");
        expect(daoResponses.length).to.eq(2);
        expect(daoResponses[0].getData().length).to.eq(2);
        expect(daoResponses[1].getData().length).to.eq(50);
    }));
    it("should test the conversion of Dynamo style data into a friendly object form, delete key values", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const queryOptions = new DynamoDAO_1.QueryOptions([], 10, false);
        let response = yield studentDAO.findLatest(queryOptions);
        let serviceResponseFriendly = yield DynamoDAO_1.Entity.convert(StudentFixture_1.StudentEntity, response);
        console.log(serviceResponseFriendly);
    }));
});
//# sourceMappingURL=dao-spec.js.map