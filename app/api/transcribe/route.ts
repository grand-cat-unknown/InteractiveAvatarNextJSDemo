import { AssemblyAI } from 'assemblyai';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    return NextResponse.json(
      { error: 'AssemblyAI API key not configured' }, 
      { status: 500 }
    );
  }

  try {
    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY
    });

    const token = await client.realtime.createTemporaryToken({ 
      expires_in: 300 // Token valid for 5 minutes
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating AssemblyAI temporary token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' }, 
      { status: 500 }
    );
  }
}