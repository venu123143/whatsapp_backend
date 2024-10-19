import { Request, Response, NextFunction } from "express";
import FancyError from "../utils/FancyError";
declare const ErrorHandler: (err: FancyError, req: Request, res: Response, next: NextFunction) => void;
export default ErrorHandler;
