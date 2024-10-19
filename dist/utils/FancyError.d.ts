declare class FancyError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export default FancyError;
