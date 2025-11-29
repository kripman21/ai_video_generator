import * as MP4Box from 'mp4box';

// Define basic types for MP4Box since @types/mp4box is not available
interface MP4File {
    onMoovStart?: () => void;
    onReady?: (info: any) => void;
    onError?: (module: string, message: string) => void;
    onSamples?: (id: number, user: any, samples: any[]) => void;
    setExtractionOptions: (id: number, user?: any, options?: any) => void;
    start: () => void;
    stop: () => void;
    appendBuffer: (data: ArrayBuffer) => number;
    flush: () => void;
    getTrackById: (id: number) => any;
}

export class MP4Demuxer {
    private file: MP4File;
    private source: VideoDecoderConfig | AudioDecoderConfig | null = null;
    private trackId: number | null = null;

    constructor(
        uri: string,
        onConfig: (config: VideoDecoderConfig | AudioDecoderConfig) => void,
        onChunk: (chunk: EncodedVideoChunk | EncodedAudioChunk) => void,
        onStatus: (status: string) => void,
        trackType: 'video' | 'audio' = 'video'
    ) {
        this.file = MP4Box.createFile();

        this.file.onError = (module, message) => {
            onStatus(`Demuxer Error (${module}): ${message}`);
        };

        this.file.onReady = (info) => {
            const track = trackType === 'video' ? info.videoTracks[0] : info.audioTracks[0];
            if (track) {
                this.trackId = track.id;

                // Construct DecoderConfig
                let config: any = {
                    codec: track.codec,
                    description: this.getDescription(track),
                };

                if (trackType === 'video') {
                    config.codedWidth = track.video.width;
                    config.codedHeight = track.video.height;
                } else {
                    config.numberOfChannels = track.audio.channel_count;
                    config.sampleRate = track.audio.sample_rate;
                }

                this.source = config;
                onConfig(config);

                this.file.setExtractionOptions(track.id);
                this.file.start();
            } else {
                onStatus(`No ${trackType} track found`);
            }
        };

        this.file.onSamples = (track_id, user, samples) => {
            for (const sample of samples) {
                const type = sample.is_sync ? 'key' : 'delta';

                let chunk;
                if (trackType === 'video') {
                    chunk = new EncodedVideoChunk({
                        type: type,
                        timestamp: (1e6 * sample.cts) / sample.timescale,
                        duration: (1e6 * sample.duration) / sample.timescale,
                        data: sample.data,
                    });
                } else {
                    chunk = new EncodedAudioChunk({
                        type: type,
                        timestamp: (1e6 * sample.cts) / sample.timescale,
                        duration: (1e6 * sample.duration) / sample.timescale,
                        data: sample.data,
                    });
                }

                onChunk(chunk);
            }
        };

        fetch(uri).then(response => {
            if (!response.ok) throw new Error(`Fetch status: ${response.status}`);
            if (!response.body) throw new Error("No body");
            const reader = response.body.getReader();
            let offset = 0;

            const push = () => {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        this.file.flush();
                        return;
                    }
                    if (value) {
                        const buffer = value.buffer as ArrayBuffer;
                        (buffer as any).fileStart = offset; // MP4Box requirement
                        offset += buffer.byteLength;
                        this.file.appendBuffer(buffer);
                        push();
                    }
                }).catch(e => onStatus(`Fetch Error: ${e.message || e}`));
            }
            push();
        });
    }

    private getDescription(track: any): Uint8Array {
        const trak = this.file.getTrackById(track.id);
        for (const entry of trak.mdia.minf.stbl.stsd.entries) {
            const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C || entry.esds;
            if (box) {
                const stream = new MP4Box.DataStream(undefined, 0, (MP4Box.DataStream as any).BIG_ENDIAN);
                box.write(stream);
                return new Uint8Array(stream.buffer.slice(8)); // Remove box header
            }
        }
        return new Uint8Array();
    }
}
