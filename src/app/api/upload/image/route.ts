import { NextRequest, NextResponse } from 'next/server';
import { validateWalletSession } from '@/lib/auth-middleware';
import { secureLogger } from '@/lib/secure-logger';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Secure image upload endpoint with wallet authentication
 * Simplified to store base64 encoded images
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let userId: string;
    let imageData: string;
    let uploadType = 'profile';

    if (contentType.includes('application/json')) {
      // Parse JSON request
      const jsonData = await request.json();
      userId = jsonData.user_id || jsonData.walletAddress;
      imageData = jsonData.image;
      uploadType = jsonData.type || 'profile';
    } else {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (!imageData) {
      return NextResponse.json(
        { error: 'image data is required' },
        { status: 400 }
      );
    }

    // Validate wallet session
    const authResult = await validateWalletSession(request, userId);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Validate base64 image data format
    if (!imageData.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Image must be in data URL format' },
        { status: 400 }
      );
    }

    // Extract file info from data URL
    const matches = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid image data format' },
        { status: 400 }
      );
    }

    const fileType = matches[1];
    const base64Data = matches[2];
    const fileSize = Buffer.from(base64Data, 'base64').length;

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Log successful upload
    secureLogger.info('Image uploaded successfully', {
      userId,
      fileSize,
      fileType,
      uploadType
    });

    return NextResponse.json({
      success: true,
      imageUrl: imageData,
      url: imageData,
      fileSize,
      uploadType
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