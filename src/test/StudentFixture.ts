import {
    AccessPattern,
    AccessPatternDefinition,
    DynamoDAO,
    DynamoIndex,
    Entity,
    EntityColumn,
    PartitionKeyExpression,
    QueryExpressionOperator,
    QueryOptions,
    SortKeyExpression,
    TransactionItem,
    TransactionType
} from "../db/dynamo/DynamoDAO";
import {ServiceResponse} from "@icarus/models";
import {DocumentClient} from "aws-sdk/clients/dynamodb";
import assert = require("assert");
import dayjs = require("dayjs");

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
    public static TYPE: string = "_ST";

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
     * Get the latest Students  Type=_ST
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

    async createStudent(obj: Student, validate: boolean = true): Promise<any> {
        const id = KSUID.randomSync().string;

        let accessPatternDefinition = StudentAccessPatternDefinition.studentId(id);
        obj.setPk(accessPatternDefinition.pk);
        obj.setSk(accessPatternDefinition.sk);
        obj.setType(StudentAccessPattern.TYPE);

        accessPatternDefinition = StudentAccessPatternDefinition.creatingRegisteredDate(id,obj.getRegisteredDate());
        obj.setGSI1Pk(accessPatternDefinition.pk);
        obj.setGSI1Sk(accessPatternDefinition.sk)

        obj.setId(id);
        return super.create(obj, validate, true);
    }

    async txnCreateStudent(obj: Student, validate: boolean = true): Promise<any> {
        const id = KSUID.randomSync().string;

        let accessPatternDefinition = StudentAccessPatternDefinition.studentId(id);
        obj.setPk(accessPatternDefinition.pk);
        obj.setSk(accessPatternDefinition.sk);
        obj.setType(StudentAccessPattern.TYPE);

        accessPatternDefinition = StudentAccessPatternDefinition.creatingRegisteredDate(id,obj.getRegisteredDate());
        obj.setGSI1Pk(accessPatternDefinition.pk);
        obj.setGSI1Sk(accessPatternDefinition.sk)

        obj.setId(id);
        const itemInput:DocumentClient.PutItemInput = await this.getCreateParams(obj, validate, true);
        const transactionItem: TransactionItem = new TransactionItem(itemInput,TransactionType.PUT);
        return super.transaction([transactionItem]);
    }
}

export class StudentAttributeDefinition {
    public static FIRST_NAME = EntityColumn.create("firstName","fn");
    public static LAST_NAME = EntityColumn.create("lastName","ln");
    public static USER_NAME = EntityColumn.create("userName","un");
    public static EMAIL = EntityColumn.create("email","eml");
    public static REGISTERED_DATE = EntityColumn.create("registered","regdt");
    public static ID = EntityColumn.create("studentId","stid");
}

export class Student extends Entity {
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
                               id?: string): Promise<Student> {
        const studentEntity: Student = new Student();
        studentEntity.getAttribute(StudentAttributeDefinition.FIRST_NAME).value = firstName;
        studentEntity.getAttribute(StudentAttributeDefinition.LAST_NAME).value = lastName;
        studentEntity.getAttribute(StudentAttributeDefinition.EMAIL).value = email;
        studentEntity.getAttribute(StudentAttributeDefinition.USER_NAME).value = userName;
        studentEntity.getAttribute(StudentAttributeDefinition.REGISTERED_DATE).value = registeredDate;
        if (id) {
            studentEntity.getAttribute(StudentAttributeDefinition.ID).value = lastName;
        }

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

    async isValid(): Promise<void> {
        return super.isValid(this);
    }
}


