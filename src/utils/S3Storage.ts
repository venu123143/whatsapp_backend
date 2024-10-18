import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import fs from "fs"

const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.S3_ENDPOINT as string,
    credentials: {
        accessKeyId: process.env.S3_TOKEN_ID as string,
        secretAccessKey: process.env.S3_SECRET_KEY as string,
        accountId: process.env.S3_ACCOUNT_ID as string
    }
});

export const uploadFileToS3 = async (file: Express.Multer.File) => {
    const readStream = fs.createReadStream(file.path as string);
    const params = {
        Bucket: process.env.S3_BUCKET_NAME as string,
        Key: file.filename,
        Body: readStream,
        ContentType: file.mimetype,
    };
    const command = new PutObjectCommand(params);
    await s3.send(command);
    return file.filename;
};


export const getFileUrlFromS3 = async (key: string) => {
    const publicUrl = `https://pub-1dcaf054bca64dc586ed8817e6affbd4.r2.dev/${key}`
    return publicUrl;
};

export const deleteFileFromS3 = async (key: string) => {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME as string,
        Key: key,
    };
    const command = new DeleteObjectCommand(params);

    try {
        const result = await s3.send(command);
        return result
    } catch (error: any) {
        throw new Error("Unable to delete file from S3");
    }
};

export const deleteMultipleFilesFromS3 = async (keys: string[]) => {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME as string,
        Delete: {
            Objects: keys.map((key) => ({ Key: key })),
        },
    };
    const command = new DeleteObjectsCommand(params);

    try {
        const response = await s3.send(command);
        console.log(`Files deleted successfully: ${keys}`);
        return response.Deleted;
    } catch (error: any) {
        console.error(`Error deleting multiple files: ${keys}`, error);
        throw new Error("Unable to delete files from S3");
    }
};



