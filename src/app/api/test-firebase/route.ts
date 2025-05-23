import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Create a test document
    const testRef = adminDb.collection('_test').doc('connectivity');
    await testRef.set({
      timestamp: new Date(),
      message: 'Firebase connection test'
    });

    // Read it back to verify
    const testDoc = await testRef.get();
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Firebase Admin SDK is configured correctly',
      data: testDoc.data(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Firebase test failed:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Firebase configuration error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 