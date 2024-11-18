export class DAOException extends Error {
    constructor(message: string, public readonly code: number, public readonly error: any) {
        super(message);
    }
}