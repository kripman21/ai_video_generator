import { Scene, BackgroundMusic, ClosingSceneConfig, SubtitleConfig, PexelsVideo, CoverSceneConfig } from '../types';


// Helper to find the best video URL
const findBestVideoUrl = (video: PexelsVideo | null): string => {
    if (!video?.video_files) return '';
    const portraitHd = video.video_files.find(f => f.quality === 'hd' && f.height > f.width && f.height >= 1920);
    if (portraitHd) return portraitHd.link;
    const anyPortraitHd = video.video_files.find(f => f.quality === 'hd' && f.height > f.width);
    if (anyPortraitHd) return anyPortraitHd.link;
    const anyPortrait = video.video_files.find(f => f.height > f.width);
    if (anyPortrait) return anyPortrait.link;
    return video.video_files[0]?.link || '';
};

const imageCache = new Map<string, any>();
const loadImage = (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (imageCache.has(url)) {
            resolve(imageCache.get(url));
            return;
        }
        const img = new (window as any).Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageCache.set(url, img);
            resolve(img);
        };
        img.onerror = () => {
            // Resolve with null so render doesn't fail
            resolve(null);
        };
        img.src = url;
    });
};


const drawSceneOverlay = (ctx: any, config: CoverSceneConfig | ClosingSceneConfig, _subtitleConfig: SubtitleConfig, logoImage: any | null, backgroundImage: any | null = null) => {
    if (!config.enabled) return;

    ctx.save();

    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (backgroundImage && 'backgroundImageUrl' in config && config.backgroundImageUrl) {
        const imgRatio = backgroundImage.width / backgroundImage.height;
        const canvasRatio = ctx.canvas.width / ctx.canvas.height;

        let sx = 0, sy = 0, sWidth = backgroundImage.width, sHeight = backgroundImage.height;

        if (imgRatio > canvasRatio) { // Image is wider than the canvas, crop width
            sWidth = backgroundImage.height * canvasRatio;
            sx = (backgroundImage.width - sWidth) / 2;
        } else { // Image is taller than or same aspect as the canvas, crop height
            sHeight = backgroundImage.width / canvasRatio;
            sy = (backgroundImage.height - sHeight) / 2;
        }

        ctx.drawImage(backgroundImage, sx, sy, sWidth, sHeight, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    if ('overlayEnabled' in config && config.overlayEnabled) {
        ctx.fillStyle = config.overlayColor;
        ctx.globalAlpha = config.overlayOpacity;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1.0;
    }

    const fontWeight = config.fontWeight || 'bold';
    const fontFamily = config.fontFamily || 'sans-serif';

    const drawHighlightedText = (text: string, x: number, y: number, maxWidth: number) => {
        const lineHeight = 60; // Approx 1.2 * font size 50

        // 1. Tokenize text into words with highlight info
        const tokens: { text: string, isHighlight: boolean }[] = [];
        text.split(/(\*.*?\*)/g).filter(Boolean).forEach(part => {
            const isHighlight = part.startsWith('*') && part.endsWith('*');
            const content = isHighlight ? part.slice(1, -1) : part;
            content.split(' ').filter(Boolean).forEach(word => tokens.push({ text: word, isHighlight }));
        });

        // 2. Create lines based on maxWidth
        const lines: { text: string, isHighlight: boolean }[][] = [];
        if (tokens.length > 0) {
            let currentLine: { text: string, isHighlight: boolean }[] = [];
            for (const token of tokens) {
                const testLineText = [...currentLine, token].map(t => t.text).join(' ');
                if (ctx.measureText(testLineText).width > maxWidth && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = [token];
                } else {
                    currentLine.push(token);
                }
            }
            if (currentLine.length > 0) lines.push(currentLine);
        }

        // 3. Draw the lines
        const originalAlign = ctx.textAlign;
        lines.forEach((line, index) => {
            const lineY = y + (index * lineHeight);
            const lineText = line.map(t => t.text).join(' ');
            const totalLineWidth = ctx.measureText(lineText).width;

            let startX;
            if (originalAlign === 'center') {
                startX = x - totalLineWidth / 2;
            } else if (originalAlign === 'right') {
                startX = x - totalLineWidth;
            } else { // left
                startX = x;
            }

            ctx.textAlign = 'left';

            let currentX = startX;
            line.forEach((token, tokenIndex) => {
                const textToDraw = token.text + (tokenIndex < line.length - 1 ? ' ' : '');
                ctx.fillStyle = token.isHighlight ? config.highlightTextColor : config.textColor;
                ctx.fillText(textToDraw, currentX, lineY);
                currentX += ctx.measureText(textToDraw).width;
            });
        });

        ctx.textAlign = originalAlign;
    };

    const contentStack = [];
    if (config.logoUrl && (!('logoEnabled' in config) || config.logoEnabled)) {
        contentStack.push({ type: 'logo', image: logoImage });
    }
    if (config.textEnabled) {
        contentStack.push({ type: 'text' });
    }
    if (config.textPosition === 'above') {
        contentStack.reverse();
    }

    const logoHeight = (logoImage && config.logoUrl && (!('logoEnabled' in config) || config.logoEnabled))
        ? (ctx.canvas.width * (config.logoSize / 100)) / (logoImage.width / logoImage.height)
        : 0;

    ctx.font = `${fontWeight} 50px ${fontFamily}`; // Set font before measuring text
    // A rough estimation for height calculation, actual drawing handles wrapping.
    const textHeight = config.textEnabled
        ? Math.ceil(ctx.measureText(config.text.replace(/\*/g, '')).width / (ctx.canvas.width - 100)) * 60
        : 0;

    const totalContentHeight = logoHeight + textHeight + (logoHeight > 0 && textHeight > 0 ? 20 : 0);
    let currentY = (ctx.canvas.height - totalContentHeight) / 2;

    contentStack.forEach(item => {
        if (item.type === 'logo' && item.image) {
            const currentLogoHeight = (ctx.canvas.width * (config.logoSize / 100)) / (item.image.width / item.image.height);
            const logoX = (ctx.canvas.width - (ctx.canvas.width * (config.logoSize / 100))) / 2;
            ctx.drawImage(item.image, logoX, currentY, ctx.canvas.width * (config.logoSize / 100), currentLogoHeight);
            currentY += currentLogoHeight + 20;
        }
        if (item.type === 'text') {
            ctx.font = `${fontWeight} 50px ${fontFamily}`;
            ctx.textAlign = config.textAlign;
            ctx.textBaseline = 'top';
            const textX = { 'left': 50, 'center': ctx.canvas.width / 2, 'right': ctx.canvas.width - 50 }[config.textAlign];

            drawHighlightedText(config.text, textX, currentY, ctx.canvas.width - 100);
        }
    });

    ctx.restore();
}

/**
 * Renders a video by iterating through each frame for maximum precision.
 * This frame-by-frame method manually seeks video elements to the exact time
 * required for each canvas draw, eliminating timing-related glitches, stutters,
 * and incorrect transitions. It ensures a perfectly smooth final output.
 */
async function renderVideoMainThread(
    scenes: Scene[],
    backgroundMusic: BackgroundMusic | null,
    coverSceneConfig: CoverSceneConfig,
    closingSceneConfig: ClosingSceneConfig,
    subtitleConfig: SubtitleConfig,
    onProgress: (progress: number, message: string) => void
): Promise<void> {

    let audioContext: any = null;
    const videoElements: any[] = [];
    let mediaRecorder: any = null;
    let bgMusicSource: any = null;
    let videoTrack: any = null;
    let audioTrack: any = null;

    try {
        onProgress(0, 'Inicializando renderizador...');

        const WIDTH = 720;
        const HEIGHT = 1280;
        const FRAME_RATE = 30;
        const VIDEO_BITRATE = 15000000; // 15 Mbps
        const COVER_DURATION = 100;
        const CLOSING_DURATION = 3000;
        const FRAME_DURATION_MS = 1000 / FRAME_RATE;
        const TRANSITION_DURATION_MS = 800;

        // 1. Setup Canvas
        const canvas = (window as any).document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Could not create canvas context');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // 2. Setup Audio
        audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        const destinationNode = audioContext.createMediaStreamDestination();

        if (backgroundMusic) {
            try {
                const response = await fetch(backgroundMusic.url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                bgMusicSource = audioContext.createBufferSource();
                bgMusicSource.buffer = audioBuffer;
                bgMusicSource.loop = true;
                const bgMusicGainNode = audioContext.createGain();
                bgMusicGainNode.gain.value = backgroundMusic.volume;
                bgMusicSource.connect(bgMusicGainNode);
                bgMusicGainNode.connect(destinationNode);
            } catch (e) { console.error("Failed to load background music", e); }
        }

        const ttsAudioElement = new (window as any).Audio();
        ttsAudioElement.crossOrigin = 'anonymous';
        const ttsSourceNode = audioContext.createMediaElementSource(ttsAudioElement);
        ttsSourceNode.connect(destinationNode);

        // 3. Setup Video Elements
        const createVideoElement = (): any => {
            const video = (window as any).document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.playsInline = true;
            (video as any).style.position = 'fixed'; (video as any).style.left = '-9999px'; (video as any).style.top = '-9999px';
            (window as any).document.body.appendChild(video);
            videoElements.push(video);
            return video;
        };

        const drawVideoToCanvas = (context: any, videoEl: any) => {
            if (videoEl && videoEl.videoWidth > 0 && videoEl.readyState > 2) {
                const videoRatio = videoEl.videoWidth / videoEl.videoHeight;
                const canvasRatio = WIDTH / HEIGHT;
                let w = WIDTH, h = HEIGHT, x = 0, y = 0;
                if (videoRatio > canvasRatio) { h = w / videoRatio; y = (HEIGHT - h) / 2; }
                else { w = h * videoRatio; x = (WIDTH - w) / 2; }
                context.drawImage(videoEl, x, y, w, h);
            }
        };

        // 4. Setup MediaRecorder
        const canvasStream = canvas.captureStream(0); // must be 0 for requestFrame
        videoTrack = canvasStream.getVideoTracks()[0];
        audioTrack = destinationNode.stream.getAudioTracks()[0];
        const combinedStream = new (window as any).MediaStream([videoTrack, audioTrack]);

        const recordedChunks: Blob[] = [];
        mediaRecorder = new (window as any).MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9,opus', videoBitsPerSecond: VIDEO_BITRATE });
        mediaRecorder.ondataavailable = (e: any) => e.data.size > 0 && recordedChunks.push(e.data);
        const recorderStopped = new Promise(res => mediaRecorder.onstop = res);

        const seekVideo = (videoEl: any, time: number): Promise<void> => {
            return new Promise(resolve => {
                // Optimización: Si ya estamos cerca del tiempo objetivo, no hacer seek
                if (Math.abs(videoEl.currentTime - time) < 0.1) {
                    resolve();
                    return;
                }
                videoEl.onseeked = () => resolve();
                videoEl.currentTime = time;
            });
        };

        const loadVideo = (videoEl: any, url: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                if (!url) return resolve(); // Resolve if no video URL
                if (videoEl.src === url && videoEl.readyState > 2) return resolve();
                videoEl.oncanplay = () => resolve();
                videoEl.onerror = () => reject(new Error(`Failed to load video: ${url}`));
                videoEl.src = url;
            });
        };

        const drawSubtitles = (scene: Scene, alpha: number = 1.0) => {
            if (!scene || !scene.script || !ctx || alpha <= 0) return;

            ctx.save();

            const applyAlphaToHex = (hex: string, a: number) => {
                if (!hex.startsWith('#')) return hex;
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${a})`;
            };

            ctx.font = `${subtitleConfig.fontWeight} ${subtitleConfig.fontSize}px ${subtitleConfig.fontFamily}`;
            if (subtitleConfig.shadowConfig.enabled) {
                ctx.shadowColor = applyAlphaToHex(subtitleConfig.shadowConfig.color, alpha);
                ctx.shadowOffsetX = subtitleConfig.shadowConfig.offsetX;
                ctx.shadowOffsetY = subtitleConfig.shadowConfig.offsetY;
                ctx.shadowBlur = subtitleConfig.shadowConfig.blur;
            }

            // 1. Tokenize
            const tokens: { text: string, isHighlight: boolean }[] = [];
            scene.script.split(/(\*.*?\*)/g).filter(Boolean).forEach(part => {
                const isHighlight = part.startsWith('*') && part.endsWith('*');
                const content = isHighlight ? part.slice(1, -1) : part;
                content.split(' ').filter(Boolean).forEach(word => tokens.push({ text: word, isHighlight }));
            });

            // 2. Wrap
            const maxWidth = WIDTH - 100;
            const lines: { text: string, isHighlight: boolean }[][] = [];
            if (tokens.length > 0) {
                let currentLine: { text: string, isHighlight: boolean }[] = [];
                for (const token of tokens) {
                    const testLineText = [...currentLine, token].map(t => t.text).join(' ');
                    if (ctx.measureText(testLineText).width > maxWidth && currentLine.length > 0) {
                        lines.push(currentLine);
                        currentLine = [token];
                    } else {
                        currentLine.push(token);
                    }
                }
                lines.push(currentLine);
            }
            if (lines.length === 0) {
                ctx.restore();
                return;
            }

            // 3. Draw
            const lineHeight = subtitleConfig.fontSize * 1.2;
            const totalTextHeight = lines.length * lineHeight;
            let startY;
            if (subtitleConfig.verticalAlign === 'top') { ctx.textBaseline = 'top'; startY = 50; }
            else if (subtitleConfig.verticalAlign === 'middle') { ctx.textBaseline = 'top'; startY = (HEIGHT / 2) - (totalTextHeight / 2); }
            else { ctx.textBaseline = 'bottom'; startY = HEIGHT - 50 - totalTextHeight + lineHeight; }

            const originalAlign = subtitleConfig.textAlign;

            lines.forEach((line, i) => {
                const lineY = startY + (i * lineHeight);
                const lineText = line.map(t => t.text).join(' ');
                const totalLineWidth = ctx.measureText(lineText).width;

                let currentX;
                if (originalAlign === 'center') {
                    currentX = (WIDTH - totalLineWidth) / 2;
                } else if (originalAlign === 'right') {
                    currentX = WIDTH - 50 - totalLineWidth;
                } else {
                    currentX = 50;
                }

                line.forEach((token, tokenIndex) => {
                    const textToDraw = token.text + (tokenIndex < line.length - 1 ? ' ' : '');
                    ctx.fillStyle = applyAlphaToHex(token.isHighlight ? subtitleConfig.highlightTextColor : subtitleConfig.textColor, alpha);
                    ctx.fillText(textToDraw, currentX, lineY);
                    currentX += ctx.measureText(textToDraw).width;
                });
            });

            ctx.restore();
        };

        // 5. Build Timeline
        const timeline: any[] = [];
        let accumulatedTime = 0;
        if (coverSceneConfig.enabled) {
            timeline.push({ type: 'cover', duration: COVER_DURATION });
            accumulatedTime += COVER_DURATION;
        }
        scenes.forEach((scene, i) => {
            timeline.push({ type: 'scene', scene, duration: scene.duration, index: i });
            accumulatedTime += scene.duration;
        });
        if (closingSceneConfig.enabled) {
            timeline.push({ type: 'closing', duration: CLOSING_DURATION });
            accumulatedTime += CLOSING_DURATION;
        }
        const totalDuration = accumulatedTime;
        onProgress(5, 'Calculando línea de tiempo...');

        // 6. Preload all videos and logos
        onProgress(10, 'Precargando recursos...');
        const uniqueVideos = [...new Set(scenes.map(s => findBestVideoUrl(s.video)).filter(Boolean))];
        const videoElCache = new Map<string, any>();
        await Promise.all(uniqueVideos.map(async (url) => {
            const videoEl = createVideoElement();
            await loadVideo(videoEl, url);
            videoElCache.set(url, videoEl);
        }));

        let coverLogoImage = null;
        if (coverSceneConfig.enabled && coverSceneConfig.logoUrl && coverSceneConfig.logoEnabled) {
            coverLogoImage = await loadImage(coverSceneConfig.logoUrl);
        }
        let coverBackgroundImage = null;
        if (coverSceneConfig.enabled && coverSceneConfig.backgroundImageUrl) {
            coverBackgroundImage = await loadImage(coverSceneConfig.backgroundImageUrl);
        }
        let closingLogoImage = null;
        if (closingSceneConfig.enabled && closingSceneConfig.logoUrl) {
            closingLogoImage = await loadImage(closingSceneConfig.logoUrl);
        }


        // 7. Render Frame by Frame
        onProgress(20, 'Iniciando renderizado de fotogramas...');
        mediaRecorder.start();
        bgMusicSource?.start(0);

        let currentTime = 0;
        let timeInSegment = 0;

        for (const segment of timeline) {
            ttsAudioElement.pause();
            if (segment.type === 'scene' && segment.scene.audioUrl) {
                ttsAudioElement.src = segment.scene.audioUrl;
                ttsAudioElement.currentTime = 0;
                ttsAudioElement.play();
            }

            const segmentFrames = Math.round(segment.duration / FRAME_DURATION_MS);
            for (let i = 0; i < segmentFrames; i++) {
                timeInSegment = i * FRAME_DURATION_MS;
                const progress = 20 + (currentTime / totalDuration) * 75;
                onProgress(progress, `Renderizando... ${Math.round(currentTime / 1000)}s / ${Math.round(totalDuration / 1000)}s`);

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                if (segment.type === 'cover') {
                    drawSceneOverlay(ctx, coverSceneConfig, subtitleConfig, coverLogoImage, coverBackgroundImage);
                } else if (segment.type === 'closing') {
                    drawSceneOverlay(ctx, closingSceneConfig, subtitleConfig, closingLogoImage);
                } else if (segment.type === 'scene') {
                    const prevSceneSegment = timeline.find(s => s.type === 'scene' && s.index === segment.index - 1);
                    const isTransitioning = prevSceneSegment && timeInSegment < TRANSITION_DURATION_MS;

                    if (isTransitioning) {
                        const transitionProgress = timeInSegment / TRANSITION_DURATION_MS;

                        // 1. Draw previous scene (fading out)
                        const prevVideoEl = videoElCache.get(findBestVideoUrl(prevSceneSegment.scene.video));
                        if (prevVideoEl) {
                            const timeInPrevScene = prevSceneSegment.duration - (TRANSITION_DURATION_MS - timeInSegment);
                            await seekVideo(prevVideoEl, (timeInPrevScene / 1000) % prevVideoEl.duration);
                            ctx.globalAlpha = 1.0 - transitionProgress;
                            drawVideoToCanvas(ctx, prevVideoEl);
                        }

                        // 2. Draw current scene (fading in)
                        const currentVideoEl = videoElCache.get(findBestVideoUrl(segment.scene.video));
                        if (currentVideoEl) {
                            await seekVideo(currentVideoEl, (timeInSegment / 1000) % currentVideoEl.duration);
                            ctx.globalAlpha = transitionProgress;
                            drawVideoToCanvas(ctx, currentVideoEl);
                        }

                        ctx.globalAlpha = 1.0; // Reset alpha

                        // 3. Draw subtitles for both scenes
                        drawSubtitles(prevSceneSegment.scene, 1.0 - transitionProgress);
                        drawSubtitles(segment.scene, transitionProgress);

                    } else {
                        // Normal drawing for the scene
                        const videoEl = videoElCache.get(findBestVideoUrl(segment.scene.video));
                        if (videoEl) {
                            const sceneTimeSec = timeInSegment / 1000;
                            await seekVideo(videoEl, sceneTimeSec % videoEl.duration);
                            drawVideoToCanvas(ctx, videoEl);
                        }
                        drawSubtitles(segment.scene, 1.0);
                    }
                }

                (videoTrack as any).requestFrame();
                currentTime += FRAME_DURATION_MS;
            }
        }

        onProgress(95, 'Finalizando grabación...');
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        await recorderStopped;

        onProgress(100, 'Video listo para descargar...');
        const finalBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(finalBlob);
        const a = (window as any).document.createElement('a');
        a.href = url;
        a.download = 'ai-generated-video.webm';
        a.click();
        URL.revokeObjectURL(url);
    } finally {
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        if (videoTrack) videoTrack.stop();
        if (audioTrack) audioTrack.stop();
        bgMusicSource?.stop();
        audioContext?.close().catch((e: any) => console.error("Error closing audio context", e));
        videoElements.forEach(v => (v as any).parentNode?.removeChild(v));
        imageCache.clear();
    }
}

async function renderVideoWithWorker(
    scenes: Scene[],
    backgroundMusic: BackgroundMusic | null,
    coverSceneConfig: CoverSceneConfig,
    closingSceneConfig: ClosingSceneConfig,
    subtitleConfig: SubtitleConfig,
    onProgress: (progress: number, message: string) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('../workers/render.worker.ts', import.meta.url), { type: 'module' });

        const canvas = new OffscreenCanvas(720, 1280);

        worker.onmessage = (event) => {
            const { type, progress, message, error, data } = event.data;
            if (type === 'progress') {
                onProgress(progress, message);
            } else if (type === 'log') {
                console.log(`👷 [WORKER]:`, message, data || '');
            } else if (type === 'complete') {
                // 1. Extraer la URL del blob generado por el worker
                const { url } = event.data;

                // 2. Crear un elemento temporal para forzar la descarga
                const a = document.createElement('a');
                a.href = url;
                a.download = 'video-generado.mp4'; // Intentamos nombrar como MP4 (el navegador manejará el codec interno)
                document.body.appendChild(a);
                a.click();

                // 3. Limpieza
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                // 4. Cerrar proceso
                worker.terminate();
                resolve();
            } else if (type === 'error') {
                worker.terminate();
                reject(new Error(error));
            }
        };

        worker.onerror = (error) => {
            worker.terminate();
            reject(error);
        };

        worker.postMessage({
            type: 'start',
            scenes,
            backgroundMusic,
            coverConfig: coverSceneConfig,
            closingConfig: closingSceneConfig,
            subtitleConfig,
            canvas
        }, [canvas]);
    });
}

export async function renderVideo(
    scenes: Scene[],
    backgroundMusic: BackgroundMusic | null,
    coverSceneConfig: CoverSceneConfig,
    closingSceneConfig: ClosingSceneConfig,
    subtitleConfig: SubtitleConfig,
    onProgress: (progress: number, message: string) => void
): Promise<void> {
    const supportsOffscreen = 'OffscreenCanvas' in window && 'VideoDecoder' in window;

    if (supportsOffscreen) {
        console.log("Modo: Worker");
        try {
            return await renderVideoWithWorker(scenes, backgroundMusic, coverSceneConfig, closingSceneConfig, subtitleConfig, onProgress);
        } catch (e) {
            console.error("Worker rendering failed, falling back to main thread", e);
            console.log("Modo: Main Thread (Fallback)");
            return renderVideoMainThread(scenes, backgroundMusic, coverSceneConfig, closingSceneConfig, subtitleConfig, onProgress);
        }
    } else {
        console.log("Modo: Main Thread");
        return renderVideoMainThread(scenes, backgroundMusic, coverSceneConfig, closingSceneConfig, subtitleConfig, onProgress);
    }
}