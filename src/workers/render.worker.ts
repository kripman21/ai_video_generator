import { Scene, CoverSceneConfig, ClosingSceneConfig, SubtitleConfig, BackgroundMusic } from '../types';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { VideoReader } from '../utils/VideoReader';
import { buildTimeline, TimelineSegment, findBestVideoUrl } from '../utils/renderUtils';
import { AudioReader } from '../utils/AudioReader';
import { AudioMixer } from '../utils/AudioMixer';

// 1. Global Error Handlers
self.onerror = (e) => {
    self.postMessage({ type: 'error', error: `Global Worker Error: ${e instanceof ErrorEvent ? e.message : String(e)}` });
};

self.onunhandledrejection = (e) => {
    self.postMessage({ type: 'error', error: `Unhandled Rejection: ${e.reason}` });
};

export interface RenderMessage {
    type: 'start';
    canvas: OffscreenCanvas;
    scenes: Scene[];
    backgroundMusic: BackgroundMusic | null;
    coverConfig: CoverSceneConfig;
    closingConfig: ClosingSceneConfig;
    subtitleConfig: SubtitleConfig;
}

const WIDTH = 720;
const HEIGHT = 1280;
const FRAME_RATE = 30;
const FRAME_DURATION_MS = 1000 / FRAME_RATE;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let muxer: Muxer<ArrayBufferTarget> | null = null;
let videoEncoder: VideoEncoder | null = null;
let audioEncoder: AudioEncoder | null = null;

// Cache for loaded resources
const imageCache = new Map<string, ImageBitmap>();
const videoReaders = new Map<string, VideoReader>();

// Helper to load images
const loadImage = async (url: string): Promise<ImageBitmap | null> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await createImageBitmap(blob);
    } catch (e) {
        console.error(`Failed to load image: ${url}`, e);
        return null;
    }
};


const drawSceneOverlay = (ctx: OffscreenCanvasRenderingContext2D, config: CoverSceneConfig | ClosingSceneConfig, subtitleConfig: SubtitleConfig, logoImage: ImageBitmap | null, backgroundImage: ImageBitmap | null = null) => {
    if (!config.enabled) return;

    ctx.save();

    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (backgroundImage && 'backgroundImageUrl' in config && config.backgroundImageUrl) {
        const imgRatio = backgroundImage.width / backgroundImage.height;
        const canvasRatio = WIDTH / HEIGHT;

        let sx = 0, sy = 0, sWidth = backgroundImage.width, sHeight = backgroundImage.height;

        if (imgRatio > canvasRatio) {
            sWidth = backgroundImage.height * canvasRatio;
            sx = (backgroundImage.width - sWidth) / 2;
        } else {
            sHeight = backgroundImage.width / canvasRatio;
            sy = (backgroundImage.height - sHeight) / 2;
        }

        ctx.drawImage(backgroundImage, sx, sy, sWidth, sHeight, 0, 0, WIDTH, HEIGHT);
    }
    if ('overlayEnabled' in config && config.overlayEnabled) {
        ctx.fillStyle = config.overlayColor;
        ctx.globalAlpha = config.overlayOpacity;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.globalAlpha = 1.0;
    }

    const fontWeight = config.fontWeight || 'bold';
    const fontFamily = config.fontFamily || 'sans-serif';

    const drawHighlightedText = (text: string, x: number, y: number, maxWidth: number) => {
        const lineHeight = 60;

        const tokens: { text: string, isHighlight: boolean }[] = [];
        text.split(/(\*.*?\*)/g).filter(Boolean).forEach(part => {
            const isHighlight = part.startsWith('*') && part.endsWith('*');
            const content = isHighlight ? part.slice(1, -1) : part;
            content.split(' ').filter(Boolean).forEach(word => tokens.push({ text: word, isHighlight }));
        });

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
        ? (WIDTH * (config.logoSize / 100)) / (logoImage.width / logoImage.height)
        : 0;

    ctx.font = `${fontWeight} 50px ${fontFamily}`;
    const textHeight = config.textEnabled
        ? Math.ceil(ctx.measureText(config.text.replace(/\*/g, '')).width / (WIDTH - 100)) * 60
        : 0;

    const totalContentHeight = logoHeight + textHeight + (logoHeight > 0 && textHeight > 0 ? 20 : 0);
    let currentY = (HEIGHT - totalContentHeight) / 2;

    contentStack.forEach(item => {
        if (item.type === 'logo' && item.image) {
            const currentLogoHeight = (WIDTH * (config.logoSize / 100)) / (item.image.width / item.image.height);
            const logoX = (WIDTH - (WIDTH * (config.logoSize / 100))) / 2;
            ctx.drawImage(item.image, logoX, currentY, WIDTH * (config.logoSize / 100), currentLogoHeight);
            currentY += currentLogoHeight + 20;
        }
        if (item.type === 'text') {
            ctx.font = `${fontWeight} 50px ${fontFamily}`;
            ctx.textAlign = config.textAlign;
            ctx.textBaseline = 'top';
            const textX = { 'left': 50, 'center': WIDTH / 2, 'right': WIDTH - 50 }[config.textAlign];

            drawHighlightedText(config.text, textX, currentY, WIDTH - 100);
        }
    });

    ctx.restore();
}

const drawSubtitles = (ctx: OffscreenCanvasRenderingContext2D, scene: Scene, subtitleConfig: SubtitleConfig, alpha: number = 1.0) => {
    if (!scene || !scene.script || alpha <= 0) return;

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

    const tokens: { text: string, isHighlight: boolean }[] = [];
    scene.script.split(/(\*.*?\*)/g).filter(Boolean).forEach(part => {
        const isHighlight = part.startsWith('*') && part.endsWith('*');
        const content = isHighlight ? part.slice(1, -1) : part;
        content.split(' ').filter(Boolean).forEach(word => tokens.push({ text: word, isHighlight }));
    });

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

self.onmessage = async (event: MessageEvent<RenderMessage>) => {
    if (event.data.type === 'start') {
        try {
            self.postMessage({ type: 'log', message: "DIAGNÓSTICO: Worker iniciado. Verificando entorno..." });

            if (typeof VideoDecoder === 'undefined') {
                throw new Error("El navegador no soporta VideoDecoder en Workers.");
            }

            const { canvas: offscreenCanvas, scenes, coverConfig, closingConfig, subtitleConfig } = event.data;

            if (!coverConfig || !closingConfig || !subtitleConfig) {
                self.postMessage({ type: 'error', error: 'Missing configuration in worker message' });
                return;
            }
            canvas = offscreenCanvas;
            ctx = canvas.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;

            if (!ctx) {
                console.error("Failed to get 2D context");
                return;
            }

            // 1. Preload Resources
            self.postMessage({ type: 'progress', progress: 5, message: 'Cargando recursos...' });

            if (coverConfig.enabled) {
                if (coverConfig.logoUrl) await loadImage(coverConfig.logoUrl).then(img => img && imageCache.set(coverConfig.logoUrl!, img));
                if (coverConfig.backgroundImageUrl) await loadImage(coverConfig.backgroundImageUrl).then(img => img && imageCache.set(coverConfig.backgroundImageUrl!, img));
            }
            if (closingConfig.enabled && closingConfig.logoUrl) {
                await loadImage(closingConfig.logoUrl).then(img => img && imageCache.set(closingConfig.logoUrl!, img));
            }

            // 2. Decode Videos (Simplified: Fetch and decode all needed videos)
            self.postMessage({ type: 'progress', progress: 15, message: 'Procesando videos...' });
            const uniqueVideos = [...new Set(scenes.map(s => findBestVideoUrl(s.video)).filter(Boolean))];

            for (const url of uniqueVideos) {
                self.postMessage({ type: 'log', message: `Iniciando lector para: ${url} ` });
                const reader = new VideoReader(url, (status) => {
                    // Opcional: retransmitir logs internos del reader si es necesario
                    // self.postMessage({ type: 'log', message: `[Reader ${ url.slice(-5) }]: ${ status } ` });
                });
                videoReaders.set(url, reader);
            }
            // Damos un pequeño respiro para que empiecen a cargar headers
            await new Promise(r => setTimeout(r, 1000));

            // 3. Build Timeline
            const timeline = buildTimeline(scenes, coverConfig, closingConfig);
            self.postMessage({ type: 'log', message: 'Timeline construida:', data: JSON.stringify(timeline) });
            const totalDuration = timeline.reduce((acc, seg) => acc + seg.duration, 0);
            self.postMessage({ type: 'log', message: `Duración Total calculada: ${totalDuration} ms` });

            if (!totalDuration || isNaN(totalDuration)) {
                self.postMessage({ type: 'log', message: "⚠️ Advertencia: Duración total incierta, usando valor estimado." });
            }

            // 4. Start Recording
            // Configurar Muxer para MP4 (H.264)
            muxer = new Muxer({
                target: new ArrayBufferTarget(),
                video: {
                    codec: 'avc', // H.264 Advanced Video Coding
                    width: WIDTH,
                    height: HEIGHT
                },
                audio: {
                    codec: 'aac',
                    numberOfChannels: 1,
                    sampleRate: 48000
                },
                firstTimestampBehavior: 'offset',
                fastStart: 'in-memory'
            });

            // 1. Inicializar Encoder
            videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer?.addVideoChunk(chunk, meta),
                error: (e) => self.postMessage({ type: 'error', error: `Encoder Error: ${e.message} ` })
            });

            // 2. Configurar Encoder (AJUSTE DE BITRATE)
            videoEncoder.configure({
                codec: 'avc1.4D002A', // Main Profile, Level 4.2 (Supports 1080p)
                width: WIDTH,
                height: HEIGHT,
                bitrate: 5000000 // 5 Mbps
            });

            audioEncoder = new AudioEncoder({
                output: (chunk, meta) => muxer?.addAudioChunk(chunk, meta),
                error: (e) => console.error("AudioEncoder error", e)
            });
            audioEncoder.configure({
                codec: 'mp4a.40.2', // AAC LC
                numberOfChannels: 1,
                sampleRate: 48000,
                bitrate: 128000
            });

            // --- INICIO AUDIO PIPELINE ---
            self.postMessage({ type: 'progress', progress: 18, message: 'Mezclando audio...' });
            const audioTracks = [];
            let currentAudioTime = 0;

            for (const segment of timeline) {
                const segmentDuration = segment.duration / 1000; // seconds
                const sceneStartTime = currentAudioTime;

                if (segment.type === 'scene' && segment.scene) {
                    const scene = segment.scene;
                    // A. Audio del TTS (WAV)
                    if (scene.audioUrl) {
                        try {
                            const response = await fetch(scene.audioUrl);
                            const buffer = await response.arrayBuffer();
                            // Simple WAV skip header (44 bytes) & Float conversion
                            const pcmData = new Float32Array(new Int16Array(buffer.slice(44))).map(v => v / 32768.0);
                            audioTracks.push({
                                buffer: pcmData,
                                startTime: sceneStartTime,
                                volume: 1.0,
                                sampleRate: 24000 // Gemini TTS suele ser 24kHz
                            });
                        } catch (e) { console.warn("Error cargando TTS", e); }
                    }
                }
                currentAudioTime += segmentDuration;
            }

            // Mezcla Final
            const mixedAudio = AudioMixer.mix(audioTracks, totalDuration / 1000, 48000);

            // Codificación de Audio (Chunking)
            const audioData = new AudioData({
                format: 'f32',
                sampleRate: 48000,
                numberOfFrames: mixedAudio.length,
                numberOfChannels: 1,
                timestamp: 0,
                data: mixedAudio as any
            });
            audioEncoder.encode(audioData);
            audioData.close();
            await audioEncoder.flush();
            // --- FIN AUDIO PIPELINE ---

            // 5. Render Loop
            let frameIndex = 0;
            const totalFrames = Math.ceil(totalDuration / FRAME_DURATION_MS);

            for (const segment of timeline) {
                const segmentFrames = Math.round(segment.duration / FRAME_DURATION_MS);

                for (let i = 0; i < segmentFrames; i++) {
                    const timeInSegment = i * FRAME_DURATION_MS; // ms for logic
                    const timestamp = frameIndex * (1000000 / FRAME_RATE); // µs for encoder

                    if (frameIndex % 30 === 0) {
                        const progress = 20 + (frameIndex / totalFrames) * 80;
                        self.postMessage({ type: 'progress', progress: progress, message: `Renderizando... ${Math.round(frameIndex / FRAME_RATE)} s` });
                    }

                    // Clear
                    ctx.fillStyle = 'black';
                    ctx.fillRect(0, 0, WIDTH, HEIGHT);

                    if (segment.type === 'cover') {
                        const logo = coverConfig.logoUrl ? imageCache.get(coverConfig.logoUrl) || null : null;
                        const bg = coverConfig.backgroundImageUrl ? imageCache.get(coverConfig.backgroundImageUrl) || null : null;
                        drawSceneOverlay(ctx, coverConfig, subtitleConfig, logo, bg);
                    } else if (segment.type === 'closing') {
                        const logo = closingConfig.logoUrl ? imageCache.get(closingConfig.logoUrl) || null : null;
                        drawSceneOverlay(ctx, closingConfig, subtitleConfig, logo);
                    } else if (segment.type === 'scene' && segment.scene) {
                        const reader = videoReaders.get(findBestVideoUrl(segment.scene.video));

                        if (reader) {
                            // El reader se encarga de buscar, decodificar y gestionar memoria
                            const frame = await reader.getFrame(timeInSegment / 1000);

                            if (frame) {
                                // Lógica de dibujo (copy-paste de lo que tenías)
                                const videoRatio = frame.displayWidth / frame.displayHeight;
                                const canvasRatio = WIDTH / HEIGHT;
                                let w = WIDTH, h = HEIGHT, x = 0, y = 0;
                                if (videoRatio > canvasRatio) { h = w / videoRatio; y = (HEIGHT - h) / 2; }
                                else { w = h * videoRatio; x = (WIDTH - w) / 2; }

                                ctx.drawImage(frame, x, y, w, h);

                                // CRÍTICO: Cerrar el frame clonado que nos dio el reader
                                frame.close();
                            }
                        }

                        drawSubtitles(ctx, segment.scene, subtitleConfig);
                    }

                    // Encode Frame
                    const videoFrame = new VideoFrame(canvas, { timestamp: timestamp });
                    const isKeyFrame = frameIndex % 150 === 0 || frameIndex === 0;
                    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
                    videoFrame.close();

                    frameIndex++;
                }
            }

            await videoEncoder.flush();
            muxer.finalize();
            const { buffer } = muxer.target;
            const blob = new Blob([buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            self.postMessage({ type: 'complete', url, extension: 'mp4' });

            // Cleanup
            videoReaders.forEach(reader => reader.close());
            videoReaders.clear();
        } catch (err) {
            self.postMessage({ type: 'error', error: `Render Logic Crash: ${err instanceof Error ? err.message : String(err)} ` });
        }
    }
};
// End of worker