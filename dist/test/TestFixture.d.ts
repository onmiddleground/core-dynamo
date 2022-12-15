import { AccessPattern, AccessPatternDefinition, DynamoDAO, Entity, EntityAttribute, EntityColumn, QueryOptions } from "../db/dynamo/DynamoDAO";
import { ServiceResponse } from "../models";
export declare class TestAccessPattern {
    static STUDENT_TYPE: string;
    static TEST_TYPE: string;
    static LIKE_TEST_TYPE: string;
    static likeStudentTestDefinition(testId: string, studentId: string): AccessPatternDefinition;
    /**
     * Create an Access pattern for a single Test using the index pk as _TEST#123 and ask as _TEST#123 where 123 is the
     * test ID
     *
     * @param testId
     */
    static testId(testId: string): AccessPattern;
    static tests(): AccessPattern;
    static studentTests(studentId: string): AccessPattern;
    static testLikes(testId: string): AccessPattern;
}
export declare class TestDAO extends DynamoDAO {
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
    findStudentTests(studentId: string, queryOptions?: QueryOptions): Promise<ServiceResponse[]>;
    findTestLikes(testId: string, queryOptions?: QueryOptions): Promise<ServiceResponse>;
    updateTestDetails(testId: string, testName: string, passingMark: number): Promise<ServiceResponse>;
    deleteTest(testId: string): Promise<ServiceResponse>;
    likeTest(obj: LikeTest, validate?: boolean): Promise<ServiceResponse>;
}
export declare class TestAttributeDefinition {
    static ID: EntityColumn;
    static STUDENT_ID: EntityColumn;
    static NAME: EntityColumn;
    static PASSING_MARK: EntityColumn;
    static LIKE_COUNT: EntityColumn;
}
export declare class LikeTest extends Entity {
    private studentId;
    private testId;
    private constructor();
    static create(testId: string, studentId: string): Promise<LikeTest>;
    getTestId(): any;
    getStudentId(): any;
    isValid(): Promise<void>;
}
export declare class TestDTO {
    name: string;
    passingMark: number;
    likeCount: number;
    id: string;
    validate(): Promise<import("class-validator").ValidationError[]>;
}
export declare class TestEntity extends Entity {
    private constructor();
    static forUpdate(name: string, passingMark: number): Promise<EntityAttribute[]>;
    static fromDTO(testDTO: TestDTO): Promise<TestEntity>;
    getName(): string;
    getLikeCount(): number;
    getTestId(): string;
    getPassingMark(): number;
    isValid(): Promise<void>;
}
