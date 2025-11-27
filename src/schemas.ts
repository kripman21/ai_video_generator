import { z } from 'zod';

// 1. PexelsVideoFileSchema
export const PexelsVideoFileSchema = z.object({
    id: z.number(),
    quality: z.string().nullable(),
    file_type: z.string(),
    width: z.number(),
    height: z.number(),
    link: z.string(),
});

// 2. PexelsVideoSchema
export const PexelsVideoSchema = z.object({
    id: z.number(),
    image: z.string(),
    duration: z.number(),
    url: z.string(),
    user: z.object({
        id: z.number(),
        name: z.string(),
        url: z.string(),
    }),
    video_files: z.array(PexelsVideoFileSchema),
});

// 3. PexelsVideoResponseSchema
export const PexelsVideoResponseSchema = z.object({
    videos: z.array(PexelsVideoSchema),
});

// 4. PexelsImageSrcSchema
export const PexelsImageSrcSchema = z.object({
    original: z.string(),
    large2x: z.string(),
    large: z.string(),
    medium: z.string(),
    small: z.string(),
    portrait: z.string(),
    landscape: z.string(),
    tiny: z.string(),
});

// 5. PexelsImageSchema
export const PexelsImageSchema = z.object({
    id: z.number(),
    width: z.number(),
    height: z.number(),
    url: z.string(),
    photographer: z.string(),
    photographer_url: z.string(),
    photographer_id: z.number(),
    avg_color: z.string(),
    src: PexelsImageSrcSchema,
    alt: z.string(),
});

// 6. PexelsImageResponseSchema
export const PexelsImageResponseSchema = z.object({
    photos: z.array(PexelsImageSchema),
});

// 7. GeminiSceneSchema
export const GeminiSceneSchema = z.object({
    scene_number: z.number(),
    description: z.string(),
    script: z.string(),
});

// 8. GeminiResponseSchema
export const GeminiResponseSchema = z.object({
    scenes: z.array(GeminiSceneSchema),
});
