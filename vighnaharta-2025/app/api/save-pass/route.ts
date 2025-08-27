// app/api/save-pass/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs'; // Use promises API for async file operations

interface Participant {
  name: string;
  flatNumber: string;
  imageUrl: string;
  id: string;
}

// Helper function to check if a file exists asynchronously
async function fileExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { imageData, filename, name, flatNumber } = await request.json();

    if (!imageData || !filename || !name || !flatNumber) {
      return NextResponse.json({ message: 'Missing imageData, filename, name, or flatNumber' }, { status: 400 });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const publicDirectory = path.join(process.cwd(), 'public');
    const filePath = path.join(publicDirectory, filename);

    // Ensure the public directory exists (optional, but good practice)
    if (!(await fileExists(publicDirectory))) {
      await fs.mkdir(publicDirectory, { recursive: true });
    }

    await fs.writeFile(filePath, buffer);

    // Handle participants.json
    const participantsFilePath = path.join(publicDirectory, 'participants.json');
    let participants: Participant[] = [];

    if (await fileExists(participantsFilePath)) {
      const participantsData = await fs.readFile(participantsFilePath, 'utf-8');
      participants = JSON.parse(participantsData);
    }

    const newParticipant: Participant = {
      name: name,
      flatNumber: flatNumber,
      imageUrl: `/` + filename, // Adjust path as needed for public access
      id: Date.now().toString(), // Simple unique ID
    };

    participants.push(newParticipant);

    await fs.writeFile(participantsFilePath, JSON.stringify(participants, null, 2));

    return NextResponse.json({ message: 'Pass and participant saved successfully', filePath, participant: newParticipant });
  } catch (error) {
    console.error('Error saving pass:', error);
    return NextResponse.json({ message: 'Error saving pass' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, imageData, filename, name, flatNumber } = await request.json();

    if (!id || !imageData || !filename || !name || !flatNumber) {
      return NextResponse.json({ message: 'Missing id, imageData, filename, name, or flatNumber' }, { status: 400 });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const publicDirectory = path.join(process.cwd(), 'public');
    const participantsFilePath = path.join(publicDirectory, 'participants.json');

    let participants: Participant[] = [];
    if (await fileExists(participantsFilePath)) {
      const participantsData = await fs.readFile(participantsFilePath, 'utf-8');
      participants = JSON.parse(participantsData);
    }

    const participantIndex = participants.findIndex(p => p.id === id);

    if (participantIndex === -1) {
      return NextResponse.json({ message: 'Participant not found' }, { status: 404 });
    }

    const existingParticipant = participants[participantIndex];

    // Delete old image if it exists and is different from the new one
    const oldImageUrl = existingParticipant.imageUrl;
    const oldFilename = oldImageUrl.startsWith('/') ? oldImageUrl.substring(1) : oldImageUrl;
    const oldFilePath = path.join(publicDirectory, oldFilename);

    if (oldImageUrl && oldFilename !== filename) { // Only delete if a new file is being uploaded
      try {
        await fs.unlink(oldFilePath);
        console.log(`Deleted old image: ${oldFilePath}`);
      } catch (unlinkError: any) {
        if (unlinkError.code === 'ENOENT') {
          console.warn(`Old image not found, skipping deletion: ${oldFilePath}`);
        } else {
          console.error(`Error deleting old image ${oldFilePath}:`, unlinkError);
        }
      }
    }

    // Save new image
    const newFilePath = path.join(publicDirectory, filename);
    await fs.writeFile(newFilePath, buffer);

    const updatedParticipant: Participant = {
      ...existingParticipant,
      name: name,
      flatNumber: flatNumber,
      imageUrl: `/` + filename,
    };

    participants[participantIndex] = updatedParticipant;

    await fs.writeFile(participantsFilePath, JSON.stringify(participants, null, 2));

    return NextResponse.json({ message: 'Participant updated successfully', participant: updatedParticipant });
  } catch (error) {
    console.error('Error updating pass:', error);
    return NextResponse.json({ message: 'Error updating pass' }, { status: 500 });
  }
}