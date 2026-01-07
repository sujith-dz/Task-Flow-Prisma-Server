import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';
import cloudinary from '../config/cloudinary';
import prisma from '../config/database';
import { Readable } from 'stream';

export const uploadImage = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }

  // Capture userId before the callback to avoid TypeScript errors
  const userId = req.user.userId;

  // Get current user to check for existing image
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { imageUrl: true },
  });

  // Delete previous image from Cloudinary if it exists
  if (currentUser?.imageUrl) {
    try {
      // Extract public_id from the imageUrl or use the known format
      // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
      // Our public_id format: task-flow/users/user-{userId}
      const publicId = `task-flow/users/user-${userId}`;
      
      console.log('Deleting previous image from Cloudinary, public_id:', publicId);
      
      await new Promise<void>((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.warn('Failed to delete previous image from Cloudinary:', error.message);
            // Don't fail the upload if deletion fails, just log a warning
            resolve();
          } else {
            console.log('Previous image deleted successfully:', result);
            resolve();
          }
        });
      });
    } catch (error: any) {
      console.warn('Error deleting previous image:', error.message);
      // Continue with upload even if deletion fails
    }
  }

  // Convert buffer to base64 string for Cloudinary upload
  const base64Image = req.file.buffer.toString('base64');
  const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

  try {
    // Upload to Cloudinary using promise-based approach
    const result = await new Promise<any>((resolve, reject) => {
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
      throw new AppError('Failed to upload image to Cloudinary', 500);
    }

    console.log('Cloudinary upload successful, URL:', result.secure_url);
    console.log('Updating user in database, userId:', userId);

    // Update user's imageUrl in database
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

    console.log('User updated successfully, imageUrl:', user.imageUrl);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: result.secure_url,
        user,
      },
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new AppError(error.message || 'Failed to upload image to Cloudinary', 500);
  }
});

