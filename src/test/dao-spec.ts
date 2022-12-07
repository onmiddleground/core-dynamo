import {DynamoTools} from "@icarus/dynamo-tools";
import {DynamoDBOptions, QueryOptions} from "../db/dynamo/DynamoDAO";
import {Student, StudentDAO} from "./StudentFixture";
import {ServiceResponse, ValidationException} from "@icarus/models";
import {LikeTest, TestDAO} from "./TestFixture";
import dayjs = require("dayjs");

const jsonData = require("./data.json");

const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);

describe("DAO suite", function () {
    this.timeout(0);
    const tableName: string = "students-db";
    const testDomain: string = "@gmail.com"; // Just fake a domain name
    let dynamoDbOptions: DynamoDBOptions = new DynamoDBOptions(tableName);
    dynamoDbOptions.enableLocal();
    let studentDAO: StudentDAO;
    let testDAO: TestDAO;
    let dynamoTools: DynamoTools = new DynamoTools(dynamoDbOptions.tableName, {});

    before(async () => {
        await dynamoTools.createTable();
        await dynamoTools.seedData(jsonData);
        studentDAO = new StudentDAO(dynamoDbOptions);
        testDAO = new TestDAO(dynamoDbOptions);
    });

    after(async () => {
        await dynamoTools.deleteTable();
    });

    it("just load seeded data", async () => {});

    it("should fail when the table does not exist", async () => {
        let dynamoDbOptions: DynamoDBOptions = new DynamoDBOptions("non-existing-table");
        let testDAO1 = new StudentDAO(dynamoDbOptions);
        expect(testDAO1.validate()).to.be.rejected;
    });

    it("should create a record in Dynamo for Gary Waddell", async () => {
        const testEmail: string = "garywaddell" + testDomain;
        const studentEntity: Student = await Student.create(
            "Gary",
            "Waddell",
            testEmail,
            "gwaddell");
        const created = await studentDAO.createStudent(studentEntity);
        expect(created).to.not.be.undefined;
    });

    it("should fail validation when creating a record in Dynamo for Gary because of missing last name", async () => {
        const testEmail: string = "garywaddell" + testDomain;
        const studentEntity: Student = await Student.create(
            "Gary",
            undefined,
            testEmail,
            "gwaddell");
        await expect(studentDAO.createStudent(studentEntity)).to.be.rejectedWith(ValidationException);
    });

    it("should create an entity for Alex Lifeson", async () => {
        const testEmail: string = "alexlifeson" + testDomain;
        const studentEntity: Student = await Student.create(
            "Alex",
            "Lifeson",
            testEmail,
            "alexlifeson");
        await expect(studentDAO.createStudent(studentEntity)).to.be.fulfilled;
    });

    it("should create an entity for Tom Quayle", async () => {
        const testEmail: string = "tomquayle" + testDomain;
        const studentEntity: Student = await Student.create(
            "Tom",
            "Quayle",
            testEmail,
            "tomquayle");
        await expect(studentDAO.txnCreateStudent(studentEntity)).to.be.fulfilled;
    });

    it("should get the most current Students", async () => {
        let daoResponse: ServiceResponse = await studentDAO.findLatest();
        expect(daoResponse.getData().length).to.eq(50);
        expect(daoResponse.getData()[0]['stid']).to.eq('1vlsmYBTMZJWCjxM9AVYk6ZKahD');
        expect(daoResponse.getData()[0]['ln']).to.eq("Casper");
    });

    it("should get pages of Students in descending order", async () => {
        const queryOptions: QueryOptions = new QueryOptions([],10,false);
        let response: ServiceResponse = await studentDAO.findLatest(queryOptions);
        expect(response.getData().length).to.eq(10);
        expect(response.getData()[0]['stid']).to.eq('1vlsmYBTMZJWCjxM9AVYk6ZKahD');
        expect(response.getData()[0]['ln']).to.eq("Casper");

        queryOptions.nextPageToken = response.nextToken;
        response = await studentDAO.findLatest(queryOptions);
        expect(response.getData().length).to.eq(10);
    });

    it("should get a range of Students based on dates", async () => {
        const startDate = dayjs("2021-09-28T08:03:21.736Z").add(-6, 'M').toDate();
        const endDate = dayjs("2021-09-28T08:03:21.736Z").toDate();
        let daoResponse = await studentDAO.findRange(startDate, endDate);
        expect(daoResponse.getData().length).to.eq(2);
        expect(daoResponse.getData()[1].ln).to.eq("Kris");
    });

    it("should not find any results from a Dynamo query", async() => {
        const response = await studentDAO.findById("NOTFOUND");
        expect(response.getData().length).to.eq(0);
    });

    describe("Test scenarios", function() {

        it("should get all tests and the corresponding student test results", async () => {
            let daoResponses: ServiceResponse[] = await testDAO.findStudentTests("1vlsmURaN4E7HmKeinJDUD4TpnU");
            expect(daoResponses.length).to.eq(2);
            expect(daoResponses[0].getData().length).to.eq(2);
            expect(daoResponses[1].getData().length).to.eq(50);
        });

        it("should like a test", async () => {
            const likeTestEntity: LikeTest = await LikeTest.create(
                "1xAdvQ2Y6Gy2koPWdllIAMwWapc",
                "1vlsmURaN4E7HmKeinJDUD4TpnU");
            let serviceResponse = await testDAO.likeTest(likeTestEntity);
            await expect(serviceResponse.statusCode).to.be.eq(200);
        });

        it("should update the name and passmark of a test", async () => {
            const testId: string = "1xAdvQ2Y6Gy2koPWdllIAMwWapc";
            let response:ServiceResponse = await testDAO.updateTestDetails(testId, "Me is Updated",99);
            expect(response.statusCode).to.be.eq(200);
        });

        it("should delete a test", async () => {
            const testId: string = "1xAdvQ2Y6Gy2koPWdllIAMwWapc";
            let response:ServiceResponse = await testDAO.deleteTest(testId);
            expect(response.statusCode).to.eq(200);
        });

        it("should fail delete when the test is not found", async () => {
            const testId: string = "missingid";
            let response:ServiceResponse = await testDAO.deleteTest(testId);
            expect(response.statusCode).to.eq(404);
        });

    });
});