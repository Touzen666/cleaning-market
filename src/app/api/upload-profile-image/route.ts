import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new NextResponse(JSON.stringify({ message: 'No file provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return new NextResponse(JSON.stringify({ message: 'File must be an image' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return new NextResponse(JSON.stringify({ message: 'File size must be less than 5MB' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `profiles/profile-${timestamp}-${file.name}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Vercel Blob
        const blob = await put(filename, buffer, {
            access: 'public',
            addRandomSuffix: true,
        });

        return NextResponse.json({ success: true, url: blob.url });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new NextResponse(JSON.stringify({
            message: 'Error uploading profile image.',
            error: errorMessage
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
} 