import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  deliveryNidUploader: f({
    "application/pdf": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    "image/jpeg": {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    "image/png": {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  }).onUploadComplete(async ({ file }) => {
    return { fileUrl: file.url, fileName: file.name };
  }),
  deliveryEducationUploader: f({
    "application/pdf": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    "image/jpeg": {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    "image/png": {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  }).onUploadComplete(async ({ file }) => {
    return { fileUrl: file.url, fileName: file.name };
  }),
  deliveryCvUploader: f({
    "application/pdf": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  }).onUploadComplete(async ({ file }) => {
    return { fileUrl: file.url, fileName: file.name };
  }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;

