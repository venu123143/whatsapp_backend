class FancyError extends Error {
    public statusCode: number
    /** Machine readable hint for the client, e.g. ACCESS_TOKEN_EXPIRED. */
    public code?: string

    constructor(message: string, statusCode: number, code?: string) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
    }
}

export default FancyError
