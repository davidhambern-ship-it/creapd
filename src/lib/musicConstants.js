// Music Production Configuration Options

export const GENRE_OPTIONS = [
  'Hip-Hop', 'R&B', 'Pop', 'Country', 'Gospel', 'Christian', 'Rock', 'Classic Rock',
  'Alternative', 'Indie', 'Jazz', 'Blues', 'Soul', 'Funk', 'Reggae', 'Dancehall',
  'Afrobeats', 'Latin', 'EDM', 'House', 'Folk', 'Classical', 'Metal', 'K-Pop',
  'Old School', 'Throwback', 'Top 40', 'Adult Contemporary'
];

export const MOOD_OPTIONS = [
  'High Energy', 'Morning Energy', 'Late Night Chill', 'Romantic', 'Feel Good',
  'Party', 'Hype', 'Emotional', 'Smooth', 'Relaxed', 'Workout', 'Road Trip',
  'Coffeehouse', 'Motivational', 'Nostalgic', 'Holiday', 'Seasonal', 'Worship',
  'Club', 'Family Friendly', 'Storytelling'
];

export const TONE_OPTIONS = [
  'Professional', 'Conversational', 'Energetic', 'Funny', 'Inspirational',
  'Laid Back', 'Late Night', 'Family Friendly', 'Urban', 'Country',
  'Church Friendly', 'Educational', 'Entertainment News', 'Bold', 'Warm', 'Serious'
];

export const MUSIC_TOPIC_OPTIONS = [
  'New Releases', 'Trending Songs', 'Billboard Charts', 'YouTube Music Trends',
  'SoundCloud Trends', 'Artist Bios', 'Artist Interviews', 'Artist Birthdays',
  'Album Releases', 'Album Reviews', 'Concerts', 'Music Festivals', 'Tour Dates',
  'Music History', 'On This Day In Music', 'Music Trivia', 'Viral Songs',
  'Independent Artists', 'Local Artists', 'Regional Artists', 'Genre News',
  'Music Business', 'Streaming Charts', 'Award Shows', 'Grammy News',
  'RIAA Certifications', 'Record Label News', 'Producer Spotlights', 'Songwriting',
  'Behind the Music', 'Fan Reactions', 'Music Technology', 'Music Video Releases',
  'Upcoming Albums', 'Random Fun Facts'
];

export const RESEARCH_SOURCE_OPTIONS = [
  'YouTube', 'YouTube Music', 'Billboard', 'SoundCloud', 'Spotify Charts',
  'Apple Music Charts', 'Rolling Stone', 'Pitchfork', 'NPR Music', 'Genius',
  'MusicBrainz', 'Last.fm', 'AllMusic', 'Grammy / Recording Academy', 'RIAA',
  'iHeartRadio', 'SiriusXM', 'Official Artist Websites', 'Record Label Websites',
  'Festival Websites', 'Concert Calendars', 'Local Venue Calendars',
  'Local Music Blogs', 'Entertainment Publications', 'Custom RSS Feed',
  'Custom Website', 'Manual Entry'
];

export const ENERGY_FLOW_OPTIONS = [
  'Build Energy Gradually', 'Start High Energy', 'End High Energy',
  'Smooth Throughout', 'Peak In The Middle', 'Late Night Flow', 'Randomized', 'Custom'
];

export const AI_AUTOMATION_OPTIONS = [
  { key: 'Generate Playlist Plan', label: 'Generate Playlist Plan' },
  { key: 'Generate Show Rundown', label: 'Generate Show Rundown' },
  { key: 'Generate Show Clock', label: 'Generate Show Clock' },
  { key: 'Generate Host Banter', label: 'Generate Host Banter' },
  { key: 'Generate Song Intros', label: 'Generate Song Intros' },
  { key: 'Generate Song Outros', label: 'Generate Song Outros' },
  { key: 'Generate Artist Bios', label: 'Generate Artist Bios' },
  { key: 'Generate Artist Facts', label: 'Generate Artist Facts' },
  { key: 'Generate Music Trivia', label: 'Generate Music Trivia' },
  { key: 'Generate Selected Music Topics', label: 'Generate Selected Music Topics' },
  { key: 'Generate Sponsor Reads', label: 'Generate Sponsor Reads' },
  { key: 'Generate Station IDs', label: 'Generate Station IDs' },
  { key: 'Generate Audience Prompts', label: 'Generate Audience Prompts' },
  { key: 'Generate Social Captions', label: 'Generate Social Captions' },
  { key: 'Generate Hashtags', label: 'Generate Hashtags' },
  { key: 'Generate Thumbnail Prompt', label: 'Generate Thumbnail Prompt' },
  { key: 'Generate AI Images', label: 'Generate AI Images' },
  { key: 'Generate Video Prompts', label: 'Generate Video Prompts' },
  { key: 'Generate Production Notes', label: 'Generate Production Notes' },
  { key: 'Generate Export Package', label: 'Generate Export Package' }
];

export const DEFAULT_AI_AUTOMATION = [
  'Generate Playlist Plan',
  'Generate Show Rundown',
  'Generate Show Clock',
  'Generate Host Banter',
  'Generate Song Intros',
  'Generate Artist Facts',
  'Generate Selected Music Topics',
  'Generate Social Captions',
  'Generate Thumbnail Prompt',
  'Generate Production Notes'
];

export const RUNTIME_DEFAULTS = {
  total_show_runtime: 90,
  required_music_runtime: 70,
  talk_segment_runtime: 12,
  commercial_sponsor_runtime: 6,
  intro_runtime: 1,
  outro_runtime: 1
};

export const MUSIC_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Dashboard', path: '/music/dashboard', section: null },
  // PP-ARCH-001: Universal Department Architecture — one room per department
  { icon: 'Compass', label: 'Discovery', path: '/music/configure', section: 'Discovery' },
  { icon: 'Search', label: 'Knowledge', path: '/music/research', section: 'Knowledge' },
  { icon: 'ClipboardList', label: 'Blueprint', path: '/music/playlist', section: 'Blueprint' },
  { icon: 'Sparkles', label: 'Production', path: '/music/assets', section: 'Production' },
  { icon: 'Package', label: 'Assembly', path: '/music/rundown', section: 'Assembly' },
  { icon: 'Settings', label: 'Settings', path: '/settings/default-production', section: null }
];

export const ASSET_TYPE_LABELS = {
  host_banter: 'Host Banter',
  song_intro: 'Song Intro',
  song_outro: 'Song Outro',
  artist_bio: 'Artist Bio',
  artist_fact: 'Artist Fact',
  music_trivia: 'Music Trivia',
  topic_talking_points: 'Topic Talking Points',
  sponsor_read: 'Sponsor Read',
  station_id: 'Station ID',
  audience_prompt: 'Audience Prompt',
  social_caption: 'Social Caption',
  hashtag: 'Hashtags',
  thumbnail_prompt: 'Thumbnail Prompt',
  ai_image: 'AI Image',
  video_prompt: 'Video Prompt',
  production_notes: 'Production Notes'
};

export const SEGMENT_TYPE_LABELS = {
  intro: 'Intro',
  song: 'Song',
  talk_break: 'Talk Break',
  topic_segment: 'Topic Segment',
  sponsor_break: 'Sponsor Break',
  station_id: 'Station ID',
  outro: 'Outro'
};

export function formatRuntime(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0 min';
  return `${minutes} min`;
}