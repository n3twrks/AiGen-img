import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await fetch('https://110602490-recraft-20b.gateway.alpha.fal.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${process.env.FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: "square_hd", // ou la taille que vous préférez
        num_inference_steps: 50
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to generate image from FAL AI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.images?.[0]?.url) {
      return NextResponse.json(
        { error: 'No image URL in response from FAL AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl: data.images[0].url });
  } catch (error) {
    console.error('Error in image generation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
} 