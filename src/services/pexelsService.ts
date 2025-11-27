import { PexelsVideo, PexelsImage } from '../types';
import { PexelsVideoResponseSchema, PexelsImageResponseSchema } from '../schemas';

const PEXELS_API_URL = 'https://api.pexels.com/videos';
const PEXELS_IMAGES_API_URL = 'https://api.pexels.com/v1/search';


export async function searchPexelsVideos(query: string, apiKey: string): Promise<PexelsVideo[]> {
  if (!apiKey) {
    throw new Error('Pexels API key is required.');
  }

  try {
    const response = await fetch(
      `${PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=10`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Pexels API key. Please check it and try again.');
      }
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();
    const validatedData = PexelsVideoResponseSchema.parse(data);
    return validatedData.videos;
  } catch (error) {
    console.error('Error searching Pexels videos:', error);
    throw new Error('Failed to search for videos. Please check your Pexels API key and network connection.');
  }
}

export async function searchPexelsImages(query: string, apiKey: string): Promise<PexelsImage[]> {
  if (!apiKey) {
    throw new Error('Pexels API key is required.');
  }

  try {
    const response = await fetch(
      `${PEXELS_IMAGES_API_URL}?query=${encodeURIComponent(query)}&orientation=portrait&per_page=10`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Pexels API key. Please check it and try again.');
      }
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();
    const validatedData = PexelsImageResponseSchema.parse(data);
    return validatedData.photos;
  } catch (error) {
    console.error('Error searching Pexels images:', error);
    throw new Error('Failed to search for images. Please check your Pexels API key and network connection.');
  }
}