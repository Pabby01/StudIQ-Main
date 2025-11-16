import { NextRequest, NextResponse } from 'next/server';
import { validateUserAuth, validatePrivySession } from '@/lib/auth-middleware';
import { secureLogger } from '@/lib/secure-logger';
import { validateImage } from '@/lib/image-upload';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Secure image upload endpoint with authentication and validation
 */
export async function POST(request: NextRequest) {
  try {
    let userId: string;
    let file: File | null = null;
    let uploadType = 'profile';
    let imageData: string | null = null;

    // Check content type to determine parsing method
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Parse as FormData
      const formData = await request.formData();
      userId = (formData.get('user_id') as string) || (formData.get('walletAddress') as string);
      file = formData.get('image') as File;
      uploadType = formData.get('type') as string || 'profile';
    } else if (contentType.includes('application/json')) {
      // Parse as JSON
      const jsonData = await request.json();
      userId = jsonData.user_id;
      imageData = jsonData.image; // Base64 image data
      uploadType = jsonData.type || 'profile';
    } else {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data or application/json' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Validate authentication - try regular auth first, then Privy session
    let authResult = await validateUserAuth(request, userId);
    
    // If primary auth fails, try Privy session validation
    if (!authResult.success) {
      authResult = await validatePrivySession(request, userId);
    }
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Handle file or base64 image data
    let imageUrl: string;
    let fileName: string;
    let fileSize: number;
    let fileType: string;

    if (file) {
      // Handle file upload
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File size exceeds 5MB limit' },
          { status: 400 }
        );
      }

      // Validate image file
      const validationResult = await validateImage(file);
      if (!validationResult.isValid) {
        return NextResponse.json(
          { error: validationResult.error },
          { status: 400 }
        );
      }

      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      
      imageUrl = `data:${file.type};base64,${base64}`;
      fileName = file.name;
      fileSize = file.size;
      fileType = file.type;
    } else if (imageData) {
      // Handle base64 image data
      if (imageData.startsWith('data:')) {
        imageUrl = imageData;
        const matches = imageData.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          fileType = matches[1];
          const base64Data = matches[2];
          fileSize = Buffer.from(base64Data, 'base64').length;
          fileName = 'image.' + fileType.split('/')[1];
        } else {
          return NextResponse.json(
            { error: 'Invalid image data format' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Image data must be in data URL format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'No file or image data provided' },
        { status: 400 }
      );
    }

    // Log successful upload
    secureLogger.info('Image uploaded successfully', {
      userId: userId,
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType,
      uploadType: uploadType,
      imageUrl: imageUrl
    });

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      url: imageUrl,
      fileName: fileName,
      fileSize: fileSize,
      uploadType: uploadType
    });

  } catch (error) {
    secureLogger.error('Image upload failed', { error });
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve uploaded images (for future use)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id parameter is required' },
        { status: 400 }
      );
    }

    // Validate authentication
    const authResult = await validateUserAuth(request, userId);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // In a real implementation, you would retrieve the user's uploaded images
    // For now, return a placeholder response
    return NextResponse.json({
      images: [],
      message: 'Image retrieval not yet implemented'
    });

  } catch (error) {
    secureLogger.error('Image retrieval failed', { error });
    
    return NextResponse.json(
      { error: 'Failed to retrieve images' },
      { status: 500 }
    );
  }
}