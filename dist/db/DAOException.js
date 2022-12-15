"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAOException = void 0;
class DAOException extends Error {
    constructor(message, code, error) {
        super(message);
        this.code = code;
        this.error = error;
    }
}
exports.DAOException = DAOException;
//# sourceMappingURL=DAOException.js.map