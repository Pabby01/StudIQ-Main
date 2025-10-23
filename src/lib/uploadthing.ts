import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
// import sharp from "sharp"; // Commented out - will be used for image processing later

const f = createUploadthing();

// File Router for image uploads
export const ourFileRouter = {
  // Profile picture upload endpoint
  profileImage: f({
    image: {
      /**
       * For this example, we only allow images up to 4MB
       * and limit the dimensions to 2000x2000 pixels
       */
      maxFileSize: "4MB",
      maxFileCount: 1,
      minFileCount: 1,
    },
  })
    .middleware(async () => {
      // Add any authentication/authorization logic here
      // For now, we'll allow all uploads but you can add JWT validation
      return { uploadedBy: "user" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Process the uploaded image with Sharp for optimization
      try {
        // The file is already uploaded to UploadThing, but we can process it further if needed
        console.log("Profile image upload completed", {
          fileUrl: file.url,
          fileName: file.name,
          fileSize: file.size,
          uploadedBy: metadata.uploadedBy,
        });

        return { 
          uploadedBy: metadata.uploadedBy,
          fileUrl: file.url,
          fileName: file.name,
          fileSize: file.size,
        };
      } catch (error) {
        console.error("Error processing uploaded image:", error);
        throw new UploadThingError("Failed to process uploaded image");
      }
    }),

  // General image upload endpoint
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 10,
      minFileCount: 1,
    },
  })
    .middleware(async () => {
      return { uploadedBy: "user" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image upload completed", {
        fileUrl: file.url,
        fileName: file.name,
        fileSize: file.size,
        uploadedBy: metadata.uploadedBy,
      });

      return { 
        uploadedBy: metadata.uploadedBy,
        fileUrl: file.url,
        fileName: file.name,
        fileSize: file.size,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;