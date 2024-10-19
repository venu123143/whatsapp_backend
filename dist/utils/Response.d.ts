import { Response } from "express";
interface SuccessData {
    status?: number;
    message: string;
    [key: string]: any;
}
interface FailureData {
    message: string;
    status?: number;
    [key: string]: any;
}
declare const RESPONSE: {
    SuccessResponse: (res: Response, status: 200 | 201, data: SuccessData) => Response<any, Record<string, any>>;
    FailureResponse: (res: Response, status: number, data: FailureData) => Response<any, Record<string, any>>;
};
export default RESPONSE;
