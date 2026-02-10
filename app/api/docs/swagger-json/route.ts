import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'swagger.yaml');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const spec = yaml.load(fileContents) as any;
    
    return NextResponse.json(spec);
  } catch (error) {
    console.error('Error loading swagger spec:', error);
    return NextResponse.json(
      { error: 'Failed to load Swagger specification' },
      { status: 500 }
    );
  }
}
