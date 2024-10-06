import { Response } from "express";
interface SuccessData {
    status?: number
    message: string;
    [key: string]: any;
}
interface FailureData {
    message: string;
    status?: number;
    [key: string]: any;
}

const RESPONSE = {
    SuccessResponse: (res: Response, status: 200 | 201, data: SuccessData) => {
        return res.status(status).json(data);
    },
    FailureResponse: (res: Response, status: number, data: FailureData) => {
        return res.status(status).json({ ...data, status: status })
    }
};

export default RESPONSE;

// if (skip >= countDocuments) {
//     return RESPONSE.SuccessResponse(res, { message: "This page does not exist" , data:[]});
//   }