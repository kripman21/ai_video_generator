import { Scene, PexelsVideo, CoverSceneConfig, ClosingSceneConfig } from '../types';

export const COVER_DURATION = 100;
export const CLOSING_DURATION = 3000;

// Helper to find the best video URL
export const findBestVideoUrl = (video: PexelsVideo | null): string => {
    if (!video?.video_files) return '';
    const portraitHd = video.video_files.find(f => f.quality === 'hd' && f.height > f.width && f.height >= 1920);
    if (portraitHd) return portraitHd.link;
    const anyPortraitHd = video.video_files.find(f => f.quality === 'hd' && f.height > f.width);
    if (anyPortraitHd) return anyPortraitHd.link;
    const anyPortrait = video.video_files.find(f => f.height > f.width);
    if (anyPortrait) return anyPortrait.link;
    return video.video_files[0]?.link || '';
};

export interface TimelineSegment {
    type: 'cover' | 'scene' | 'closing';
    duration: number;
    scene?: Scene;
    index?: number;
}

export const buildTimeline = (
    scenes: Scene[],
    coverConfig: CoverSceneConfig,
    closingConfig: ClosingSceneConfig
): TimelineSegment[] => {
    const timeline: TimelineSegment[] = [];

    if (coverConfig.enabled) {
        timeline.push({ type: 'cover', duration: COVER_DURATION });
    }

    scenes.forEach((scene, i) => {
        timeline.push({ type: 'scene', scene, duration: scene.duration, index: i });
    });

    if (closingConfig.enabled) {
        timeline.push({ type: 'closing', duration: CLOSING_DURATION });
    }

    return timeline;
};
