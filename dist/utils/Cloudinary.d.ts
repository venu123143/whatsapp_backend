export declare const uploadImage: (filePath: string) => Promise<{
    url: string;
    asset_id: any;
    public_id: string;
}>;
export declare const deleteImage: (public_id: string) => Promise<{
    url: any;
    asset_id: any;
    public_id: any;
}>;
