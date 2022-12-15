export declare class DAOException extends Error {
    readonly code: number;
    readonly error: any;
    constructor(message: string, code: number, error: any);
}
