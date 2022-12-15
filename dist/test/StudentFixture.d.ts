import { AccessPattern, AccessPatternDefinition, DynamoDAO, Entity, EntityColumn, QueryOptions } from "../db/dynamo/DynamoDAO";
import { ServiceResponse } from "../models";
export declare class StudentAccessPatternDefinition {
    /**
     * Can be used for all searches using Student IDs or when creating a new Student
     * @param studentId
     */
    static studentId(studentId: string): AccessPatternDefinition;
    /**
     * Used when creating a new student dynamo item
     *
     * @param id Student ID
     * @param registeredDate
     */
    static creatingRegisteredDate(id: string, registeredDate: Date): AccessPatternDefinition;
    /**
     * Supports date search by range and by start or end date searches.
     *
     * @param registeredDate optional When not provided, typically looking for all registered date records
     */
    static findRegisteredDate(registeredDate?: Date): AccessPatternDefinition;
}
export declare class StudentAccessPattern {
    static TYPE: string;
    /**
     * Use the Student ID Access Pattern.
     *
     * @param studentId
     */
    static id(studentId: string): AccessPattern;
    /**
     * Get the latest Students  Type=_ST
     */
    static all(): AccessPattern;
    /**
     * Get a range of students based on their created date.
     *
     * @param startDate Start Date of range
     * @param endDate End Date of range (optional, defaults to 30 days from start date
     */
    static range(startDate: Date, endDate?: Date): AccessPattern;
}
export declare class StudentDAO extends DynamoDAO {
    findLatest(queryOptions?: QueryOptions): Promise<ServiceResponse>;
    findById(studentId: string, nextPage?: string): Promise<ServiceResponse>;
    findRange(startDate: Date, endDate?: Date, nextPage?: string): Promise<ServiceResponse>;
    createStudent(obj: StudentEntity, validate?: boolean): Promise<any>;
    txnCreateStudent(obj: StudentEntity, validate?: boolean): Promise<any>;
}
export declare class StudentAttributeDefinition {
    static FIRST_NAME: EntityColumn;
    static LAST_NAME: EntityColumn;
    static USER_NAME: EntityColumn;
    static EMAIL: EntityColumn;
    static REGISTERED_DATE: EntityColumn;
    static ID: EntityColumn;
}
export declare class StudentEntity extends Entity {
    private constructor();
    static create(firstName: string, lastName: string, email: string, userName: string, registeredDate?: Date, id?: string): Promise<StudentEntity>;
    getFirstName(): any;
    getLastName(): any;
    getEmail(): any;
    getStudentId(): any;
    getRegisteredDate(): any;
    setId(id: string): void;
    isValid(): Promise<void>;
}
