import {
    AccessPattern,
    AccessPatternDefinition,
    DynamoAttributeType,
    DynamoDAO,
    DynamoIndex,
    Entity,
    EntityColumn,
    EntityColumnDefinitions,
    isRequired,
    isValidDate,
    isValidEmail,
    PartitionKeyExpression,
    QueryExpressionOperator,
    QueryOptions,
    SortKeyExpression,
    TransactionItem,
    TransactionType
} from "../db/dynamo/DynamoDAO";
import {ServiceResponse} from "../models";
import assert = require("assert");
import dayjs = require("dayjs");
import { BatchGetItemInput, PutItemInput } from '@aws-sdk/client-dynamodb';
const KSUID = require('ksuid');

export class StudentAccessPatternDefinition {
    /**
     * Can be used for all searches using Student IDs or when creating a new Student
     * @param studentId
     */
    public static studentId(studentId: string): AccessPatternDefinition {
        return new AccessPatternDefinition(
            DynamoDAO.createKey(StudentAccessPattern.TYPE,studentId),
            DynamoDAO.createKey(StudentAccessPattern.TYPE,studentId)
        );
    }

    /**
     * Used when creating a new student dynamo item
     *
     * @param id Student ID
     * @param registeredDate
     */
    public static creatingRegisteredDate(id: string, registeredDate: Date): AccessPatternDefinition {
        return new AccessPatternDefinition(
            DynamoDAO.createKey(StudentAccessPattern.TYPE),
            DynamoDAO.createKey(StudentAccessPattern.TYPE,"REGDT",registeredDate.toISOString())
        );
    }

    /**
     * Supports date search by range and by start or end date searches.
     *
     * @param registeredDate optional When not provided, typically looking for all registered date records
     */
    public static findRegisteredDate(registeredDate?: Date): AccessPatternDefinition {
        let skKey = DynamoDAO.createKey(StudentAccessPattern.TYPE,"REGDT");
        if (registeredDate) {
            skKey = DynamoDAO.createKey(StudentAccessPattern.TYPE,"REGDT",registeredDate.toISOString());
        }

        return new AccessPatternDefinition(
            DynamoDAO.createKey(StudentAccessPattern.TYPE),
            skKey
        );
    }

}

export class StudentAccessPattern {
    public static TYPE: string = "ST";

    /**
     * Use the Student ID Access Pattern.
     *
     * @param studentId
     */
    public static id(studentId: string): AccessPattern {
        let accessPatternDefinition = StudentAccessPatternDefinition.studentId(studentId);
        return AccessPattern.create(
            new PartitionKeyExpression("pk",QueryExpressionOperator.EQ,accessPatternDefinition.pk),
            new SortKeyExpression("sk",QueryExpressionOperator.EQ,accessPatternDefinition.sk)
        );
    }

    /**
     * Get the latest Students  Type=ST
     */
    public static all(): AccessPattern {
        // Don't pass the registered date so we can use the wild card BEGINS_WITH operator
        let accessPatternDefinition = StudentAccessPatternDefinition.findRegisteredDate();
        return AccessPattern.create(
            new PartitionKeyExpression("GSI1pk",QueryExpressionOperator.EQ,accessPatternDefinition.pk),
            new SortKeyExpression("GSI1sk",QueryExpressionOperator.BEGINS_WITH,accessPatternDefinition.sk),
            DynamoIndex.GSI_PK1);
    }

    /**
     * Get a range of students based on their created date.
     *
     * @param startDate Start Date of range
     * @param endDate End Date of range (optional, defaults to 30 days from start date
     */
    public static range(startDate: Date, endDate?: Date): AccessPattern {
        assert.ok(startDate, "Start Date is required");

        let _endDate = dayjs(startDate);
        if (!endDate) {
            // Add 30 days to the start date if not provided
            _endDate = dayjs().add(30,'d');
        } else {
            _endDate = dayjs(endDate);
        }

        const accessPatternDefinition: AccessPatternDefinition = StudentAccessPatternDefinition.findRegisteredDate();
        return AccessPattern.create(
            new PartitionKeyExpression("GSI1pk",QueryExpressionOperator.EQ,accessPatternDefinition.pk),
            new SortKeyExpression("GSI1sk",QueryExpressionOperator.BETWEEN,
                DynamoDAO.createKey(accessPatternDefinition.sk,startDate.toISOString()),
                DynamoDAO.createKey(accessPatternDefinition.sk,_endDate.toISOString()),
            ),
            DynamoIndex.GSI_PK1);
    }
}

export class StudentDAO extends DynamoDAO {
    async findLatest(queryOptions: QueryOptions = new QueryOptions([], 100, false)): Promise<ServiceResponse> {
        const accessPattern = StudentAccessPattern.all();
        const query = await this.findByAccessPattern(accessPattern, queryOptions);
        return this.query(query, accessPattern);
    }

    // TODO: Needs addition of more batch operations to be useful
    async findStudentAndTheirTests(studentId: string, queryOptions: QueryOptions = new QueryOptions([], 100, false)): Promise<any> {
        const accessPatterns: AccessPattern[] = [
            StudentAccessPattern.id(studentId)
        ];

        const batchGetTemplate: BatchGetItemInput = this.getBatchGetTemplate(accessPatterns);
        return this.batchGet(batchGetTemplate);
    }

    async findById(studentId: string, nextPage?: string) {
        const accessPattern = StudentAccessPattern.id(studentId);
        const query = await this.findByAccessPattern(accessPattern,new QueryOptions([], 100, false, nextPage));
        return this.query(query, accessPattern);
    }

    async findRange(startDate: Date, endDate?: Date, nextPage?: string) {
        const accessPattern = StudentAccessPattern.range(startDate, endDate);
        const query = await this.findByAccessPattern(accessPattern,new QueryOptions([], 100, false, nextPage));
        return this.query(query, accessPattern);
    }

    async createStudent(obj: StudentEntity, validate: boolean = true): Promise<any> {
        // const id = KSUID.randomSync().string;
        // let accessPatternDefinition = StudentAccessPatternDefinition.studentId(id);
        // obj.setPk(accessPatternDefinition.pk);
        // obj.setSk(accessPatternDefinition.sk);
        // obj.setType(StudentAccessPattern.TYPE);
        // accessPatternDefinition = StudentAccessPatternDefinition.creatingRegisteredDate(id,obj.getRegisteredDate());
        // obj.setGSI1Pk(accessPatternDefinition.pk);
        // obj.setGSI1Sk(accessPatternDefinition.sk)
        // obj.setId(id);
        return super.create(obj, validate, true);
    }

    async txnCreateStudent(obj: StudentEntity, validate: boolean = true): Promise<any> {
        const itemInput:PutItemInput = await this.getCreateTemplate(obj);
        const transactionItem: TransactionItem = new TransactionItem(itemInput,TransactionType.PUT);
        return super.transaction([transactionItem]);
    }
}

export class StudentAttributeDefinition {
    public static FIRST_NAME = EntityColumn.create("firstName","fn", DynamoAttributeType.STRING, isRequired("First Name"));
    public static LAST_NAME = EntityColumn.create("lastName","ln", DynamoAttributeType.STRING, isRequired("Last Name"));
    public static USER_NAME = EntityColumn.create("userName","un", DynamoAttributeType.STRING);
    public static EMAIL = EntityColumn.create("email","eml", DynamoAttributeType.STRING, isValidEmail("Email Address"));
    public static REGISTERED_DATE = EntityColumn.create("registered","regdt", DynamoAttributeType.DATE, isValidDate("Registered Date"));
    public static ID = EntityColumn.create("studentId","stid", DynamoAttributeType.STRING);
}

export class StudentEntity extends Entity {
    private constructor() {
        super();
        this.registerAttribute(StudentAttributeDefinition.FIRST_NAME);
        this.registerAttribute(StudentAttributeDefinition.LAST_NAME);
        this.registerAttribute(StudentAttributeDefinition.EMAIL);
        this.registerAttribute(StudentAttributeDefinition.USER_NAME);
        this.registerAttribute(StudentAttributeDefinition.REGISTERED_DATE);
        this.registerAttribute(StudentAttributeDefinition.ID);
    }

    public static async create(firstName: string,
                               lastName: string,
                               email: string,
                               userName: string,
                               registeredDate: Date = new Date(),
                               id?: string): Promise<StudentEntity> {
        let studentId;

        const studentEntity: StudentEntity = new StudentEntity();
        studentEntity.getAttribute(StudentAttributeDefinition.FIRST_NAME).value = firstName;
        studentEntity.getAttribute(StudentAttributeDefinition.LAST_NAME).value = lastName;
        studentEntity.getAttribute(StudentAttributeDefinition.EMAIL).value = email;
        studentEntity.getAttribute(StudentAttributeDefinition.USER_NAME).value = userName;
        studentEntity.getAttribute(StudentAttributeDefinition.REGISTERED_DATE).value = registeredDate;
        if (id) {
            studentId = id;
        } else {
            studentId = KSUID.randomSync().string;
        }
        studentEntity.getAttribute(StudentAttributeDefinition.ID).value = studentId;

        studentEntity.setCoreDefaults(studentId, StudentAccessPattern.TYPE, (now: Date, type: string) => {
            const accessPatternDefinition = StudentAccessPatternDefinition.creatingRegisteredDate(id, now);
            studentEntity.getAttribute(EntityColumnDefinitions.GSI1PK).value = accessPatternDefinition.pk;
            studentEntity.getAttribute(EntityColumnDefinitions.GSI1SK).value = accessPatternDefinition.sk;
        });

        return studentEntity;
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

    setId(id: string) {
        this.getAttribute(StudentAttributeDefinition.ID).value = id;
    }

    // async isValid(): Promise<void> {
    //     return super.isValid(this);
    // }
}


