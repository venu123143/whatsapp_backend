/// <reference types="express-serve-static-core" />
/// <reference types="cookie-parser" />
/// <reference types="express-session" />
/// <reference types="multer" />
export declare const uploadFileToS3: (file: Express.Multer.File) => Promise<string>;
export declare const getFileUrlFromS3: (key: string) => Promise<string>;
export declare const deleteFileFromS3: (key: string) => Promise<import("@aws-sdk/client-s3").DeleteObjectCommandOutput>;
export declare const deleteMultipleFilesFromS3: (keys: string[]) => Promise<import("@aws-sdk/client-s3").DeletedObject[] | undefined>;
