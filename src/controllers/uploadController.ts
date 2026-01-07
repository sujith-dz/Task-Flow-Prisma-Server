import { Request, Response, NextFunction } from 'express';
import cloudinary from '../config/cloudinary';
import prisma from '../config/database';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { RequestWithUser } from '../types';

export const uploadImage = asyncHandler(
  async (req: RequestWithUser, res: Response, _next: NextFunction) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError('No image file provided', 400);
    }

    const userId = req.user.userId;

    // Check existing image to remove old Cloudinary asset
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { imageUrl: true },
    });

    if (currentUser?.imageUrl) {
      try {
        const publicId = `task-flow/users/user-${userId}`;
        await new Promise<void>((resolve) => {
          cloudinary.uploader.destroy(publicId, (error) => {
            if (error) {
              console.warn(
                'Failed to delete previous image from Cloudinary:',
                error.message
              );
            }
            resolve();
          });
        });
      } catch (error: any) {
        console.warn('Error deleting previous image:', error.message);
      }
    }

    // Upload new image
    const base64Image = file.buffer.toString('base64');
    const dataURI = `data:${file.mimetype};base64,${base64Image}`;

    try {
      const result: any = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          dataURI,
          {
            folder: 'task-flow/users',
            public_id: `user-${userId}`,
            overwrite: true,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
          },
          (error, uploadResult) => {
            if (error) {
              reject(error);
            } else {
              resolve(uploadResult);
            }
          }
        );
      });

      if (!result || !result.secure_url) {
        throw new AppError('Failed to upload image to Cloudinary', 500);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { imageUrl: result.secure_url },
        select: {
          id: true,
          email: true,
          name: true,
          imageUrl: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: { imageUrl: result.secure_url, user },
      });
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      throw new AppError(
        error.message || 'Failed to upload image to Cloudinary',
        500
      );
    }
  }
);

