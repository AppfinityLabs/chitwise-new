import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return withCors(
            NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 }),
            origin
        );
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return withCors(
                NextResponse.json({ error: 'No file provided' }, { status: 400 }),
                origin
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return withCors(
                NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 }),
                origin
            );
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return withCors(
                NextResponse.json({ error: 'File too large. Max 5MB' }, { status: 400 }),
                origin
            );
        }

        // Convert to buffer and upload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const result = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'chitwise/notifications',
                    resource_type: 'image',
                    transformation: [
                        { width: 1200, height: 600, crop: 'limit', quality: 'auto', format: 'auto' }
                    ],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        });

        return withCors(
            NextResponse.json({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
            }),
            origin
        );
    } catch (error: any) {
        console.error('Upload error:', error);
        return withCors(
            NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 }),
            origin
        );
    }
}
