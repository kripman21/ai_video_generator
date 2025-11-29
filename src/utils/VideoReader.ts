import { MP4Demuxer } from './MP4Demuxer';

export class VideoReader {
    private chunks: EncodedVideoChunk[] = [];
    private decoder: VideoDecoder | null = null;
    private frameBuffer: VideoFrame[] = [];
    private config: VideoDecoderConfig | null = null;
    private demuxer: MP4Demuxer;
    private statusCallback: (status: string) => void;

    constructor(uri: string, onStatus: (status: string) => void) {
        this.statusCallback = onStatus;
        this.demuxer = new MP4Demuxer(
            uri,
            (config) => {
                this.config = config as VideoDecoderConfig;
                // onStatus(`Video Configured: ${config.codec} ${config.codedWidth}x${config.codedHeight}`);
            },
            (chunk) => {
                this.chunks.push(chunk as EncodedVideoChunk);
            },
            onStatus,
            'video'
        );
    }

    async decode(time: number): Promise<void> {
        if (!this.config || this.chunks.length === 0) return;

        // Check if we already have the frame in buffer
        const timeUs = time * 1e6;
        const hasFrame = this.frameBuffer.some(f => Math.abs(f.timestamp - timeUs) < 33000); // within ~33ms
        if (hasFrame) return;

        if (!this.decoder || this.decoder.state === 'closed') {
            this.decoder = new VideoDecoder({
                output: (frame) => {
                    this.frameBuffer.push(frame);
                },
                error: (e) => this.statusCallback(`Decoder Error: ${e.message}`)
            });
            this.decoder.configure(this.config);
        }

        // Find keyframe before time
        let startIndex = 0;
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            if (chunk.timestamp > timeUs) break;
            if (chunk.type === 'key') startIndex = i;
        }

        const chunksToDecode = this.chunks.slice(startIndex);
        for (const chunk of chunksToDecode) {
            if (this.decoder.decodeQueueSize > 10) await this.decoder.flush();
            this.decoder.decode(chunk);
            if (chunk.timestamp >= timeUs) break;
        }

        await this.decoder.flush();
    }

    async getFrame(time: number): Promise<VideoFrame | null> {
        await this.decode(time);

        const timeUs = time * 1e6;
        let bestFrame: VideoFrame | null = null;
        let minDiff = Infinity;

        // Find closest frame
        for (const frame of this.frameBuffer) {
            const diff = Math.abs(frame.timestamp - timeUs);
            if (diff < minDiff) {
                minDiff = diff;
                bestFrame = frame;
            }
        }

        // Clean up old frames
        const keptFrames: VideoFrame[] = [];
        for (const frame of this.frameBuffer) {
            // Keep frames that are close to current time or in the future (for sequential access)
            // But if they are too far behind, drop them.
            if (frame.timestamp < timeUs - 100000) { // 100ms grace period
                frame.close();
            } else {
                keptFrames.push(frame);
            }
        }
        this.frameBuffer = keptFrames;

        if (bestFrame) {
            return bestFrame.clone();
        }
        return null;
    }

    close() {
        if (this.decoder) {
            this.decoder.close();
            this.decoder = null;
        }
        this.frameBuffer.forEach(f => f.close());
        this.frameBuffer = [];
    }
}
