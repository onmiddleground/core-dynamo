"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpResponse = exports.ServiceResponse = exports.DAOResponse = exports.ServiceException = exports.ValidationException = exports.NotFoundException = exports.ConfigurationException = exports.AuthException = void 0;
class AuthException extends Error {
    constructor(message, statusCode = 403) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AuthException = AuthException;
class ConfigurationException extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.ConfigurationException = ConfigurationException;
class NotFoundException extends Error {
    constructor(message, statusCode = 404) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.NotFoundException = NotFoundException;
class ValidationException extends Error {
    constructor(message, err, statusCode = 400) {
        super(message);
        this.err = err;
        this.statusCode = statusCode;
    }
}
exports.ValidationException = ValidationException;
class ServiceException extends Error {
    constructor(message, err, statusCode = 500) {
        super(message);
        this.err = err;
        this.statusCode = statusCode;
    }
}
exports.ServiceException = ServiceException;
class DAOResponse {
    constructor() {
        this.data = [];
    }
    add(row) {
        this.data.push(row);
    }
    getData() {
        return this.data;
    }
}
exports.DAOResponse = DAOResponse;
class ServiceResponse {
    constructor() {
        this.data = [];
    }
    static convert(daoResponse) {
        let serviceResponse = ServiceResponse.createEmpty();
        if (!daoResponse || !daoResponse.getData() || daoResponse.getData().length === 0) {
            serviceResponse.statusCode = 204;
            serviceResponse.message = "No Data";
        }
        else {
            serviceResponse = ServiceResponse.createSuccess(daoResponse.getData());
        }
        return serviceResponse;
    }
    // static createSuccess(items: any): ServiceResponse;
    static createSuccess(items, nextToken) {
        const response = new ServiceResponse();
        response.statusCode = 200;
        response.data = items;
        response.nextToken = nextToken;
        return response;
    }
    static createFailed(err) {
        const response = new ServiceResponse();
        response.statusCode = 500;
        response.message = err;
        response.data = [];
        return response;
    }
    static createEmpty() {
        const response = new ServiceResponse();
        response.statusCode = 200;
        response.data = [];
        return response;
    }
    addData(item) {
        if (!this.data) {
            this.data = [];
        }
        this.data.push(item);
    }
    getData() {
        return [...[], ...this.data];
    }
}
exports.ServiceResponse = ServiceResponse;
class HttpResponse {
    constructor(status, data) {
        this.status = status;
        this.data = data;
    }
}
exports.HttpResponse = HttpResponse;
//# sourceMappingURL=models.js.map