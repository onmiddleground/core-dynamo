export class AuthException extends Error {
    constructor(message: string, public readonly statusCode: number = 403) {
        super(message);
    }
}

export class ConfigurationException extends Error {
    constructor(message: string, public readonly statusCode: number = 500) {
        super(message);
    }
}

export class NotFoundException extends Error {
    constructor(message: string, public readonly statusCode: number = 404) {
        super(message);
    }
}

export class ValidationException extends Error {
    constructor(message: string, public readonly err: any, public readonly statusCode: number = 400) {
        super(message);
    }
}

export class ServiceException extends Error {
    constructor(message: string, public readonly err: any, public readonly statusCode: number = 500) {
        super(message);
    }
}

export class DAOResponse {
    private data: any[] = [];

    add(row: any) {
        this.data.push(row);
    }

    getData() {
        return this.data;
    }
}

export class ServiceResponse {
    public statusCode: number;
    private data: any[] = [];
    public nextToken?: string;
    public message?: string;

    static convert(daoResponse: DAOResponse): ServiceResponse {
        let serviceResponse = ServiceResponse.createEmpty();
        if (!daoResponse || !daoResponse.getData() || daoResponse.getData().length === 0) {
            serviceResponse.statusCode = 204;
            serviceResponse.message = "No Data";
        } else {
            serviceResponse = ServiceResponse.createSuccess(daoResponse.getData());
        }
        return serviceResponse;
    }

    // static createSuccess(items: any): ServiceResponse;
    static createSuccess(items: any[], nextToken?: string): ServiceResponse {
        const response = new ServiceResponse();
        response.statusCode = 200;
        response.data = items;
        response.nextToken = nextToken;
        return response;
    }

    static createFailed(err: any): ServiceResponse {
        const response = new ServiceResponse();
        response.statusCode = 500;
        response.message = err;
        response.data = [];
        return response;
    }

    static createEmpty(): ServiceResponse {
        const response = new ServiceResponse();
        response.statusCode = 200;
        response.data = [];
        return response;
    }

    addData(item: any) {
        if (!this.data) {
            this.data = [];
        }
        this.data.push(item);
    }

    hasData() {
        return this.data && this.data.length > 0;
    }

    getData() {
        return [...[],...this.data];
    }
}

export class HttpResponse {
    constructor(public readonly status: number, public readonly data: any) {}
}