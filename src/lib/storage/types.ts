export interface StorageObjectRef {
  bucket: string;
  path: string;
}

export interface StorageUploadOptions {
  contentType?: string;
  upsert?: boolean;
  cacheControl?: string;
}
