/**
 * Kling AI Video Service
 * 
 * Handles video generation and extension via Kling AI's REST API.
 * Uses JWT authentication signed with Web Crypto API (HMAC-SHA256).
 */
import type { FashionCategory, KlingCameraControl, KlingDuration } from '../types';

// --- Config ---
const KLING_API_BASE = '/api/kling';
const JWT_EXPIRY_MS = 25 * 60 * 1000; // 25 minutes (Kling tokens expire at 30 min)

// --- Credentials (injected at build time) ---
const KLING_ACCESS_KEY = (process.env as any).KLING_ACCESS_KEY || '';
const KLING_SECRET_KEY = (process.env as any).KLING_SECRET_KEY || '';

// --- JWT Cache ---
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/** Check if Kling AI is configured */
export const isKlingAvailable = (): boolean => {
    return (process.env as any).HAS_KLING_KEY === true || (process.env as any).HAS_KLING_KEY === 'true';
};

// --- Pure JS HMAC-SHA256 (works in all contexts, no crypto.subtle needed) ---

/** Base64url encode a string */
const base64urlEncodeStr = (str: string): string => {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Base64url encode a Uint8Array */
const base64urlEncodeBytes = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// --- SHA-256 + HMAC in pure JavaScript ---

const SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

const sha256 = (data: Uint8Array): Uint8Array => {
    const H = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);

    // Padding
    const bitLen = data.length * 8;
    const padLen = (data.length + 9 + 63) & ~63;
    const padded = new Uint8Array(padLen);
    padded.set(data);
    padded[data.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padLen - 4, bitLen, false);

    const W = new Uint32Array(64);

    for (let offset = 0; offset < padLen; offset += 64) {
        for (let i = 0; i < 16; i++) W[i] = view.getUint32(offset + i * 4, false);
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3);
            const s1 = rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10);
            W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
        }

        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + SHA256_K[i] + W[i]) | 0;
            const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) | 0;
            h = g; g = f; f = e; e = (d + t1) | 0;
            d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
        H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }

    const result = new Uint8Array(32);
    const rv = new DataView(result.buffer);
    for (let i = 0; i < 8; i++) rv.setUint32(i * 4, H[i], false);
    return result;
};

const hmacSha256 = (key: Uint8Array, message: Uint8Array): Uint8Array => {
    const blockSize = 64;
    let keyBlock = key;
    if (keyBlock.length > blockSize) keyBlock = sha256(keyBlock);
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(keyBlock);

    const ipad = new Uint8Array(blockSize + message.length);
    const opad = new Uint8Array(blockSize + 32);
    for (let i = 0; i < blockSize; i++) {
        ipad[i] = paddedKey[i] ^ 0x36;
        opad[i] = paddedKey[i] ^ 0x5c;
    }
    ipad.set(message, blockSize);
    const innerHash = sha256(ipad);
    opad.set(innerHash, blockSize);
    return sha256(opad);
};

const textEncode = (str: string): Uint8Array => new TextEncoder().encode(str);

/** Generate a JWT token signed with HMAC-SHA256 (pure JS, no Web Crypto needed) */
const generateJWT = async (): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        iss: KLING_ACCESS_KEY,
        exp: now + 1800,
        nbf: now - 5,
        iat: now
    };

    const encodedHeader = base64urlEncodeStr(JSON.stringify(header));
    const encodedPayload = base64urlEncodeStr(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signatureBytes = hmacSha256(textEncode(KLING_SECRET_KEY), textEncode(signingInput));
    const signature = base64urlEncodeBytes(signatureBytes);

    return `${signingInput}.${signature}`;
};

/** Get a valid JWT (cached or freshly generated) */
const getAuthToken = async (): Promise<string> => {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }
    cachedToken = await generateJWT();
    tokenExpiresAt = Date.now() + JWT_EXPIRY_MS;
    return cachedToken;
};

// --- API Helpers ---

/** Make an authenticated request to the Kling API */
const klingFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
    const token = await getAuthToken();
    const response = await fetch(`${KLING_API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Kling API error (${response.status}): ${errorBody || response.statusText}`);
    }
    return response.json();
};

/** Poll a Kling task until it completes */
const pollTask = async (
    taskId: string,
    endpoint: string,
    onStatusUpdate?: (status: string) => void,
    intervalMs = 5000,
    maxAttempts = 120 // 10 minutes max
): Promise<any> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        onStatusUpdate?.(`Processing... (${attempt * intervalMs / 1000}s)`);

        const result = await klingFetch(`${endpoint}/${taskId}`);
        const task = result?.data;

        if (!task) continue;

        if (task.task_status === 'succeed') {
            return task;
        }
        if (task.task_status === 'failed') {
            throw new Error(`Kling task failed: ${task.task_status_msg || 'Unknown error'}`);
        }
        // status is 'submitted' or 'processing' — keep polling
    }
    throw new Error('Kling video generation timed out after 10 minutes.');
};

// --- Public API ---

export interface KlingVideoConfig {
    model?: string;          // 'kling-v3-0' | 'kling-v2-1'
    mode?: 'std' | 'pro';
    duration?: KlingDuration; // '3' | '5' | '10' | '15'
    aspectRatio?: string;    // '16:9' | '9:16' | '1:1'
    cameraControl?: KlingCameraControl | null;
    withAudio?: boolean;     // Kling 3.0 native audio generation
}

/**
 * Generate a video from a static image using Kling AI.
 */
export const generateKlingVideo = async (
    category: FashionCategory,
    prompt: string,
    imageBase64DataUrl: string,
    config: KlingVideoConfig = {},
    onStatusUpdate?: (status: string) => void
): Promise<{ url: string; taskId: string; videoId: string }> => {
    if (!isKlingAvailable()) {
        throw new Error('Kling AI is not configured. Add KLING_ACCESS_KEY and KLING_SECRET_KEY to your .env file.');
    }

    onStatusUpdate?.('Submitting to Kling AI...');

    // Extract raw base64 from data URL
    const [header, base64Data] = imageBase64DataUrl.split(',');
    const mimeMatch = header?.match(/data:(image\/[^;]+)/);
    const mimeType = mimeMatch?.[1] || 'image/jpeg';

    // Build category-aware prompt prefix (Kling-optimized: concise, action-focused)
    let contextPrefix = '';
    switch (category) {
        case 'jewelry':
            contextPrefix = 'Extreme close-up of luxury jewelry. Light catches gemstones and polished metal surfaces. Subtle rotation reveals intricate details.';
            break;
        case 'kurti':
            contextPrefix = 'Fashion model poses in Indian Kurti. Fabric moves naturally with body motion.';
            break;
        case 'lehenga':
            contextPrefix = 'Model spins slowly in heavy Lehenga, skirt flares outward revealing embroidery layers. Dupatta trails gracefully.';
            break;
        default:
            contextPrefix = 'Model walks forward in draped saree, pallu flows over shoulder. Silk fabric catches light with each step.';
    }

    const fullPrompt = `${contextPrefix} ${prompt}`.trim();

    // Build request body
    const body: any = {
        model_name: config.model || 'kling-v3-0',
        mode: config.mode || 'pro',
        duration: config.duration || '5',
        aspect_ratio: config.aspectRatio || '9:16',
        prompt: fullPrompt,
        image: base64Data,
    };

    // Add native audio if enabled (Kling 3.0 feature)
    if (config.withAudio) {
        body.with_audio = true;
    }

    // Add camera control if specified
    if (config.cameraControl) {
        body.camera_control = config.cameraControl;
    }

    // Create task
    const createResult = await klingFetch('/videos/image2video', {
        method: 'POST',
        body: JSON.stringify(body)
    });

    const taskId = createResult?.data?.task_id;
    if (!taskId) {
        throw new Error('Kling AI did not return a task ID. Response: ' + JSON.stringify(createResult));
    }

    onStatusUpdate?.('Video generation started...');

    // Poll for completion
    const completedTask = await pollTask(taskId, '/videos/image2video', onStatusUpdate);

    // Get the video URL and ID from the result
    const videoResult = completedTask?.task_result?.videos?.[0];
    console.log('[Kling Generate] Full task result:', JSON.stringify(completedTask, null, 2));
    console.log('[Kling Generate] Video result object:', JSON.stringify(videoResult, null, 2));
    console.log('[Kling Generate] Task ID:', taskId);
    console.log('[Kling Generate] Video ID (from result.id):', videoResult?.id);
    console.log('[Kling Generate] Video ID (from result.video_id):', videoResult?.video_id);
    const videoUrl = videoResult?.url;
    const videoId = videoResult?.id || videoResult?.video_id;
    if (!videoUrl) {
        throw new Error('Kling task completed but no video URL was returned.');
    }

    // Download and create a blob URL (avoids CORS issues when playing)
    onStatusUpdate?.('Downloading video...');
    const videoResponse = await fetch(videoUrl);
    const videoBlob = await videoResponse.blob();
    const blobUrl = URL.createObjectURL(videoBlob);

    return { url: blobUrl, taskId, videoId: videoId || taskId };
};

/**
 * Extend an existing Kling video by 5 additional seconds.
 */
export const extendKlingVideo = async (
    previousVideoId: string,
    prompt: string,
    config: KlingVideoConfig = {},
    onStatusUpdate?: (status: string) => void
): Promise<{ url: string; taskId: string; videoId: string }> => {
    if (!isKlingAvailable()) {
        throw new Error('Kling AI is not configured.');
    }

    onStatusUpdate?.('Submitting extension to Kling AI...');

    const body: any = {
        model_name: config.model || 'kling-v3-0',
        mode: config.mode || 'pro',
        prompt: prompt.toLowerCase().startsWith('continue') ? prompt : `Continue smoothly: ${prompt}`,
        video_id: previousVideoId
    };

    console.log('[Kling Extend] Sending video_id:', previousVideoId);
    console.log('[Kling Extend] Full request body:', JSON.stringify(body, null, 2));

    if (config.withAudio) {
        body.with_audio = true;
    }

    const createResult = await klingFetch('/videos/video-extend', {
        method: 'POST',
        body: JSON.stringify(body)
    });

    const taskId = createResult?.data?.task_id;
    if (!taskId) {
        throw new Error('Kling AI did not return a task ID for extension.');
    }

    onStatusUpdate?.('Extension in progress...');

    const completedTask = await pollTask(taskId, '/videos/video-extend', onStatusUpdate);

    const videoResult = completedTask?.task_result?.videos?.[0];
    const videoUrl = videoResult?.url;
    const videoId = videoResult?.id;
    if (!videoUrl) {
        throw new Error('Kling extension completed but no video URL was returned.');
    }

    onStatusUpdate?.('Downloading extended video...');
    const videoResponse = await fetch(videoUrl);
    const videoBlob = await videoResponse.blob();
    const blobUrl = URL.createObjectURL(videoBlob);

    return { url: blobUrl, taskId, videoId: videoId || taskId };
};
