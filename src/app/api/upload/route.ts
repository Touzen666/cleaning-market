import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

export async function POST(request: Request) {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public/uploads/apartments');
    const path = join(uploadDir, filename);

    try {
        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        await writeFile(path, buffer);
        console.log(`File uploaded to ${path}`);

        const publicUrl = `/uploads/apartments/${filename}`;
        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ success: false, error: 'Error uploading file.' }, { status: 500 });
    }
} 