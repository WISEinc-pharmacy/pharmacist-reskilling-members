import 'dotenv/config';
import fs from 'node:fs';
import { google } from 'googleapis';

const OUTPUT_PATH = process.env.YOUTUBE_CONTENTS_OUTPUT || 'data/contents.json';
const OVERRIDES_PATH = process.env.YOUTUBE_OVERRIDES_PATH || 'data/youtube-overrides.json';
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || '';
const CHANNEL_HANDLE = (process.env.YOUTUBE_CHANNEL_HANDLE || '').replace(/^@/, '');
const UPLOADS_PLAYLIST_ID = process.env.YOUTUBE_UPLOADS_PLAYLIST_ID || '';
const CREDENTIALS_PATH = process.env.YOUTUBE_OAUTH_CREDENTIALS || process.env.GOOGLE_OAUTH_CREDENTIALS || './credentials.json';
const TOKEN_PATH = process.env.YOUTUBE_OAUTH_TOKEN || process.env.GOOGLE_OAUTH_TOKEN || './token.json';

function readJson(path, fallback = null) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function authClient() {
  const creds = readJson(CREDENTIALS_PATH);
  const token = readJson(TOKEN_PATH);
  if (!creds || !token) throw new Error('YouTube OAuth credentials/token are required.');
  const installed = creds.installed || creds.web;
  if (!installed) throw new Error('OAuth credentials must contain installed or web client settings.');
  const auth = new google.auth.OAuth2(installed.client_id, installed.client_secret, installed.redirect_uris?.[0]);
  auth.setCredentials(token);
  return auth;
}

async function getUploadsPlaylistId(youtube) {
  if (UPLOADS_PLAYLIST_ID) return UPLOADS_PLAYLIST_ID;
  const params = { part: ['snippet', 'contentDetails'], maxResults: 1 };
  if (CHANNEL_ID) params.id = [CHANNEL_ID];
  else if (CHANNEL_HANDLE) params.forHandle = CHANNEL_HANDLE;
  else params.mine = true;
  const res = await youtube.channels.list(params);
  const channel = res.data.items?.[0];
  if (!channel) throw new Error('No YouTube channel was returned for the authenticated account.');
  return channel.contentDetails?.relatedPlaylists?.uploads;
}

async function listUploadItems(youtube, playlistId) {
  const items = [];
  let pageToken;
  do {
    const res = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId,
      maxResults: 50,
      pageToken
    });
    items.push(...(res.data.items || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return items;
}

async function listVideos(youtube, ids) {
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const res = await youtube.videos.list({
      part: ['snippet', 'status'],
      id: ids.slice(i, i + 50)
    });
    videos.push(...(res.data.items || []));
  }
  return videos;
}

function parseDate(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function matchAny(title, words = []) {
  return words.some((word) => title.includes(word));
}

function categoryFor(title, overrides) {
  const categories = overrides.categories || {};
  if (matchAny(title, categories.prescription)) return '\u51e6\u65b9\u63d0\u6848';
  if (matchAny(title, categories.disease)) return '\u75be\u60a3\u5225\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8';
  if (matchAny(title, categories.home)) return '\u5728\u5b85\u533b\u7642';
  if (matchAny(title, categories.support)) return '\u5065\u5eb7\u30b5\u30dd\u30fc\u30c8';
  if (matchAny(title, categories.efficiency)) return '\u696d\u52d9\u52b9\u7387\u5316';
  if (matchAny(title, categories.caseStudy)) return '\u75c7\u4f8b\u691c\u8a0e';
  return '\u57fa\u790e\u8b1b\u7fa9';
}

function contentFromVideo(video, order, overrides) {
  const id = video.id;
  const override = overrides.videos?.[id] || {};
  const snippet = video.snippet || {};
  const title = override.title || snippet.title || id;
  const publishedAt = override.publishedAt || parseDate(snippet.publishedAt);
  return {
    id: 'yt-' + id,
    videoId: id,
    title,
    category: override.category || categoryFor(title, overrides),
    type: 'video',
    url: override.url || 'https://youtu.be/' + id,
    note: override.note || '',
    thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
    published: override.published ?? true,
    privacyStatus: video.status?.privacyStatus || '',
    uploadedAt: publishedAt,
    publishedAt,
    order
  };
}

async function main() {
  const overrides = readJson(OVERRIDES_PATH, { categories: {}, videos: {} });
  const youtube = google.youtube({ version: 'v3', auth: authClient() });
  const playlistId = await getUploadsPlaylistId(youtube);
  if (!playlistId) throw new Error('Uploads playlist id was not found.');
  const uploadItems = await listUploadItems(youtube, playlistId);
  const ids = uploadItems.map((item) => item.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) throw new Error('No uploaded videos were found.');
  const videos = await listVideos(youtube, ids);
  const videoById = new Map(videos.map((video) => [video.id, video]));
  const contents = ids
    .map((id, index) => videoById.get(id) ? contentFromVideo(videoById.get(id), index + 1, overrides) : null)
    .filter(Boolean)
    .filter((item) => item.published !== false)
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')) || a.order - b.order)
    .map((item, index) => ({ ...item, order: index + 1 }));
  if (!contents.length) throw new Error('Generated contents are empty.');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(contents, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ playlistId, count: contents.length, first: contents[0]?.url, last: contents.at(-1)?.url }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
