import {
    AccessPattern,
    AccessPatternDefinition,
    DynamoDAO,
    DynamoIndex,
    DynamoKeyPair,
    Entity,
    EntityAttribute,
    EntityColumn,
    PartitionKeyExpression,
    QueryExpressionOperator,
    QueryOptions,
    SortKeyExpression,
    TransactionItem,
    TransactionType
} from "../DynamoDAO";
import {IsNotEmpty, IsNumber, validate} from "class-validator";
import logger from "../logger";
import {ServiceResponse} from "../models";
import {StudentAccessPattern, StudentEntity} from "./StudentFixture";
import {UpdateItemOutput} from "@aws-sdk/client-dynamodb";

export class TestAccessPattern {
    public static STUDENT_TYPE: string = "ST";
    public static TEST_TYPE: string = "TEST";
    public static LIKE_TEST_TYPE: string = "LIKTEST";

    public static likeStudentTestDefinition(testId: string, studentId: string): AccessPatternDefinition {
        return new AccessPatternDefinition(
            DynamoDAO.createKey(TestAccessPattern.TEST_TYPE,testId),
            DynamoDAO.createKey(TestAccessPattern.LIKE_TEST_TYPE,TestAccessPattern.STUDENT_TYPE,studentId)
        );
    }

    public static studentTestsDefinition(studentId: string): AccessPatternDefinition {
        return new AccessPatternDefinition(
            DynamoDAO.createKey(TestAccessPattern.STUDENT_TYPE,studentId),
            DynamoDAO.createKey(this.TEST_TYPE)
        );
    }

    /**
     * Create an Access pattern for a single Test using the index pk as _TEST#123 and ask as _TEST#123 where 123 is the
     * test ID
     *
     * @param testId
     */
    public static testId(testId: string): AccessPattern {
        let accessPatternDefinition: AccessPatternDefinition = new AccessPatternDefinition(
            DynamoDAO.createKey(this.TEST_TYPE, testId),
            DynamoDAO.createKey(this.TEST_TYPE, testId)
        );

        return AccessPattern.create(
            new PartitionKeyExpression("pk",QueryExpressionOperator.EQ,accessPatternDefinition.pk),
            new SortKeyExpression("sk",QueryExpressionOperator.EQ,accessPatternDefinition.sk)
        );
    }


    public static tests(): AccessPattern {
        return AccessPattern.createUsingPk(
            new PartitionKeyExpression("GSI1pk",QueryExpressionOperator.EQ,DynamoDAO.createKey(this.TEST_TYPE)),
            DynamoIndex.GSI_PK1
        );
    }

    public static studentTests(studentId: string): AccessPattern {
        const accessPatternDefinition: AccessPatternDefinition = this.studentTestsDefinition(studentId);
        return AccessPattern.create(
            new PartitionKeyExpression("pk",QueryExpressionOperator.EQ,accessPatternDefinition.pk),
            new SortKeyExpression("sk",QueryExpressionOperator.BEGINS_WITH,accessPatternDefinition.sk));
    }

    public static testLikes(testId: string): AccessPattern {
        let accessPatternDefinition: AccessPatternDefinition = new AccessPatternDefinition(
            DynamoDAO.createKey(TestAccessPattern.TEST_TYPE,testId),
            DynamoDAO.createKey(TestAccessPattern.LIKE_TEST_TYPE,TestAccessPattern.STUDENT_TYPE)
        );

        return AccessPattern.create(
            new PartitionKeyExpression("pk",QueryExpressionOperator.EQ,accessPatternDefinition.pk),
            new SortKeyExpression("sk",QueryExpressionOperator.BEGINS_WITH,accessPatternDefinition.sk));
    }
}

export class TestDAO extends DynamoDAO {
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
    async findStudentTests(studentId: string, queryOptions: QueryOptions = new QueryOptions([], 100, false)): Promise<ServiceResponse[]> {
        const promises: any[] = [];
        const accessPatternStudentTests = TestAccessPattern.studentTests(studentId);
        const accessPatternTests = TestAccessPattern.tests();

        let query = await this.findByAccessPattern(accessPatternStudentTests, queryOptions);
        promises.push(this.query(query, accessPatternStudentTests));
        query = await this.findByAccessPattern(accessPatternTests, queryOptions);
        promises.push(this.query(query, accessPatternTests));
        return Promise.all(promises);
    }

    /**
     * Example executing 2 gets by access patterns in parallel that are not supported by batchGet
     *
     * @param studentId
     */
    async getStudentDetailsAndTests(studentId: string): Promise<ServiceResponse> {
        const accessPatterns: AccessPattern[] = [StudentAccessPattern.id(studentId), TestAccessPattern.studentTests(studentId)];

        let promises: any[] = [];
        for (let ap of accessPatterns) {
            const qi = await this.findByAccessPattern(ap);
            promises.push(this.query(qi, ap));
        }

        const responses: ServiceResponse[] = await Promise.all(promises);
        const response: ServiceResponse = new ServiceResponse();
        if (responses) {
            for (let sr of responses) {
                let converted = await Entity.convert(StudentEntity, sr);
                for (let data of converted.getData()) {
                    response.addData(data);
                }
            }
        }
        return response;
    }

    async findTestLikes(testId: string, queryOptions: QueryOptions = new QueryOptions([], 100, false)): Promise<ServiceResponse> {
        const accessPattern = TestAccessPattern.testLikes(testId);
        let query = await this.findByAccessPattern(accessPattern, queryOptions);
        return this.query(query, accessPattern);
    }

    async updateTestDetails(testId: string, testName: string, passingMark: number): Promise<ServiceResponse> {
        const serviceResponse: ServiceResponse = new ServiceResponse();

        try {
            const accessPattern = TestAccessPattern.testId(testId);
            const attributes: EntityAttribute[] = await TestEntity.forUpdate(testName, passingMark);

            let queryInput = await this.getUpdateTemplate(
                new DynamoKeyPair(accessPattern.partitionKeyExpression.keyName, accessPattern.partitionKeyExpression.value1),
                new DynamoKeyPair(accessPattern.sortKeyExpression.keyName, accessPattern.sortKeyExpression.value1),
                attributes
            );
            const result:UpdateItemOutput = await this.nativeUpdate(queryInput);
            logger.info("Update Test Details Complete", result.ConsumedCapacity);
            serviceResponse.statusCode = 200;
            serviceResponse.message = JSON.stringify(result.Attributes);
        } catch (err) {
            serviceResponse.statusCode = 500;
            serviceResponse.message = err;
        }

        return serviceResponse;
    }

    async deleteTest(testId: string): Promise<ServiceResponse> {
        let serviceResponse: ServiceResponse = new ServiceResponse();
        try {
            const accessPattern = TestAccessPattern.testId(testId);
            serviceResponse = await this.delete(
                new DynamoKeyPair(accessPattern.partitionKeyExpression.keyName, accessPattern.partitionKeyExpression.value1),
                new DynamoKeyPair(accessPattern.sortKeyExpression.keyName, accessPattern.sortKeyExpression.value1)
            );

        } catch (err) {
            serviceResponse.statusCode = 500;
            serviceResponse.message = err;
        }
        return serviceResponse;
    }

    async likeTest(obj: LikeTest, validate: boolean = true): Promise<ServiceResponse> {
        const response = new ServiceResponse();
        try {
            let accessPatternDefinition = TestAccessPattern.likeStudentTestDefinition(obj.getTestId(), obj.getStudentId());

            obj.setPk(accessPatternDefinition.pk);
            obj.setSk(accessPatternDefinition.sk);
            obj.setType(TestAccessPattern.LIKE_TEST_TYPE);
            obj.setGSI1Pk(accessPatternDefinition.pk);
            obj.setGSI1Sk(accessPatternDefinition.sk)

            const transactionItems: TransactionItem[] = [
                {
                    type: TransactionType.PUT,
                    queryInput: await this.getCreateTemplate(obj)
                },
                {
                    type: TransactionType.UPDATE,
                    queryInput: await this.aggregateIncrementCount(
                        new DynamoKeyPair("pk",accessPatternDefinition.pk),
                        new DynamoKeyPair("sk",accessPatternDefinition.pk),
                        TestAttributeDefinition.LIKE_COUNT.shortAliasName
                    )
                }
            ]
            await super.transaction(transactionItems);
            response.statusCode = 200;
        } catch (err) {
            response.statusCode = 500;
            response.message = err;
        }

        return response;
    }
}

export class TestAttributeDefinition {
    public static ID = EntityColumn.create("testid","testid");
    public static STUDENT_ID = EntityColumn.create("studentid","stid");
    public static NAME = EntityColumn.create("name","nm");
    public static PASSING_MARK = EntityColumn.create("passingMark","passmrk");
    public static LIKE_COUNT = EntityColumn.create("likeCount","likcnt");
}

export class LikeTest extends Entity {
    @IsNotEmpty()
    private studentId: EntityAttribute;

    @IsNotEmpty()
    private testId: EntityAttribute;

    private constructor() {
        super();
        this.testId = this.registerAttribute(TestAttributeDefinition.ID);
        this.studentId = this.registerAttribute(TestAttributeDefinition.STUDENT_ID);
    }

    public static async create(testId: string,
                               studentId: string): Promise<LikeTest> {
        const likeTestEntity: LikeTest = new LikeTest();
        likeTestEntity.testId.value = testId;
        likeTestEntity.studentId.value = studentId;
        return likeTestEntity;
    }

    getTestId() {
        return this.testId.value;
    }

    getStudentId() {
        return this.studentId.value;
    }

    // async isValid(): Promise<void> {
    //     return super.isValid(this);
    // }
}

export class TestDTO {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    @IsNumber()
    passingMark: number;

    @IsNotEmpty()
    @IsNumber()
    likeCount: number = 0;

    id: string;

    validate() {
        return validate(this);
    }
}

export class TestEntity extends Entity {
    private constructor() {
        super();
        this.registerAttribute(TestAttributeDefinition.ID);
        this.registerAttribute(TestAttributeDefinition.LIKE_COUNT);
        this.registerAttribute(TestAttributeDefinition.NAME);
        this.registerAttribute(TestAttributeDefinition.PASSING_MARK);
    }

    public static async forUpdate(name: string, passingMark: number): Promise<EntityAttribute[]> {
        const entity: TestEntity = new TestEntity();
        entity.getAttribute(TestAttributeDefinition.NAME).value = name;
        entity.getAttribute(TestAttributeDefinition.PASSING_MARK).value = passingMark;
        return [
            entity.getAttribute(TestAttributeDefinition.NAME),
            entity.getAttribute(TestAttributeDefinition.PASSING_MARK)
        ]
    }

    public static async fromDTO(testDTO: TestDTO): Promise<TestEntity> {
        const entity: TestEntity = new TestEntity();
        entity.getAttribute(TestAttributeDefinition.NAME).value = testDTO.name;
        entity.getAttribute(TestAttributeDefinition.PASSING_MARK).value = testDTO.passingMark;
        entity.getAttribute(TestAttributeDefinition.LIKE_COUNT).value = testDTO.likeCount;
        if (testDTO.id) {
            entity.getAttribute(TestAttributeDefinition.ID).value = testDTO.id;
        }
        return entity;
    }

    getName(): string {
        return this.getAttribute(TestAttributeDefinition.NAME).value;
    }

    getLikeCount(): number {
        return this.getAttribute(TestAttributeDefinition.LIKE_COUNT).value;
    }

    getTestId(): string {
        return this.getAttribute(TestAttributeDefinition.ID).value;
    }

    getPassingMark(): number {
        return this.getAttribute(TestAttributeDefinition.PASSING_MARK).value;
    }

    // async isValid(): Promise<void> {
    //     return super.isValid(this);
    // }
}

