import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const messagesFilePath = path.join(process.cwd(), 'data/messages.json');

async function readMessages() {
  console.log('Attempting to read messages from:', messagesFilePath);
  try {
    const data = await fs.readFile(messagesFilePath, 'utf-8');
    console.log('Successfully read messages file. Data length:', data.length);
    return JSON.parse(data);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.warn('messages.json not found. Creating empty file.');
      await fs.writeFile(messagesFilePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    console.error('Error in readMessages:', error);
    throw error; // Re-throw to be caught by the API route handler
  }
}

async function writeMessages(messages: any[]) {
  console.log('Attempting to write messages to:', messagesFilePath);
  try {
    await fs.writeFile(messagesFilePath, JSON.stringify(messages, null, 2), 'utf-8');
    console.log('Successfully wrote messages file.');
  } catch (error) {
    console.error('Error in writeMessages:', error);
    throw error; // Re-throw
  }
}

export async function GET() {
  console.log('GET /api/messages initiated.');
  try {
    const messages = await readMessages();
    console.log('GET /api/messages succeeded. Returning', messages.length, 'messages.');
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('POST /api/messages initiated.');
  try {
    const newMessage = await request.json();
    const messages = await readMessages();
    messages.push({ 
      ...newMessage, 
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    });
    await writeMessages(messages);
    console.log('POST /api/messages succeeded. New message added.', newMessage.id);
    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}