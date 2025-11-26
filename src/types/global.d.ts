export { };

declare global {
    interface OffscreenCanvas {
        captureStream(frameRate?: number): MediaStream;
    }
}
