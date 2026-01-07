import { Request, Response, NextFunction } from 'express';
import cloudinary from '../config/cloudinary';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { RequestWithUser } from '../types';

export const uploadTaskDocument = asyncHandler(
  async (req: RequestWithUser, res: Response, _next: NextFunction) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    if (files.length > 10) {
      throw new AppError('Maximum 10 files allowed per upload', 400);
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 50 * 1024 * 1024; // 50MB
    if (totalSize > maxTotalSize) {
      throw new AppError('Total file size cannot exceed 50MB', 400);
    }

    const { taskId } = req.body;
    if (!taskId) {
      throw new AppError('Task ID is required', 400);
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        assignerId: true,
        assignees: { select: { userId: true } },
      },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const isAssigner = task.assignerId === req.user.userId;
    const isAssignee = task.assignees.some((ta) => ta.userId === req.user!.userId);
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAssigner && !isAssignee && !isAdmin) {
      throw new AppError(
        'You do not have permission to upload documents for this task',
        403
      );
    }

    const getResourceType = (mimeType: string) => {
      const rawTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
      ];
      if (rawTypes.includes(mimeType)) return 'raw';
      if (mimeType.startsWith('image/')) return 'auto';
      return 'raw';
    };

    const uploadPromises = files.map(async (file) => {
      try {
        const base64File = file.buffer.toString('base64');
        const dataURI = `data:${file.mimetype};base64,${base64File}`;
        const resourceType = getResourceType(file.mimetype);

        const result: any = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload(
            dataURI,
            {
              folder: 'task-flow/docs',
              resource_type: resourceType,
              use_filename: true,
              unique_filename: true,
            },
            (error, uploadResult) => {
              if (error) reject(error);
              else resolve(uploadResult);
            }
          );
        });

        if (!result || !result.secure_url) {
          throw new Error('Failed to upload document to Cloudinary');
        }

        return { file, result, success: true as const };
      } catch (error: any) {
        console.error(`Error uploading file ${file.originalname}:`, error);
        return { file, error: error.message, success: false as const };
      }
    });

    const uploadResults = await Promise.allSettled(uploadPromises);

    const successfulUploads: any[] = [];
    const failedUploads: string[] = [];

    for (const result of uploadResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        const { file, result: cloudinaryResult } = result.value;
        try {
          const document = await prisma.taskDocument.create({
            data: {
              taskId,
              fileName: file.originalname,
              fileUrl: cloudinaryResult.secure_url,
              fileSize: file.size,
              mimeType: file.mimetype,
              uploadedBy: req.user.userId,
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
        } catch (dbError) {
          console.error(
            `Error saving document ${file.originalname} to database:`,
            dbError
          );
          failedUploads.push(file.originalname);
        }
      } else {
        const fileName =
          result.status === 'fulfilled'
            ? result.value.file.originalname
            : 'unknown file';
        failedUploads.push(fileName);
      }
    }

    if (successfulUploads.length === 0) {
      throw new AppError(
        `Failed to upload documents: ${failedUploads.join(', ')}`,
        500
      );
    }

    const message =
      successfulUploads.length === files.length
        ? `${successfulUploads.length} document(s) uploaded successfully`
        : `${successfulUploads.length} document(s) uploaded successfully. Failed: ${failedUploads.join(
            ', '
          )}`;

    res.json({
      success: true,
      message,
      data: successfulUploads,
    });
  }
);

export const deleteTaskDocument = asyncHandler(
  async (req: RequestWithUser, res: Response, _next: NextFunction) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { documentId } = req.params;

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

    const isAssigner = document.task.assignerId === req.user.userId;
    const isAssignee = document.task.assignees.some(
      (ta) => ta.userId === req.user!.userId
    );
    const isAdmin = req.user.role === 'ADMIN';
    const isUploader = document.uploadedBy === req.user.userId;

    if (!isAssigner && !isAssignee && !isAdmin && !isUploader) {
      throw new AppError(
        'You do not have permission to delete this document',
        403
      );
    }

    try {
      const urlParts = document.fileUrl.split('/');
      const uploadIndex = urlParts.findIndex((part) => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
        const afterUpload = urlParts.slice(uploadIndex + 1).join('/');
        const publicId = afterUpload.split('.')[0];

        await new Promise<void>((resolve) => {
          cloudinary.uploader.destroy(
            publicId,
            { resource_type: 'auto' },
            (error) => {
              if (error) {
                console.warn(
                  'Failed to delete document from Cloudinary:',
                  error.message
                );
              }
              resolve();
            }
          );
        });
      }
    } catch (error: any) {
      console.warn('Error deleting document from Cloudinary:', error.message);
    }

    await prisma.taskDocument.delete({ where: { id: documentId } });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  }
);

