import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';
import cloudinary from '../config/cloudinary';
import prisma from '../config/database';

export const uploadTaskDocument = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError('No files provided', 400);
  }

  // Validate file count
  if (files.length > 10) {
    throw new AppError('Maximum 10 files allowed per upload', 400);
  }

  // Validate total size (50MB limit)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = 50 * 1024 * 1024; // 50MB
  if (totalSize > maxTotalSize) {
    throw new AppError('Total file size cannot exceed 50MB', 400);
  }

  const { taskId } = req.body;
  if (!taskId) {
    throw new AppError('Task ID is required', 400);
  }

  // Verify task exists and user has permission
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, assignerId: true, assignees: { select: { userId: true } } },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user is the assigner, an assignee, or an admin
  const isAssigner = task.assignerId === req.user!.userId;
  const isAssignee = task.assignees.some(ta => ta.userId === req.user!.userId);
  const isAdmin = req.user!.role === 'ADMIN';

  if (!isAssigner && !isAssignee && !isAdmin) {
    throw new AppError('You do not have permission to upload documents for this task', 403);
  }

  // Helper function to determine resource type based on mime type
  const getResourceType = (mimeType: string): 'raw' | 'auto' => {
    // Office files and PDFs should use 'raw'
    const rawTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain',
      'text/csv',
    ];
    
    if (rawTypes.includes(mimeType)) {
      return 'raw';
    }
    
    // Images use 'auto'
    if (mimeType.startsWith('image/')) {
      return 'auto';
    }
    
    // Default to 'raw' for other document types
    return 'raw';
  };

  // Upload all files to Cloudinary in parallel
  const uploadPromises = files.map(async (file) => {
    try {
      // Convert buffer to base64 string for Cloudinary upload
      const base64File = file.buffer.toString('base64');
      const dataURI = `data:${file.mimetype};base64,${base64File}`;
      
      const resourceType = getResourceType(file.mimetype);

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload(
          dataURI,
          {
            folder: 'task-flow/docs',
            resource_type: resourceType,
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
      });

      if (!result || !result.secure_url) {
        throw new Error('Failed to upload document to Cloudinary');
      }

      return { file, result, success: true };
    } catch (error: any) {
      console.error(`Error uploading file ${file.originalname}:`, error);
      return { file, error: error.message, success: false };
    }
  });

  // Wait for all uploads to complete
  const uploadResults = await Promise.allSettled(uploadPromises);
  
  // Process successful uploads and create database records
  const successfulUploads: any[] = [];
  const failedUploads: string[] = [];

  for (const result of uploadResults) {
    if (result.status === 'fulfilled' && result.value.success) {
      const { file, result: cloudinaryResult } = result.value;
      
      try {
        // Save document metadata to database
        const document = await prisma.taskDocument.create({
          data: {
            taskId: taskId,
            fileName: file.originalname,
            fileUrl: cloudinaryResult.secure_url,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedBy: req.user!.userId,
          },
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
          },
        });
        
        successfulUploads.push(document);
      } catch (dbError: any) {
        console.error(`Error saving document ${file.originalname} to database:`, dbError);
        failedUploads.push(file.originalname);
      }
    } else {
      const fileName = result.status === 'fulfilled' 
        ? result.value.file.originalname 
        : 'unknown file';
      failedUploads.push(fileName);
    }
  }

  // If all uploads failed, return error
  if (successfulUploads.length === 0) {
    throw new AppError(
      `Failed to upload documents: ${failedUploads.join(', ')}`,
      500
    );
  }

  // Return success with uploaded documents
  const message = successfulUploads.length === files.length
    ? `${successfulUploads.length} document(s) uploaded successfully`
    : `${successfulUploads.length} document(s) uploaded successfully. Failed: ${failedUploads.join(', ')}`;

  res.json({
    success: true,
    message,
    data: successfulUploads,
  });
});

export const deleteTaskDocument = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { documentId } = req.params;

  // Get document with task info
  const document = await prisma.taskDocument.findUnique({
    where: { id: documentId },
    include: {
      task: {
        select: {
          id: true,
          assignerId: true,
          assignees: { select: { userId: true } },
        },
      },
    },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Check permissions
  const isAssigner = document.task.assignerId === req.user!.userId;
  const isAssignee = document.task.assignees.some(ta => ta.userId === req.user!.userId);
  const isAdmin = req.user!.role === 'ADMIN';
  const isUploader = document.uploadedBy === req.user!.userId;

  if (!isAssigner && !isAssignee && !isAdmin && !isUploader) {
    throw new AppError('You do not have permission to delete this document', 403);
  }

  // Extract public_id from Cloudinary URL
  // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
  // or: https://res.cloudinary.com/{cloud_name}/raw/upload/{version}/{public_id}
  try {
    const urlParts = document.fileUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
      // Get the part after 'upload' which contains version/public_id
      const afterUpload = urlParts.slice(uploadIndex + 1).join('/');
      // Remove file extension if present
      const publicId = afterUpload.split('.')[0];

      console.log('Deleting document from Cloudinary, public_id:', publicId);

      await new Promise<void>((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: 'auto' }, (error, result) => {
          if (error) {
            console.warn('Failed to delete document from Cloudinary:', error.message);
            // Continue with database deletion even if Cloudinary deletion fails
            resolve();
          } else {
            console.log('Document deleted from Cloudinary:', result);
            resolve();
          }
        });
      });
    }
  } catch (error: any) {
    console.warn('Error deleting document from Cloudinary:', error.message);
    // Continue with database deletion
  }

  // Delete from database
  await prisma.taskDocument.delete({
    where: { id: documentId },
  });

  res.json({
    success: true,
    message: 'Document deleted successfully',
  });
});

