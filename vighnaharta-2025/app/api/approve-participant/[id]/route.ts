import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const participantsFilePath = path.join(process.cwd(), 'public/participants.json');

async function readParticipants() {
  try {
    const data = await fs.readFile(participantsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      await fs.writeFile(participantsFilePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    console.error('Error reading participants file:', error);
    return [];
  }
}

async function writeParticipants(participants: any[]) {
  await fs.writeFile(participantsFilePath, JSON.stringify(participants, null, 2), 'utf-8');
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const participants = await readParticipants();
  const participantIndex = participants.findIndex((p: any) => p.id === id);

  if (participantIndex === -1) {
    return NextResponse.json({ message: 'Participant not found' }, { status: 404 });
  }

  participants[participantIndex].isApproved = true;
  await writeParticipants(participants);

  return NextResponse.json(participants[participantIndex]);
}
