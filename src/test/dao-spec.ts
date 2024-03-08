import {DynamoTools} from "@onmiddleground/dynamo-tools";
import {DynamoDBOptions, Entity, QueryOptions} from "../DynamoDAO";
import {StudentDAO, StudentEntity} from "./StudentFixture";
import {TestDAO} from "./TestFixture";
import {DynamoServiceResponse} from "../models";
import dayjs = require("dayjs");

const jsonData = require("./data.json");

const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
const expect = chai.expect;
chai.use(chaiAsPromised);

describe("DAO Query suite", function () {
    this.timeout(0);
    const tableName: string = "students-test-db";
    let dynamoDbOptions: DynamoDBOptions = new DynamoDBOptions(tableName);
    dynamoDbOptions.enableLocal("127.0.0.1",4566);
    let studentDAO: StudentDAO;
    let testDAO: TestDAO;
    let dynamoTools: DynamoTools = new DynamoTools(dynamoDbOptions.tableName, dynamoDbOptions);

    before(async () => {
        await dynamoTools.createTable();
        await dynamoTools.seedData(jsonData);
        studentDAO = new StudentDAO(dynamoDbOptions);
        testDAO = new TestDAO(dynamoDbOptions);
    });

    after(async () => {
        // await dynamoTools.deleteTable();
    });

    it("just load seeded data", async () => {});

    it("should fetch 2 sets of results using batch get", async () => {
        const studentId: string = "1vlsmURaN4E7HmKeinJDUD4TpnU";
        let serviceResponse = await studentDAO.findStudentAndTheirTests(studentId);
    })

    it("should describe a table", async () => {
        let serviceResponse = await studentDAO.getTableMetaData();
    })

    it("should get the most current Students", async () => {
        let daoResponse: DynamoServiceResponse = await studentDAO.findLatest();
        expect(daoResponse.getData().length).to.eq(50);
        expect(daoResponse.getData()[0]['stid']).to.eq('1vlsmYBTMZJWCjxM9AVYk6ZKahD');
        expect(daoResponse.getData()[0]['ln']).to.eq("Casper");
    });

    it("should get pages of Students in descending order", async () => {
        const queryOptions: QueryOptions = new QueryOptions([],10,false);
        let response: DynamoServiceResponse = await studentDAO.findLatest(queryOptions);
        expect(response.getData().length).to.eq(10);
        expect(response.getData()[0]['stid']).to.eq('1vlsmYBTMZJWCjxM9AVYk6ZKahD');
        expect(response.getData()[0]['ln']).to.eq("Casper");

        queryOptions.setNextPageToken(response.nextToken);
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

    it("should get all tests and the corresponding student test results", async () => {
        let daoResponses: DynamoServiceResponse[] = await testDAO.findStudentTests("1vlsmURaN4E7HmKeinJDUD4TpnU");
        expect(daoResponses.length).to.eq(2);
        expect(daoResponses[0].getData().length).to.eq(2);
        expect(daoResponses[1].getData().length).to.eq(50);
    });

    it("should test the conversion of Dynamo style data into a friendly object form, delete key values", async () => {
        const queryOptions: QueryOptions = new QueryOptions([],10,false);
        let response: DynamoServiceResponse = await studentDAO.findLatest(queryOptions);
        let serviceResponseFriendly = await Entity.convert(StudentEntity, response);
        console.log(serviceResponseFriendly);
    })
});