/// <reference types="qs" />
/// <reference types="express" />
import mongoose from "mongoose";
export declare const validateMogodbId: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare function convertStringToObjID(string: string): mongoose.Types.ObjectId;
