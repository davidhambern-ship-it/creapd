/**
 * System Narration Scripts
 *
 * When AUTOPILOT mode is active, every page gets an animated, narrated
 * "guided tour" before revealing the actual interface — just like the
 * onboarding intro sequence.
 *
 * CREAPD is pronounced "Creeped" — TTS text uses the phonetic spelling
 * so the voice engine reads it correctly.
 */

import {
  Newspaper, Music, Mic2, Trophy, ChefHat, Church, Users,
  Calendar, FileText, Inbox, Search, Image as ImageIcon, Download,
  Settings, Archive, Wrench, Package, LayoutDashboard,
  Tag, ListMusic, Users2, Sliders, BarChart3, Library,
  GraduationCap, MessageSquare, PenTool, Layers, Shield,
  Upload, Database, FileSearch, Sparkles, Zap, ArrowRight,
  BookMarked, Palette, Clock, ShoppingBag, Dumbbell, Heart,
  Presentation, Clapperboard, FileCheck, Bell, User, FlaskConical,
} from 'lucide-react';

// Phonetic spelling for TTS — "Creeped" not "C-R-E-A-P-D"
export const CREAPD_SPOKEN = 'Creeped';

// Helper: standard 3-scene narration for a page
// (intro with page icon → what CREAPD does → action prompt)
function pageNarration(name, icon, color, introText, introSpeech, whatText, whatSpeech, actionText, actionSpeech) {
  return {
    name,
    scenes: [
      { id: 'intro', text: introText, speech: introSpeech || introText, visual: 'page-icon', icon, color },
      { id: 'what', text: whatText, speech: whatSpeech || whatText, visual: 'pipeline' },
      { id: 'action', text: actionText, speech: actionSpeech || actionText, visual: 'reveal' },
    ],
  };
}

// Helper for profile sub-pages (music, talk, cooking, sports, cosmo, spiritual)
function profilePage(domainName, spokenDomain, pageName, icon, color, intro, what, action) {
  return pageNarration(
    `${domainName} ${pageName}`,
    icon, color,
    intro.replace('{D}', domainName),
    intro.replace('{D}', spokenDomain).replace('CREAPD', CREAPD_SPOKEN),
    what.replace('{D}', domainName),
    what.replace('{D}', spokenDomain).replace('CREAPD', CREAPD_SPOKEN),
    action,
    action.replace('CREAPD', CREAPD_SPOKEN)
  );
}

export const NARRATION_ROUTES = {
  // ═══════════════════════════════════════════════
  // CORE PAGES
  // ═══════════════════════════════════════════════
  '/home': {
    name: 'Home',
    scenes: [
      {
        id: 'welcome',
        text: 'Welcome to the studio. This is CREAPD — your AI co-producer.',
        speech: 'Welcome to the studio. This is Creeped — your AI co-producer.',
        visual: 'persona',
      },
      {
        id: 'what-is-creapd',
        text: 'CREAPD handles the entire production pipeline. I sift stories, build production packages, direct scenes, and deliver finished shows — automatically.',
        speech: 'Creeped handles the entire production pipeline. I sift stories, build production packages, direct scenes, and deliver finished shows — automatically.',
        visual: 'pipeline',
      },
      {
        id: 'tagline',
        text: 'Create. Automate. Produce. Direct. That is the workflow, end to end.',
        speech: 'Create. Automate. Produce. Direct. That is the workflow, end to end.',
        visual: 'tagline',
      },
      {
        id: 'profiles-intro',
        text: 'Down below are your Production Profiles. Each one is a different type of show — News, Music, Talk, Sports, Cooking, Spiritual, and more.',
        speech: 'Down below are your Production Profiles. Each one is a different type of show — News, Music, Talk, Sports, Cooking, Spiritual, and more.',
        visual: 'profiles',
      },
      {
        id: 'profiles-action',
        text: 'Pick a profile and I will set everything up. Your dashboard, content, and assets — all generated automatically.',
        speech: 'Pick a profile and I will set everything up. Your dashboard, content, and assets — all generated automatically.',
        visual: 'arrow-down',
      },
      {
        id: 'start',
        text: "Let's get to work. The interface is yours now — I'm right here when you need me.",
        speech: "Let's get to work. The interface is yours now — I'm right here when you need me.",
        visual: 'reveal',
      },
    ],
  },

  '/': pageNarration(
    'Dashboard', LayoutDashboard, 'text-berna-orange',
    'This is your production dashboard. CREAPD pulls stories from your sources and organizes them here.',
    'This is your production dashboard. Creeped pulls stories from your sources and organizes them here.',
    'Each story is scored and filtered to match your show profile. The ones with the highest fit scores rise to the top.',
    null,
    'Approve stories to move them into production, or let me handle it in AUTOPILOT. Your call.',
    'Approve stories to move them into production, or let me handle it in AUTOPILOT. Your call.'
  ),
  '/dashboard': pageNarration(
    'Dashboard', LayoutDashboard, 'text-berna-orange',
    'This is your production dashboard. CREAPD pulls stories from your sources and organizes them here.',
    'This is your production dashboard. Creeped pulls stories from your sources and organizes them here.',
    'Each story is scored and filtered to match your show profile. The ones with the highest fit scores rise to the top.',
    null,
    'Approve stories to move them into production, or let me handle it in AUTOPILOT. Your call.',
    'Approve stories to move them into production, or let me handle it in AUTOPILOT. Your call.'
  ),

  '/planner': pageNarration(
    'Weekly Planner', Calendar, 'text-berna-purple',
    'This is the Weekly Planner. Map out your production schedule day by day.',
    'This is the Weekly Planner. Map out your production schedule day by day.',
    'CREAPD can auto-fill stories into each day based on your show profile, or you can arrange them yourself.',
    'Creeped can auto-fill stories into each day based on your show profile, or you can arrange them yourself.',
    'Pick a day to start planning. The interface is ready.',
    null
  ),

  '/brief': pageNarration(
    "Today's Brief", FileText, 'text-berna-orange',
    "This is Today's Brief. Your top stories, ready to go.",
    "This is Today's Brief. Your top stories, ready to go.",
    'CREAPD curates the most important stories for today, scored and filtered to match your show.',
    'Creeped curates the most important stories for today, scored and filtered to match your show.',
    'Review the brief, then head to the Story Queue to dive deeper.',
    null
  ),

  '/queue': {
    name: 'Story Queue',
    scenes: [
      {
        id: 'queue-intro',
        text: 'This is the Story Queue. CREAPD sifts through hundreds of articles and brings you only the ones worth your time.',
        speech: 'This is the Story Queue. Creeped sifts through hundreds of articles and brings you only the ones worth your time.',
        visual: 'persona',
      },
      {
        id: 'queue-scoring',
        text: 'Every story is scored on opportunity, credibility, and how well it fits your show. The strong ones make the cut.',
        speech: 'Every story is scored on opportunity, credibility, and how well it fits your show. The strong ones make the cut.',
        visual: 'pipeline',
      },
      {
        id: 'queue-action',
        text: 'Review, approve, or reject — or let me drive. The interface is ready.',
        speech: 'Review, approve, or reject — or let me drive. The interface is ready.',
        visual: 'reveal',
      },
    ],
  },

  '/review': pageNarration(
    'Story Intelligence', FileSearch, 'text-berna-emerald',
    'This is Story Intelligence Review. CREAPD scores every story on opportunity, credibility, and fit.',
    'This is Story Intelligence Review. Creeped scores every story on opportunity, credibility, and fit.',
    'The strongest stories rise to the top. Review the intelligence data, then approve the ones worth producing.',
    null,
    'Use the intelligence scores to decide what makes your show. The interface is ready.',
    null
  ),

  '/library': pageNarration(
    'Story Library', Library, 'text-berna-purple',
    'This is the Story Library. Every saved and approved story lives here.',
    'This is the Story Library. Every saved and approved story lives here.',
    'CREAPD keeps your library organized so you can pull stories into production at any time.',
    'Creeped keeps your library organized so you can pull stories into production at any time.',
    'Browse your library and pick stories for your next show. The interface is ready.',
    null
  ),

  '/workspace': pageNarration(
    'Story Workspace', Layers, 'text-berna-orange',
    'This is the Story Workspace. Build and manage your show rundowns here.',
    'This is the Story Workspace. Build and manage your show rundowns here.',
    'CREAPD helps you organize stories into segments, arrange your rundown, and prepare for production.',
    'Creeped helps you organize stories into segments, arrange your rundown, and prepare for production.',
    'Start building your rundown. The interface is ready.',
    null
  ),

  '/production': pageNarration(
    'Production Packages', Package, 'text-berna-purple',
    'This is the Production Packages page. Each package is a complete, broadcast-ready production.',
    'This is the Production Packages page. Each package is a complete, broadcast-ready production.',
    'CREAPD generates the teleprompter script, talking points, image prompts, social captions, and more — all in one package.',
    'Creeped generates the teleprompter script, talking points, image prompts, social captions, and more — all in one package.',
    'Review a package, generate media, and approve it for presentation. The interface is ready.',
    null
  ),

  '/presentations': pageNarration(
    'Presentations', Presentation, 'text-berna-emerald',
    'This is the Presentations page. CREAPD directs your stories into visual, narrated presentations.',
    'This is the Presentations page. Creeped directs your stories into visual, narrated presentations.',
    'Each presentation combines your production packages into a sequenced, animated show with voiceover and scenes.',
    null,
    'Review a presentation, then export it as a finished video. The interface is ready.',
    null
  ),

  // ═══════════════════════════════════════════════
  // MANAGEMENT PAGES
  // ═══════════════════════════════════════════════
  '/brands': pageNarration(
    'Brand Profiles', Palette, 'text-berna-orange',
    'This is Brand Profiles. Define your show identity — colors, logos, tone, and visual style.',
    'This is Brand Profiles. Define your show identity — colors, logos, tone, and visual style.',
    'CREAPD uses your brand profile to keep every production visually consistent across all your shows.',
    'Creeped uses your brand profile to keep every production visually consistent across all your shows.',
    'Create or edit a brand profile. The interface is ready.',
    null
  ),

  '/shows': pageNarration(
    'Show Profiles', Clapperboard, 'text-berna-purple',
    'This is Show Profiles. Each show profile defines the tone, audience, topics, and rules for a specific show.',
    'This is Show Profiles. Each show profile defines the tone, audience, topics, and rules for a specific show.',
    'CREAPD uses your show profile to filter and score stories, ensuring only the right content reaches your show.',
    'Creeped uses your show profile to filter and score stories, ensuring only the right content reaches your show.',
    'Create or edit a show profile. The interface is ready.',
    null
  ),

  '/images': pageNarration(
    'Image Library', ImageIcon, 'text-berna-emerald',
    'This is the Image Library. Every generated image is stored here for reuse.',
    'This is the Image Library. Every generated image is stored here for reuse.',
    'CREAPD generates custom images for your production packages — thumbnails, B-roll suggestions, and visual assets.',
    'Creeped generates custom images for your production packages — thumbnails, B-roll suggestions, and visual assets.',
    'Browse your images or generate new ones. The interface is ready.',
    null
  ),

  '/export': pageNarration(
    'Export Center', Download, 'text-berna-orange',
    'This is the Export Center. Turn your finished productions into downloadable files.',
    'This is the Export Center. Turn your finished productions into downloadable files.',
    'CREAPD packages your scripts, presentations, and assets into PDF, DOCX, or video formats — ready to share.',
    'Creeped packages your scripts, presentations, and assets into PDF, DOCX, or video formats — ready to share.',
    'Select a production and export it. The interface is ready.',
    null
  ),

  '/research': pageNarration(
    'Research Desk', FlaskConical, 'text-berna-emerald',
    'This is the Research Desk. Dig deeper into any topic with CREAPD research tools.',
    'This is the Research Desk. Dig deeper into any topic with Creeped research tools.',
    'CREAPD can research topics, find sources, and compile findings to support your production decisions.',
    'Creeped can research topics, find sources, and compile findings to support your production decisions.',
    'Start a research session or browse existing findings. The interface is ready.',
    null
  ),

  '/sources': pageNarration(
    'Sources', Database, 'text-berna-purple',
    'This is the Sources page. Manage the RSS feeds and content sources that feed your story pipeline.',
    'This is the Sources page. Manage the RSS feeds and content sources that feed your story pipeline.',
    'CREAPD pulls stories from these sources automatically, sifts through them, and brings you only the best.',
    'Creeped pulls stories from these sources automatically, sifts through them, and brings you only the best.',
    'Add, edit, or organize your sources. The interface is ready.',
    null
  ),

  '/import': pageNarration(
    'Manual Import', Upload, 'text-berna-orange',
    'This is Manual Import. Bring in a story by URL when you find something worth covering.',
    'This is Manual Import. Bring in a story by URL when you find something worth covering.',
    'CREAPD will fetch the article, extract the content, score it, and add it to your queue automatically.',
    'Creeped will fetch the article, extract the content, score it, and add it to your queue automatically.',
    'Paste a URL and import. The interface is ready.',
    null
  ),

  '/archive': pageNarration(
    'Archive', Archive, 'text-muted-foreground',
    'This is the Archive. Rejected and used stories are stored here.',
    'This is the Archive. Rejected and used stories are stored here.',
    'CREAPD keeps a record of past stories so you can revisit them. Rejected stories are auto-deleted after seven days.',
    'Creeped keeps a record of past stories so you can revisit them. Rejected stories are auto-deleted after seven days.',
    'Browse the archive or restore a story. The interface is ready.',
    null
  ),

  '/automation': pageNarration(
    'Automation Center', Wrench, 'text-berna-purple',
    'This is the Automation Center. Set up scheduled tasks and automated workflows.',
    'This is the Automation Center. Set up scheduled tasks and automated workflows.',
    'CREAPD can auto-fetch stories, auto-sift content, auto-transcribe videos, and auto-generate briefings on a schedule.',
    'Creeped can auto-fetch stories, auto-sift content, auto-transcribe videos, and auto-generate briefings on a schedule.',
    'Configure your automations. The interface is ready.',
    null
  ),

  '/profile': pageNarration(
    'User Profile', User, 'text-berna-orange',
    'This is your User Profile. Manage your account and preferences.',
    'This is your User Profile. Manage your account and preferences.',
    'Your profile settings are saved and applied across the entire CREAPD studio.',
    'Your profile settings are saved and applied across the entire Creeped studio.',
    'Update your profile. The interface is ready.',
    null
  ),

  '/settings': pageNarration(
    'Settings', Settings, 'text-berna-purple',
    'This is Settings. Configure your producer defaults, AI models, and system preferences.',
    'This is Settings. Configure your producer defaults, AI models, and system preferences.',
    'CREAPD uses these settings to personalize your experience — preferred voice, text model, image provider, and more.',
    'Creeped uses these settings to personalize your experience — preferred voice, text model, image provider, and more.',
    'Adjust your settings. The interface is ready.',
    null
  ),

  '/security': pageNarration(
    'Security Center', Shield, 'text-berna-emerald',
    'This is the Security Center. Review your data privacy, connected services, and compliance status.',
    'This is the Security Center. Review your data privacy, connected services, and compliance status.',
    'CREAPD gives you full transparency into how your data is used and what services are connected.',
    'Creeped gives you full transparency into how your data is used and what services are connected.',
    'Review your security settings. The interface is ready.',
    null
  ),

  '/checklist': pageNarration(
    'Acceptance Checklist', FileCheck, 'text-berna-orange',
    'This is the Acceptance Checklist. Track your setup progress and ensure everything is configured.',
    'This is the Acceptance Checklist. Track your setup progress and ensure everything is configured.',
    'CREAPD guides you through each step of the setup process so nothing is missed.',
    'Creeped guides you through each step of the setup process so nothing is missed.',
    'Work through the checklist. The interface is ready.',
    null
  ),

  '/organizations': pageNarration(
    'Organizations', Users2, 'text-berna-purple',
    'This is Organizations. Manage your teams and organizational settings.',
    'This is Organizations. Manage your teams and organizational settings.',
    'CREAPD supports multiple organizations so you can keep different shows and brands separate.',
    'Creeped supports multiple organizations so you can keep different shows and brands separate.',
    'Manage your organizations. The interface is ready.',
    null
  ),

  '/activity': pageNarration(
    'Activity Center', Bell, 'text-berna-orange',
    'This is the Activity Center. Track all actions and events across your CREAPD studio.',
    'This is the Activity Center. Track all actions and events across your Creeped studio.',
    'Every story fetch, sift, generation, and export is logged here so you always know what happened.',
    null,
    'Review your activity log. The interface is ready.',
    null
  ),

  '/templates': pageNarration(
    'Template Library', BookMarked, 'text-berna-emerald',
    'This is the Template Library. Pre-built templates for scripts, briefings, and productions.',
    'This is the Template Library. Pre-built templates for scripts, briefings, and productions.',
    'CREAPD uses templates to ensure consistent formatting across all your productions.',
    'Creeped uses templates to ensure consistent formatting across all your productions.',
    'Browse and manage your templates. The interface is ready.',
    null
  ),

  '/graphics-templates': pageNarration(
    'Production Templates', LayoutDashboard, 'text-berna-purple',
    'This is Production Templates. Visual templates for your shows and segments.',
    'This is Production Templates. Visual templates for your shows and segments.',
    'CREAPD applies these templates when generating your presentations and visual assets.',
    'Creeped applies these templates when generating your presentations and visual assets.',
    'Browse and manage your graphics templates. The interface is ready.',
    null
  ),

  '/prompt-templates': pageNarration(
    'Prompt Templates', PenTool, 'text-berna-orange',
    'This is Prompt Templates. Customize how CREAPD generates your scripts and assets.',
    'This is Prompt Templates. Customize how Creeped generates your scripts and assets.',
    'Each template controls the instructions CREAPD follows when writing scripts, generating images, or building packages.',
    'Each template controls the instructions Creeped follows when writing scripts, generating images, or building packages.',
    'Create or edit prompt templates. The interface is ready.',
    null
  ),

  // ═══════════════════════════════════════════════
  // MUSIC PRODUCTION
  // ═══════════════════════════════════════════════
  '/music/configure': profilePage('Music', 'Music', 'Configure', Sliders, 'text-berna-purple',
    'This is the {D} Configure page. Set up your music show — host, station, format, and runtime.',
    'CREAPD uses this configuration to generate your {D} show assets and rundown.',
    'Fill in the configuration and CREAPD will build the rest. The interface is ready.'
  ),
  '/music/dashboard': profilePage('Music', 'Music', 'Dashboard', LayoutDashboard, 'text-berna-purple',
    'This is the {D} Dashboard. Your music show overview — segments, assets, and status.',
    'CREAPD tracks your show progress and surfaces what needs attention.',
    'Review your dashboard and take action. The interface is ready.'
  ),
  '/music/research': profilePage('Music', 'Music', 'Research', FlaskConical, 'text-berna-purple',
    'This is the {D} Research page. Find artists, tracks, and music news for your show.',
    'CREAPD researches trending artists, new releases, and chart movements for you.',
    'Browse research items and add them to your show. The interface is ready.'
  ),
  '/music/playlist': profilePage('Music', 'Music', 'Playlist', ListMusic, 'text-berna-purple',
    'This is the {D} Playlist page. Build and arrange the songs for your show.',
    'CREAPD can suggest tracks based on your show theme and audience.',
    'Arrange your playlist and move to the rundown. The interface is ready.'
  ),
  '/music/topics': profilePage('Music', 'Music', 'Topics', Tag, 'text-berna-purple',
    'This is the {D} Topics page. Manage the themes and segments for your music show.',
    'CREAPD uses these topics to guide research and content generation.',
    'Add or edit topics for your show. The interface is ready.'
  ),
  '/music/rundown': profilePage('Music', 'Music', 'Rundown', ListMusic, 'text-berna-purple',
    'This is the {D} Rundown page. Your show schedule, segment by segment.',
    'CREAPD assembles the rundown from your configuration, research, and playlist.',
    'Review the rundown and make adjustments. The interface is ready.'
  ),
  '/music/assets': profilePage('Music', 'Music', 'Assets', Package, 'text-berna-purple',
    'This is the {D} Assets page. Generated scripts, intros, outros, and social content.',
    'CREAPD generates every asset you need for your music show automatically.',
    'Review and approve your assets. The interface is ready.'
  ),
  '/music/export': profilePage('Music', 'Music', 'Export', Download, 'text-berna-purple',
    'This is the {D} Export page. Turn your finished music show into a downloadable package.',
    'CREAPD packages your scripts, assets, and playlist into export-ready files.',
    'Select a format and export. The interface is ready.'
  ),

  // ═══════════════════════════════════════════════
  // TALK PRODUCTION
  // ═══════════════════════════════════════════════
  '/talk/configure': profilePage('Talk', 'Talk', 'Configure', Sliders, 'text-berna-emerald',
    'This is the {D} Configure page. Set up your talk show — hosts, guests, format, and runtime.',
    'CREAPD uses this configuration to generate your {D} show assets and rundown.',
    'Fill in the configuration and CREAPD will build the rest. The interface is ready.'
  ),
  '/talk/dashboard': profilePage('Talk', 'Talk', 'Dashboard', LayoutDashboard, 'text-berna-emerald',
    'This is the {D} Dashboard. Your talk show overview — segments, assets, and status.',
    'CREAPD tracks your show progress and surfaces what needs attention.',
    'Review your dashboard and take action. The interface is ready.'
  ),
  '/talk/research': profilePage('Talk', 'Talk', 'Research', FlaskConical, 'text-berna-emerald',
    'This is the {D} Research page. Find talking points, news, and discussion topics.',
    'CREAPD researches trending topics and compiles discussion material for your show.',
    'Browse research items and add them to your show. The interface is ready.'
  ),
  '/talk/topics': profilePage('Talk', 'Talk', 'Topics', Tag, 'text-berna-emerald',
    'This is the {D} Topics page. Manage the discussion themes for your talk show.',
    'CREAPD uses these topics to guide research and content generation.',
    'Add or edit topics for your show. The interface is ready.'
  ),
  '/talk/guests': profilePage('Talk', 'Talk', 'Guests', Users2, 'text-berna-emerald',
    'This is the {D} Guests page. Manage guest information and bios for your talk show.',
    'CREAPD can generate guest intros and talking points based on guest details.',
    'Add or edit guests for your show. The interface is ready.'
  ),
  '/talk/rundown': profilePage('Talk', 'Talk', 'Rundown', ListMusic, 'text-berna-emerald',
    'This is the {D} Rundown page. Your show schedule, segment by segment.',
    'CREAPD assembles the rundown from your configuration, research, and topics.',
    'Review the rundown and make adjustments. The interface is ready.'
  ),
  '/talk/assets': profilePage('Talk', 'Talk', 'Assets', Package, 'text-berna-emerald',
    'This is the {D} Assets page. Generated host scripts, intros, outros, and social content.',
    'CREAPD generates every asset you need for your talk show automatically.',
    'Review and approve your assets. The interface is ready.'
  ),
  '/talk/export': profilePage('Talk', 'Talk', 'Export', Download, 'text-berna-emerald',
    'This is the {D} Export page. Turn your finished talk show into a downloadable package.',
    'CREAPD packages your scripts and assets into export-ready files.',
    'Select a format and export. The interface is ready.'
  ),

  // ═══════════════════════════════════════════════
  // COOKING PRODUCTION
  // ═══════════════════════════════════════════════
  '/cooking/configure': profilePage('Cooking', 'Cooking', 'Configure', Sliders, 'text-berna-orange',
    'This is the {D} Configure page. Set up your cooking show — host, format, runtime, and cuisine types.',
    'CREAPD uses this configuration to generate your {D} show assets and rundown.',
    'Fill in the configuration and CREAPD will build the rest. The interface is ready.'
  ),
  '/cooking/dashboard': profilePage('Cooking', 'Cooking', 'Dashboard', LayoutDashboard, 'text-berna-orange',
    'This is the {D} Dashboard. Your cooking show overview — segments, assets, and status.',
    'CREAPD tracks your show progress and surfaces what needs attention.',
    'Review your dashboard and take action. The interface is ready.'
  ),
  '/cooking/research': profilePage('Cooking', 'Cooking', 'Research', FlaskConical, 'text-berna-orange',
    'This is the {D} Research page. Find recipes, techniques, and food trends for your show.',
    'CREAPD researches trending recipes and cooking techniques for you.',
    'Browse research items and add them to your show. The interface is ready.'
  ),
  '/cooking/recipes': profilePage('Cooking', 'Cooking', 'Recipes', BookMarked, 'text-berna-orange',
    'This is the {D} Recipes page. Manage recipes for your cooking show.',
    'CREAPD can generate ingredient lists and technique tips from your recipes.',
    'Add or edit recipes for your show. The interface is ready.'
  ),
  '/cooking/ingredients': profilePage('Cooking', 'Cooking', 'Ingredients', ShoppingBag, 'text-berna-orange',
    'This is the {D} Ingredients page. Track ingredients and quantities for your recipes.',
    'CREAPD compiles ingredient lists from your recipes automatically.',
    'Manage your ingredient lists. The interface is ready.'
  ),
  '/cooking/rundown': profilePage('Cooking', 'Cooking', 'Rundown', ListMusic, 'text-berna-orange',
    'This is the {D} Rundown page. Your show schedule, segment by segment.',
    'CREAPD assembles the rundown from your configuration, recipes, and research.',
    'Review the rundown and make adjustments. The interface is ready.'
  ),
  '/cooking/assets': profilePage('Cooking', 'Cooking', 'Assets', Package, 'text-berna-orange',
    'This is the {D} Assets page. Generated scripts, ingredient lists, technique tips, and social content.',
    'CREAPD generates every asset you need for your cooking show automatically.',
    'Review and approve your assets. The interface is ready.'
  ),
  '/cooking/export': profilePage('Cooking', 'Cooking', 'Export', Download, 'text-berna-orange',
    'This is the {D} Export page. Turn your finished cooking show into a downloadable package.',
    'CREAPD packages your scripts, recipes, and assets into export-ready files.',
    'Select a format and export. The interface is ready.'
  ),

  // ═══════════════════════════════════════════════
  // SPORTS PRODUCTION
  // ═══════════════════════════════════════════════
  '/sports/configure': profilePage('Sports', 'Sports', 'Configure', Sliders, 'text-amber-400',
    'This is the {D} Configure page. Set up your sports show — host, format, runtime, and sports coverage.',
    'CREAPD uses this configuration to generate your {D} show assets and rundown.',
    'Fill in the configuration and CREAPD will build the rest. The interface is ready.'
  ),
  '/sports/dashboard': profilePage('Sports', 'Sports', 'Dashboard', LayoutDashboard, 'text-amber-400',
    'This is the {D} Dashboard. Your sports show overview — segments, assets, and status.',
    'CREAPD tracks your show progress and surfaces what needs attention.',
    'Review your dashboard and take action. The interface is ready.'
  ),
  '/sports/research': profilePage('Sports', 'Sports', 'Research', FlaskConical, 'text-amber-400',
    'This is the {D} Research page. Find scores, trades, and sports news for your show.',
    'CREAPD researches games, athletes, and trending sports stories for you.',
    'Browse research items and add them to your show. The interface is ready.'
  ),
  '/sports/games': profilePage('Sports', 'Sports', 'Games', Dumbbell, 'text-amber-400',
    'This is the {D} Games page. Track upcoming and recent games for your coverage.',
    'CREAPD pulls game schedules and results to build your show segments.',
    'Add or edit games for your show. The interface is ready.'
  ),
  '/sports/athletes': profilePage('Sports', 'Sports', 'Athletes', Users2, 'text-amber-400',
    'This is the {D} Athletes page. Manage athlete profiles and stats for your show.',
    'CREAPD can generate athlete intros and talking points from their profiles.',
    'Add or edit athletes for your show. The interface is ready.'
  ),
  '/sports/rundown': profilePage('Sports', 'Sports', 'Rundown', ListMusic, 'text-amber-400',
    'This is the {D} Rundown page. Your show schedule, segment by segment.',
    'CREAPD assembles the rundown from your configuration, games, and research.',
    'Review the rundown and make adjustments. The interface is ready.'
  ),
  '/sports/assets': profilePage('Sports', 'Sports', 'Assets', Package, 'text-amber-400',
    'This is the {D} Assets page. Generated scripts, game previews, recaps, and social content.',
    'CREAPD generates every asset you need for your sports show automatically.',
    'Review and approve your assets. The interface is ready.'
  ),
  '/sports/export': profilePage('Sports', 'Sports', 'Export', Download, 'text-amber-400',
    'This is the {D} Export page. Turn your finished sports show into a downloadable package.',
    'CREAPD packages your scripts and assets into export-ready files.',
    'Select a format and export. The interface is ready.'
  ),

  // ═══════════════════════════════════════════════
  // COSMO PRODUCTION
  // ═══════════════════════════════════════════════
  '/cosmo/configure': profilePage('Cosmo', 'Cosmo', 'Configure', Sliders, 'text-pink-400',
    'This is the {D} Configure page. Set up your beauty and wellness show — host, format, and topics.',
    'CREAPD uses this configuration to generate your {D} show assets and rundown.',
    'Fill in the configuration and CREAPD will build the rest. The interface is ready.'
  ),
  '/cosmo/dashboard': profilePage('Cosmo', 'Cosmo', 'Dashboard', LayoutDashboard, 'text-pink-400',
    'This is the {D} Dashboard. Your cosmo show overview — segments, assets, and status.',
    'CREAPD tracks your show progress and surfaces what needs attention.',
    'Review your dashboard and take action. The interface is ready.'
  ),
  '/cosmo/research': profilePage('Cosmo', 'Cosmo', 'Research', FlaskConical, 'text-pink-400',
    'This is the {D} Research page. Find beauty trends, wellness products, and skincare tips.',
    'CREAPD researches trending beauty and wellness topics for your show.',
    'Browse research items and add them to your show. The interface is ready.'
  ),
  '/cosmo/topics': profilePage('Cosmo', 'Cosmo', 'Topics', Tag, 'text-pink-400',
    'This is the {D} Topics page. Manage beauty and wellness themes for your show.',
    'CREAPD uses these topics to guide research and content generation.',
    'Add or edit topics for your show. The interface is ready.'
  ),
  '/cosmo/guests': profilePage('Cosmo', 'Cosmo', 'Guests', Users2, 'text-pink-400',
    'This is the {D} Guests page. Manage expert guests and bios for your cosmo show.',
    'CREAPD can generate guest intros and talking points based on guest details.',
    'Add or edit guests for your show. The interface is ready.'
  ),
  '/cosmo/rundown': profilePage('Cosmo', 'Cosmo', 'Rundown', ListMusic, 'text-pink-400',
    'This is the {D} Rundown page. Your show schedule, segment by segment.',
    'CREAPD assembles the rundown from your configuration, research, and topics.',
    'Review the rundown and make adjustments. The interface is ready.'
  ),
  '/cosmo/assets': profilePage('Cosmo', 'Cosmo', 'Assets', Package, 'text-pink-400',
    'This is the {D} Assets page. Generated scripts, routine walkthroughs, and social content.',
    'CREAPD generates every asset you need for your cosmo show automatically.',
    'Review and approve your assets. The interface is ready.'
  ),
  '/cosmo/export': profilePage('Cosmo', 'Cosmo', 'Export', Download, 'text-pink-400',
    'This is the {D} Export page. Turn your finished cosmo show into a downloadable package.',
    'CREAPD packages your scripts and assets into export-ready files.',
    'Select a format and export. The interface is ready.'
  ),

  // ═══════════════════════════════════════════════
  // SPIRITUAL PRODUCTION
  // ═══════════════════════════════════════════════
  '/spiritual/configure': profilePage('Spiritual', 'Spiritual', 'Configure', Sliders, 'text-blue-400',
    'This is the {D} Configure page. Set up your spiritual show — host, format, and scripture focus.',
    'CREAPD uses this configuration to generate your {D} show assets and message.',
    'Fill in the configuration and CREAPD will build the rest. The interface is ready.'
  ),
  '/spiritual/dashboard': profilePage('Spiritual', 'Spiritual', 'Dashboard', LayoutDashboard, 'text-blue-400',
    'This is the {D} Dashboard. Your spiritual show overview — message, assets, and status.',
    'CREAPD tracks your show progress and surfaces what needs attention.',
    'Review your dashboard and take action. The interface is ready.'
  ),
  '/spiritual/research': profilePage('Spiritual', 'Spiritual', 'Research', FlaskConical, 'text-blue-400',
    'This is the {D} Research page. Find scripture passages, theological insights, and sermon topics.',
    'CREAPD researches scripture references and theological themes for your message.',
    'Browse research items and add them to your message. The interface is ready.'
  ),
  '/spiritual/library': pageNarration(
    'Spiritual Library', Library, 'text-blue-400',
    'This is the Spiritual Library. A curated collection of sacred texts, translations, and study resources.',
    'This is the Spiritual Library. A curated collection of sacred texts, translations, and study resources.',
    'CREAPD can search the library, compare translations, and pull passages directly into your production.',
    'Creeped can search the library, compare translations, and pull passages directly into your production.',
    'Browse, search, or read texts in the library. The interface is ready.',
    null
  ),
  '/spiritual/study': pageNarration(
    'Spiritual Study', GraduationCap, 'text-blue-400',
    'This is the Spiritual Study page. Deep-dive into scripture with research sessions and word studies.',
    'This is the Spiritual Study page. Deep-dive into scripture with research sessions and word studies.',
    'CREAPD helps you conduct research, take notes, and find connections across texts and traditions.',
    'Creeped helps you conduct research, take notes, and find connections across texts and traditions.',
    'Start a study session or review past findings. The interface is ready.',
    null
  ),
  '/spiritual/message': pageNarration(
    'Spiritual Message', MessageSquare, 'text-blue-400',
    'This is the Spiritual Message page. Build your sermon or spiritual message with AI assistance.',
    'This is the Spiritual Message page. Build your sermon or spiritual message with AI assistance.',
    'CREAPD helps you structure your message — scripture references, reflection points, and discussion questions.',
    'Creeped helps you structure your message — scripture references, reflection points, and discussion questions.',
    'Build your message section by section. The interface is ready.',
    null
  ),
  '/spiritual/assets': profilePage('Spiritual', 'Spiritual', 'Assets', Package, 'text-blue-400',
    'This is the {D} Assets page. Generated scripts, scripture references, and reflection notes.',
    'CREAPD generates every asset you need for your spiritual show automatically.',
    'Review and approve your assets. The interface is ready.'
  ),
  '/spiritual/package': pageNarration(
    'Spiritual Package', Package, 'text-blue-400',
    'This is the Spiritual Package page. Your complete, production-ready spiritual show package.',
    'This is the Spiritual Package page. Your complete, production-ready spiritual show package.',
    'CREAPD assembles your message, scripture, reflections, and assets into one unified package.',
    'Creeped assembles your message, scripture, reflections, and assets into one unified package.',
    'Review the package and approve it for export. The interface is ready.',
    null
  ),
  '/spiritual/export': profilePage('Spiritual', 'Spiritual', 'Export', Download, 'text-blue-400',
    'This is the {D} Export page. Turn your finished spiritual show into a downloadable package.',
    'CREAPD packages your message, scriptures, and assets into export-ready files.',
    'Select a format and export. The interface is ready.'
  ),
};

// ═══════════════════════════════════════════════════
// DYNAMIC ROUTE PREFIX MATCHING
// ═══════════════════════════════════════════════════

// Routes that use prefix matching (e.g. /story/:id matches /story/ prefix)
const DYNAMIC_ROUTE_PREFIXES = [
  '/story/',
  '/presentations/',
  '/spiritual/research/',
  '/spiritual/library/reader/',
  '/spiritual/library/word/',
  '/spiritual/library/compare/',
  '/spiritual/study/',
];

/**
 * Check if a route has a narration script.
 * Tries exact match first, then prefix match for dynamic routes.
 */
export function hasNarration(pathname) {
  if (NARRATION_ROUTES[pathname]) return true;
  return DYNAMIC_ROUTE_PREFIXES.some(prefix => {
    if (pathname.startsWith(prefix)) {
      // Map the prefix to its base route for narration
      const baseRoute = prefix.slice(0, -1); // remove trailing slash
      return !!NARRATION_ROUTES[baseRoute];
    }
    return false;
  });
}

/**
 * Get the narration script for a route.
 * Tries exact match first, then prefix match for dynamic routes.
 */
export function getNarration(pathname) {
  // Exact match
  if (NARRATION_ROUTES[pathname]) return NARRATION_ROUTES[pathname];

  // Dynamic route prefix matching
  for (const prefix of DYNAMIC_ROUTE_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      const baseRoute = prefix.slice(0, -1);
      if (NARRATION_ROUTES[baseRoute]) {
        return NARRATION_ROUTES[baseRoute];
      }
    }
  }

  return null;
}

/**
 * Session-level tracking — narration plays once per page per session.
 */
export function hasNarrationPlayed(pathname) {
  try {
    return sessionStorage.getItem(`creapd_narrated_${pathname}`) === 'true';
  } catch {
    return false;
  }
}

export function markNarrationPlayed(pathname) {
  try {
    sessionStorage.setItem(`creapd_narrated_${pathname}`, 'true');
  } catch {
    // sessionStorage might be unavailable
  }
}

/**
 * Clear all narration tracking (for testing or replay).
 */
export function resetNarration() {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('creapd_narrated_'))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {
    // noop
  }
}