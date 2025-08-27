import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const participantsFilePath = path.join(process.cwd(), 'public/participants.json');

async function readParticipants() {
  console.log('Attempting to read participants from:', participantsFilePath);
  try {
    const data = await fs.readFile(participantsFilePath, 'utf-8');
    console.log('Successfully read participants file. Data length:', data.length);
    return JSON.parse(data);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.warn('participants.json not found. Creating empty file.');
      await fs.writeFile(participantsFilePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    console.error('Error in readParticipants:', error);
    throw error; // Re-throw to be caught by the API route handler
  }
}

async function writeParticipants(participants: any[]) {
  console.log('Attempting to write participants to:', participantsFilePath);
  try {
    await fs.writeFile(participantsFilePath, JSON.stringify(participants, null, 2), 'utf-8');
    console.log('Successfully wrote participants file.');
  } catch (error) {
    console.error('Error in writeParticipants:', error);
    throw error; // Re-throw
  }
}

export async function GET() {
  console.log('GET /api/participants initiated.');
  try {
    const participants = await readParticipants();
    console.log('GET /api/participants succeeded. Returning', participants.length, 'participants.');
    return NextResponse.json(participants);
  } catch (error) {
    console.error('Error in GET /api/participants:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('POST /api/participants initiated.');
  try {
    const newParticipant = await request.json();
    const participants = await readParticipants();
    participants.push({ ...newParticipant, id: crypto.randomUUID(), isApproved: false }); // Ensure new participants are unapproved
    await writeParticipants(participants);
    console.log('POST /api/participants succeeded. New participant added.', newParticipant.id);
    return NextResponse.json(newParticipant, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/participants:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
