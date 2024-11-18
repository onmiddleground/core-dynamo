import {DynamoTools} from "@onmiddleground/dynamo-tools";
import {DynamoDBOptions} from "../DynamoDAO";
import {StudentDAO, StudentEntity} from "./StudentFixture";
import {LikeTest, TestDAO} from "./TestFixture";
import {DynamoServiceResponse, ValidationException} from "../models";

const jsonData = require("./data.json");
const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);

describe("DAO Create, Update, Delete suite", function () {
    this.timeout(0);
    const tableName: string = "dynamoo-test-db";
    const testDomain: string = "@gmail.com"; // Just fake a domain name
    let studentDAO: StudentDAO;
    let testDAO: TestDAO;
    const host: string = "localhost";
    const port: number = 4566;
    let dynamoTools: DynamoTools = new DynamoTools(tableName,{
        endpoint: `http://${host}:${port}`,
        region: "us-east-1"
    });
    let dynamoDbOptions = new DynamoDBOptions(tableName);
    dynamoDbOptions.enableLocal(host, port);

    beforeEach(async () => {
        await dynamoTools.createTable(true);
        await dynamoTools.seedData(jsonData);
        studentDAO = new StudentDAO(dynamoDbOptions);
        testDAO = new TestDAO(dynamoDbOptions);
    });

    afterEach(async () => {
        // await dynamoTools.deleteTable();
    });

    it("just load seeded data", async () => {});

    it("should fail when the table does not exist", async () => {
        let dynamoDbOptions: DynamoDBOptions = new DynamoDBOptions("non-existing-table");
        let testDAO1 = new StudentDAO(dynamoDbOptions);
        expect(testDAO1.tableExists()).to.be.rejected;
    });

    it("should create a record in Dynamo for Joe Boxer", async () => {
        const testEmail: string = "joeboxer" + testDomain;
        const studentEntity: StudentEntity = await StudentEntity.create(
            "Joe",
            "Boxer",
            testEmail,
            "jboxer");
        const created = await studentDAO.createStudent(studentEntity);
        expect(created).to.not.be.undefined;
    });

    it("should fail validation when creating a record in Dynamo for Joe because of missing last name", async () => {
        const testEmail: string = "joeboxer" + testDomain;
        const studentEntity: StudentEntity = await StudentEntity.create(
            "Joe",
            undefined,
            testEmail,
            "jboxer");
        await expect(studentDAO.createStudent(studentEntity)).to.be.rejectedWith(ValidationException);
    });

    it("should fail validation when creating a record in Dynamo for Joe because of an invalid email", async () => {
        const testEmail: string = "joeboxer";
        const studentEntity: StudentEntity = await StudentEntity.create(
            "Joe",
            "Boxer",
            testEmail,
            "jboxer");
        await expect(studentDAO.createStudent(studentEntity)).to.be.rejectedWith(ValidationException);
    });

    it("should fail validation when creating a record in Dynamo for Joe because of an invalid registered date", async () => {
        const testEmail: string = "joeboxer" + testDomain;
        const studentEntity: StudentEntity = await StudentEntity.create(
            "Joe",
            "Boxer",
            testEmail,
            "jboxer"
        );
        await expect(studentDAO.createStudent(studentEntity)).to.be.rejectedWith(ValidationException);
    });

    it("should create an entity for Alex Lifeson", async () => {
        const testEmail: string = "alexlifeson" + testDomain;
        const studentEntity: StudentEntity = await StudentEntity.create(
            "Alex",
            "Lifeson",
            testEmail,
            "alexlifeson");
        await expect(studentDAO.createStudent(studentEntity)).to.be.fulfilled;
    });

    it("should create an entity for Tom Quayle", async () => {
        const testEmail: string = "tomquayle" + testDomain;
        const studentEntity: StudentEntity = await StudentEntity.create(
            "Tom",
            "Quayle",
            testEmail,
            "tomquayle");
        await expect(studentDAO.txnCreateStudent(studentEntity)).to.be.fulfilled;
    });


    describe("Test scenarios", function() {
        it("should like a test", async () => {
            const likeTestEntity: LikeTest = await LikeTest.create(
                "1xAdvQ2Y6Gy2koPWdllIAMwWapc",
                "1vlsmURaN4E7HmKeinJDUD4TpnU");
            let serviceResponse = await testDAO.likeTest(likeTestEntity);
            await expect(serviceResponse.statusCode).to.be.eq(200);
        });

        it("should update the name and passmark of a test", async () => {
            const testId: string = "1xAdvQ2Y6Gy2koPWdllIAMwWapc";
            let response:DynamoServiceResponse = await testDAO.updateTestDetails(testId, "Me is Updated",99);
            expect(response.statusCode).to.be.eq(200);
        });

        it("should delete a test", async () => {
            const testId: string = "1xAdvQ2Y6Gy2koPWdllIAMwWapc";
            let response:DynamoServiceResponse = await testDAO.deleteTest(testId);
            expect(response.statusCode).to.eq(200);
        });

        it("should fail delete when the test is not found", async () => {
            const testId: string = "missingid";
            let response:DynamoServiceResponse = await testDAO.deleteTest(testId);
            expect(response.statusCode).to.eq(404);
        });

        it("should get the student and test details in parallel", async () => {
            const studentId: string = "1vlsmURaN4E7HmKeinJDUD4TpnU";
            let serviceResponse = await testDAO.getStudentDetailsAndTests(studentId);
            expect(serviceResponse.getData().length).to.eq(3);
        });

    });
});