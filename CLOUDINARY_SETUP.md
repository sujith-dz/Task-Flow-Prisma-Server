# Cloudinary Image Upload Setup

This document explains how to set up Cloudinary for user and admin profile image uploads.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Getting Cloudinary Credentials

1. Sign up for a free account at [https://cloudinary.com](https://cloudinary.com)
2. Go to your Dashboard
3. Copy the following values:
   - Cloud Name
   - API Key
   - API Secret

## API Endpoint

### Upload User Image
- **POST** `/users/upload-image`
- **Authentication**: Required (Protected Route)
- **Content-Type**: `multipart/form-data`
- **Body**: Form data with `image` field (file)
- **Max File Size**: 5MB
- **Allowed Types**: Images only (JPG, PNG, etc.)

### Response
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "imageUrl": "https://res.cloudinary.com/...",
    "user": {
      "id": "...",
      "email": "...",
      "name": "...",
      "imageUrl": "https://res.cloudinary.com/...",
      "role": "USER"
    }
  }
}
```

## Features

- Automatic image optimization and resizing (400x400px, face detection)
- Images stored in `task-flow/users` folder on Cloudinary
- Overwrites previous image when user uploads a new one
- Protected route - requires authentication
- File validation (type and size)

