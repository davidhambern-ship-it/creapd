import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // Fetch the font file from Google Drive
    const response = await fetch('https://drive.google.com/uc?export=download&id=1Ld1iKqLon71BNMWSJKF3_ZwbNpUA8yvw');
    
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch font' }, { status: 502 });
    }

    const fontBytes = await response.arrayBuffer();

    return new Response(fontBytes, {
      status: 200,
      headers: {
        'Content-Type': 'font/ttf',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});