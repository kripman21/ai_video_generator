export interface AudioTrack {
    buffer: Float32Array;
    startTime: number;
    volume: number;
    sampleRate: number;
}

export class AudioMixer {
    static mix(tracks: AudioTrack[], totalDuration: number, sampleRate: number = 48000): Float32Array {
        const outputSize = Math.ceil(totalDuration * sampleRate);
        const resultBuffer = new Float32Array(outputSize); // Initialized to zeros

        for (const track of tracks) {
            const startSample = Math.floor(track.startTime * sampleRate);

            // Optimization: Skip if track starts after total duration
            if (startSample >= outputSize) continue;

            for (let i = 0; i < track.buffer.length; i++) {
                const outputIndex = startSample + i;

                // Stop if we exceed the output buffer size
                if (outputIndex >= outputSize) break;

                // Mix: Add sample * volume
                resultBuffer[outputIndex] += track.buffer[i] * track.volume;
            }
        }

        // Limiter (Hard Clipping / Clamping)
        for (let i = 0; i < resultBuffer.length; i++) {
            resultBuffer[i] = Math.max(-1, Math.min(1, resultBuffer[i]));
        }

        return resultBuffer;
    }
}
