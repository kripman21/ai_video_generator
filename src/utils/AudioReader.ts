import { MP4Demuxer } from './MP4Demuxer';

export class AudioReader {
    private chunks: EncodedAudioChunk[] = [];
    private decoder: AudioDecoder | null = null;
    private samples: AudioData[] = [];
    private config: AudioDecoderConfig | null = null;
    private demuxer: MP4Demuxer;
    private isDecoding: boolean = false;

    constructor(uri: string, onStatus?: (status: string) => void) {
        this.demuxer = new MP4Demuxer(
            uri,
            (config) => {
                this.config = config as AudioDecoderConfig;
            },
            (chunk) => {
                this.chunks.push(chunk as EncodedAudioChunk);
            },
            (status) => {
                if (onStatus) onStatus(status);
            },
            'audio'
        );
    }

    async decodeAll(): Promise<void> {
        if (!this.config || this.chunks.length === 0) return;

        this.isDecoding = true;

        if (!this.decoder || this.decoder.state === 'closed') {
            this.decoder = new AudioDecoder({
                output: (data) => {
                    this.samples.push(data);
                },
                error: (e) => console.error(`Audio Decoder Error: ${e.message}`)
            });
            this.decoder.configure(this.config);
        }

        for (const chunk of this.chunks) {
            this.decoder.decode(chunk);
        }

        await this.decoder.flush();
        this.isDecoding = false;
    }

    async getAllSamples(): Promise<AudioData[]> {
        await this.decodeAll();
        return this.samples;
    }

    close() {
        if (this.decoder) {
            this.decoder.close();
            this.decoder = null;
        }
        this.samples.forEach(s => s.close());
        this.samples = [];
        this.chunks = [];
        this.isDecoding = false;
    }
}
