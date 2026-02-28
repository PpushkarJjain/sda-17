/**
 * Kling AI Video Service
 * 
 * Handles video generation and extension via Kling AI's REST API.
 * Uses JWT authentication signed with Web Crypto API (HMAC-SHA256).
 */
import type { FashionCategory, KlingCameraControl } from '../types';

// --- Config ---
const KLING_API_BASE = 'https://api.klingai.com/v1';
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

// --- JWT Signing (Web Crypto API) ---

/** Base64url encode a Uint8Array */
const base64urlEncode = (data: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Base64url encode a string */
const base64urlEncodeStr = (str: string): string => {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Generate a JWT token signed with HMAC-SHA256 */
const generateJWT = async (): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const payload = {
        iss: KLING_ACCESS_KEY,
        exp: now + 1800, // 30 minutes
        nbf: now - 5,    // 5 seconds leeway
        iat: now
    };

    const encodedHeader = base64urlEncodeStr(JSON.stringify(header));
    const encodedPayload = base64urlEncodeStr(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Sign with HMAC-SHA256 using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(KLING_SECRET_KEY);
    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(signingInput));
    const signature = base64urlEncode(new Uint8Array(signatureBuffer));

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
    model?: string;          // 'kling-v2-1' | 'kling-v2-6' etc.
    mode?: 'std' | 'pro';
    duration?: '5' | '10';
    aspectRatio?: string;    // '16:9' | '9:16' | '1:1'
    cameraControl?: KlingCameraControl | null;
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
): Promise<{ url: string; taskId: string }> => {
    if (!isKlingAvailable()) {
        throw new Error('Kling AI is not configured. Add KLING_ACCESS_KEY and KLING_SECRET_KEY to your .env file.');
    }

    onStatusUpdate?.('Submitting to Kling AI...');

    // Extract raw base64 from data URL
    const [header, base64Data] = imageBase64DataUrl.split(',');
    const mimeMatch = header?.match(/data:(image\/[^;]+)/);
    const mimeType = mimeMatch?.[1] || 'image/jpeg';

    // Build category-aware prompt prefix
    let contextPrefix = '';
    switch (category) {
        case 'jewelry':
            contextPrefix = 'Cinematic jewelry product video. Macro shot. Luxury lighting with specular highlights on metal and gems.';
            break;
        case 'kurti':
            contextPrefix = 'Fashion model wearing ethnic Indian Kurti. Modern chic vibe. Smooth motion.';
            break;
        case 'lehenga':
            contextPrefix = 'Fashion model wearing voluminous Lehenga Choli. Grand royal wedding look. Focus on skirt flare and embroidery details.';
            break;
        default:
            contextPrefix = 'Indian saree fashion showcase. Traditional elegance. Flowing fabric movement.';
    }

    const fullPrompt = `${contextPrefix} ${prompt}`.trim();

    // Build request body
    const body: any = {
        model_name: config.model || 'kling-v2-1',
        mode: config.mode || 'pro',
        duration: config.duration || '5',
        aspect_ratio: config.aspectRatio || '9:16',
        prompt: fullPrompt,
        image: `data:${mimeType};base64,${base64Data}`,
    };

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

    // Get the video URL from the result
    const videoUrl = completedTask?.task_result?.videos?.[0]?.url;
    if (!videoUrl) {
        throw new Error('Kling task completed but no video URL was returned.');
    }

    // Download and create a blob URL (avoids CORS issues when playing)
    onStatusUpdate?.('Downloading video...');
    const videoResponse = await fetch(videoUrl);
    const videoBlob = await videoResponse.blob();
    const blobUrl = URL.createObjectURL(videoBlob);

    return { url: blobUrl, taskId };
};

/**
 * Extend an existing Kling video by 5 additional seconds.
 */
export const extendKlingVideo = async (
    previousTaskId: string,
    prompt: string,
    onStatusUpdate?: (status: string) => void
): Promise<{ url: string; taskId: string }> => {
    if (!isKlingAvailable()) {
        throw new Error('Kling AI is not configured.');
    }

    onStatusUpdate?.('Submitting extension to Kling AI...');

    const body = {
        model_name: 'kling-v2-1',
        mode: 'pro',
        prompt: `Continue smoothly: ${prompt}`,
        task_id: previousTaskId
    };

    const createResult = await klingFetch('/videos/extend', {
        method: 'POST',
        body: JSON.stringify(body)
    });

    const taskId = createResult?.data?.task_id;
    if (!taskId) {
        throw new Error('Kling AI did not return a task ID for extension.');
    }

    onStatusUpdate?.('Extension in progress...');

    const completedTask = await pollTask(taskId, '/videos/extend', onStatusUpdate);

    const videoUrl = completedTask?.task_result?.videos?.[0]?.url;
    if (!videoUrl) {
        throw new Error('Kling extension completed but no video URL was returned.');
    }

    onStatusUpdate?.('Downloading extended video...');
    const videoResponse = await fetch(videoUrl);
    const videoBlob = await videoResponse.blob();
    const blobUrl = URL.createObjectURL(videoBlob);

    return { url: blobUrl, taskId };
};
