const fetch = require('node-fetch');
require('dotenv').config;

// helper functions for the stream monitoring
function getDuration(startTime, endTime) {
    const durationMs = endTime - startTime;  // Get duration in milliseconds

    // Calculate hours, minutes, and seconds
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}

const streamViewers = {};

async function trackViewers(videoId) {
    const videoDetailsUrl = `${youtubeVideosApiUrl}&id=${videoId}&key=${getYoutubeApiKey()}`;
    const videoDetailsJson = await fetchWithThrottle(videoDetailsUrl);

    if (videoDetailsJson.items && videoDetailsJson.items.length > 0) {
        const liveStreamingDetails = videoDetailsJson.items[0].liveStreamingDetails;

        if (liveStreamingDetails && liveStreamingDetails.concurrentViewers) {
            const concurrentViewers = parseInt(liveStreamingDetails.concurrentViewers, 10);

            if (!streamViewers[videoId]) {
                streamViewers[videoId] = { peakViewers: concurrentViewers, viewerCounts: [concurrentViewers] };
            } else {
                streamViewers[videoId].viewerCounts.push(concurrentViewers);
                // Update peak viewers if the current viewers exceed the recorded peak
                if (concurrentViewers > streamViewers[videoId].peakViewers) {
                    streamViewers[videoId].peakViewers = concurrentViewers;
                }
            }

            // console.log(`[${getCurrentFormattedTime()}] > Current viewers for video ${videoId}: ${concurrentViewers}, Peak: ${streamViewers[videoId].peakViewers}`);
        } else {
            console.log(`No concurrent viewers data available for video ${videoId}`);
        }
    }
}

function calculateAverageViewers(videoId) {
    const viewersData = streamViewers[videoId];
    if (viewersData && viewersData.viewerCounts.length > 0) {
        const totalViewers = viewersData.viewerCounts.reduce((sum, viewers) => sum + viewers, 0);
        const averageViewers = Math.floor(totalViewers / viewersData.viewerCounts.length);
        return averageViewers;
    }
    return 0;
}


const youtubeApiKeys = process.env.YOUTUBE_API_KEYS.split(',');
let currentApiKeyIndex = 0;
const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video';
const youtubeVideosApiUrl = 'https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails';

const ChApiUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet'

function getYoutubeApiKey() {
    return youtubeApiKeys[currentApiKeyIndex];
}

// Function to rotate to the next API key
function rotateApiKey() {
    currentApiKeyIndex = (currentApiKeyIndex + 1) % youtubeApiKeys.length;
    console.log(`[${getCurrentFormattedTime()}] > Switching to next YouTube API key: ${getYoutubeApiKey()}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Throttling mechanism (You can adjust this to your needs)
const maxQueriesPerMinute = 100; // Example limit
let lastRequestTime = 0;
const interval = (60 / maxQueriesPerMinute) * 1000;
async function fetchWithThrottle(url) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    // Ensure delay between requests
    if (timeSinceLastRequest < interval) {
        await sleep(interval - timeSinceLastRequest);
    }
    
    lastRequestTime = Date.now();
    const response = await fetch(url);
    const data = await response.json();
    
    // Check if the response contains a quota error
    if (data.error && data.error.errors[0].reason === 'quotaExceeded') {
        console.error(`[${getCurrentFormattedTime()}] > Quota exceeded for current API key. Rotating key...`);
        rotateApiKey();
        return fetchWithThrottle(url.replace(/key=[^&]+/, `key=${getYoutubeApiKey()}`));
    }

    return data;
}

function getCurrentFormattedTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
    getDuration,
    calculateAverageViewers,
    fetchWithThrottle,
    trackViewers,
};
