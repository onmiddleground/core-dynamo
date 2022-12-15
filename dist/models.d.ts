export declare class AuthException extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare class ConfigurationException extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare class NotFoundException extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare class ValidationException extends Error {
    readonly err: any;
    readonly statusCode: number;
    constructor(message: string, err: any, statusCode?: number);
}
export declare class ServiceException extends Error {
    readonly err: any;
    readonly statusCode: number;
    constructor(message: string, err: any, statusCode?: number);
}
export declare class DAOResponse {
    private data;
    add(row: any): void;
    getData(): any[];
}
export declare class ServiceResponse {
    statusCode: number;
    private data;
    nextToken?: string;
    message?: string;
    static convert(daoResponse: DAOResponse): ServiceResponse;
    static createSuccess(items: any[], nextToken?: string): ServiceResponse;
    static createFailed(err: any): ServiceResponse;
    static createEmpty(): ServiceResponse;
    addData(item: any): void;
    getData(): any[];
}
export declare class HttpResponse {
    readonly status: number;
    readonly data: any;
    constructor(status: number, data: any);
}
