// Centralized Production Profile Configuration
// Producer Core reads from this config to render profile-specific UI

export const productionProfiles = {
  news: {
    id: "news",
    name: "News Production",
    description: "Professional news broadcast production with AI-powered story research and script generation",
    itemSingular: "Story",
    itemPlural: "Stories",
    icon: "Newspaper",
    color: "berna-purple",
    isImplemented: true,
    setupFields: [
      { key: "show_name", label: "Show Name", type: "text", required: true },
      { key: "broadcast_date", label: "Broadcast Date", type: "date", required: true },
      { key: "location", label: "Location", type: "text", required: false },
      { key: "news_categories", label: "News Categories", type: "multiselect", options: ["Politics", "Business", "Technology", "Health", "Science", "Sports", "Entertainment", "Local", "National", "International"], required: false },
      { key: "tone", label: "Tone", type: "select", options: ["Professional", "Conversational", "Urgent", "Investigative", "Educational"], default: "Professional" },
      { key: "runtime", label: "Target Runtime", type: "select", options: ["5 Minutes", "10 Minutes", "15 Minutes", "30 Minutes", "60 Minutes"], default: "30 Minutes" },
      { key: "source_preferences", label: "Source Preferences", type: "text", required: false }
    ],
    dashboardWidgets: [
      { key: "todays_stories", label: "Today's Stories" },
      { key: "source_status", label: "Source Status" },
      { key: "breaking_news", label: "Breaking News" },
      { key: "fact_check_queue", label: "Fact Check Queue" },
      { key: "production_progress", label: "Production Progress" }
    ],
    sidebarItems: [
      { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
      { key: "setup", label: "Production Setup", icon: "Settings", path: "/setup" },
      { key: "research", label: "Research Center", icon: "Search", path: "/research" },
      { key: "stories", label: "Story Manager", icon: "FileText", path: "/workspace" },
      { key: "rundown", label: "Rundown Builder", icon: "ListOrdered", path: "/production" },
      { key: "ai_studio", label: "AI Studio", icon: "Sparkles", path: "/production" },
      { key: "export", label: "Export Center", icon: "Download", path: "/export" },
      { key: "sources", label: "Sources", icon: "Database", path: "/sources" },
      { key: "fact_check", label: "Fact Check", icon: "ShieldCheck", path: "/research" }
    ],
    researchModules: [
      { key: "articles", label: "Articles" },
      { key: "press_releases", label: "Press Releases" },
      { key: "government_updates", label: "Government Updates" },
      { key: "local_stories", label: "Local Stories" }
    ],
    contentItemTypes: [
      { key: "article", label: "Article" },
      { key: "story", label: "Story" },
      { key: "press_release", label: "Press Release" },
      { key: "government_update", label: "Government Update" }
    ],
    generatedAssets: [
      { key: "teleprompter_script", label: "Teleprompter Script" },
      { key: "lower_thirds", label: "Lower Thirds" },
      { key: "headlines", label: "Headlines" },
      { key: "fact_check_notes", label: "Fact Check Notes" },
      { key: "source_attribution", label: "Source Attribution" },
      { key: "ai_images", label: "AI Images" },
      { key: "broll_suggestions", label: "B-roll Suggestions" },
      { key: "social_captions", label: "Social Captions" }
    ],
    exportOptions: [
      { key: "full_package", label: "Full Production Package", format: "pdf" },
      { key: "teleprompter", label: "Teleprompter Script", format: "txt" },
      { key: "rundown", label: "Story Rundown", format: "pdf" },
      { key: "source_sheet", label: "Source Sheet", format: "pdf" },
      { key: "fact_check", label: "Fact Check Sheet", format: "pdf" },
      { key: "graphics_package", label: "Graphics Package", format: "zip" }
    ]
  },

  music: {
    id: "music",
    name: "Music Show",
    description: "Radio show or music program production with playlist management and show clock automation",
    itemSingular: "Song",
    itemPlural: "Songs",
    icon: "Music",
    color: "berna-orange",
    isImplemented: true,
    setupFields: [
      { key: "show_name", label: "Show Name", type: "text", required: true },
      { key: "total_runtime", label: "Total Show Runtime", type: "select", options: ["30 Minutes", "60 Minutes", "90 Minutes", "120 Minutes"], default: "60 Minutes" },
      { key: "music_runtime", label: "Required Music Runtime", type: "select", options: ["20 Minutes", "40 Minutes", "60 Minutes", "80 Minutes"], default: "40 Minutes" },
      { key: "talk_runtime", label: "Talk Runtime", type: "select", options: ["5 Minutes", "10 Minutes", "15 Minutes", "20 Minutes"], default: "15 Minutes" },
      { key: "genres", label: "Genres", type: "multiselect", options: ["Rock", "Pop", "Hip-Hop", "R&B", "Country", "Electronic", "Jazz", "Classical", "Indie", "Alternative", "Metal", "Folk"], required: false },
      { key: "mood", label: "Mood", type: "multiselect", options: ["Energetic", "Chill", "Romantic", "Melancholic", "Uplifting", "Aggressive", "Nostalgic", "Party"], required: false },
      { key: "explicit_preference", label: "Clean / Explicit", type: "select", options: ["Clean Only", "Explicit Allowed", "No Preference"], default: "No Preference" },
      { key: "era_preference", label: "Era Preference", type: "multiselect", options: ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s", "Current"], required: false },
      { key: "must_play_songs", label: "Must-Play Songs", type: "text", required: false },
      { key: "blocked_artists", label: "Blocked Artists", type: "text", required: false },
      { key: "blocked_songs", label: "Blocked Songs", type: "text", required: false }
    ],
    dashboardWidgets: [
      { key: "playlist_runtime", label: "Playlist Runtime" },
      { key: "show_clock", label: "Show Clock" },
      { key: "selected_genres", label: "Selected Genres" },
      { key: "mood", label: "Mood" },
      { key: "locked_songs", label: "Locked Songs" },
      { key: "production_progress", label: "Production Progress" }
    ],
    sidebarItems: [
      { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
      { key: "setup", label: "Production Setup", icon: "Settings", path: "/setup" },
      { key: "research", label: "Research Center", icon: "Search", path: "/research" },
      { key: "playlist", label: "Playlist Builder", icon: "ListMusic", path: "/workspace" },
      { key: "show_clock", label: "Show Clock", icon: "Clock", path: "/production" },
      { key: "segments", label: "Segment Builder", icon: "Scissors", path: "/production" },
      { key: "artists", label: "Artist Library", icon: "Users", path: "/research" },
      { key: "ai_studio", label: "AI Studio", icon: "Sparkles", path: "/production" },
      { key: "export", label: "Export Center", icon: "Download", path: "/export" }
    ],
    researchModules: [
      { key: "songs", label: "Songs" },
      { key: "artists", label: "Artists" },
      { key: "music_charts", label: "Music Charts" },
      { key: "new_releases", label: "New Releases" },
      { key: "artist_news", label: "Artist News" },
      { key: "music_history", label: "Music History" },
      { key: "concerts", label: "Concerts" }
    ],
    contentItemTypes: [
      { key: "song", label: "Song" },
      { key: "artist", label: "Artist" },
      { key: "album", label: "Album" },
      { key: "segment", label: "Segment" }
    ],
    generatedAssets: [
      { key: "playlist", label: "Playlist" },
      { key: "show_clock", label: "Show Clock" },
      { key: "host_banter", label: "Host Banter" },
      { key: "song_intros", label: "Song Intros" },
      { key: "artist_facts", label: "Artist Facts" },
      { key: "music_trivia", label: "Music Trivia" },
      { key: "segment_transitions", label: "Segment Transitions" },
      { key: "sponsor_reads", label: "Sponsor Reads" },
      { key: "social_captions", label: "Social Captions" },
      { key: "ai_images", label: "AI Images" }
    ],
    exportOptions: [
      { key: "full_package", label: "Full Production Package", format: "pdf" },
      { key: "playlist", label: "Playlist", format: "pdf" },
      { key: "show_clock", label: "Show Clock", format: "pdf" },
      { key: "host_script", label: "Host Script", format: "txt" },
      { key: "artist_facts", label: "Artist Facts", format: "pdf" },
      { key: "sponsor_schedule", label: "Sponsor Schedule", format: "pdf" },
      { key: "social_package", label: "Social Package", format: "zip" }
    ]
  },

  cooking: {
    id: "cooking",
    name: "Cooking Show",
    description: "Culinary production with recipe management, ingredient lists, and cooking scripts",
    itemSingular: "Recipe",
    itemPlural: "Recipes",
    icon: "ChefHat",
    color: "berna-emerald",
    isImplemented: true,
    setupFields: [
      { key: "show_name", label: "Show Name", type: "text", required: true },
      { key: "total_runtime", label: "Total Runtime", type: "select", options: ["15 Minutes", "30 Minutes", "45 Minutes", "60 Minutes"], default: "30 Minutes" },
      { key: "cuisine_type", label: "Cuisine Type", type: "multiselect", options: ["Italian", "Mexican", "Asian", "American", "French", "Mediterranean", "Indian", "Thai", "Japanese", "Chinese", "Fusion"], required: false },
      { key: "meal_type", label: "Meal Type", type: "multiselect", options: ["Breakfast", "Brunch", "Lunch", "Dinner", "Dessert", "Snack", "Appetizer", "Side Dish"], required: false },
      { key: "dietary_restrictions", label: "Dietary Restrictions", type: "multiselect", options: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb", "Nut-Free"], required: false },
      { key: "skill_level", label: "Skill Level", type: "select", options: ["Beginner", "Intermediate", "Advanced", "All Levels"], default: "All Levels" },
      { key: "ingredients_available", label: "Ingredients Available", type: "text", required: false },
      { key: "ingredients_to_avoid", label: "Ingredients to Avoid", type: "text", required: false },
      { key: "number_of_recipes", label: "Number of Recipes", type: "select", options: ["1", "2", "3", "4", "5+"], default: "3" }
    ],
    dashboardWidgets: [
      { key: "selected_recipes", label: "Selected Recipes" },
      { key: "ingredient_list", label: "Ingredient List" },
      { key: "shopping_list", label: "Shopping List" },
      { key: "cooking_rundown", label: "Cooking Rundown" },
      { key: "food_facts", label: "Food Facts" },
      { key: "production_progress", label: "Production Progress" }
    ],
    sidebarItems: [
      { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
      { key: "setup", label: "Production Setup", icon: "Settings", path: "/setup" },
      { key: "research", label: "Research Center", icon: "Search", path: "/research" },
      { key: "recipes", label: "Recipe Manager", icon: "BookOpen", path: "/workspace" },
      { key: "ingredients", label: "Ingredient List", icon: "List", path: "/workspace" },
      { key: "shopping", label: "Shopping List", icon: "ShoppingCart", path: "/workspace" },
      { key: "rundown", label: "Cooking Rundown", icon: "ListOrdered", path: "/production" },
      { key: "ai_studio", label: "AI Studio", icon: "Sparkles", path: "/production" },
      { key: "export", label: "Export Center", icon: "Download", path: "/export" }
    ],
    researchModules: [
      { key: "recipes", label: "Recipes" },
      { key: "ingredients", label: "Ingredients" },
      { key: "food_facts", label: "Food Facts" },
      { key: "nutrition_facts", label: "Nutrition Facts" },
      { key: "seasonal_foods", label: "Seasonal Foods" },
      { key: "kitchen_tips", label: "Kitchen Tips" }
    ],
    contentItemTypes: [
      { key: "recipe", label: "Recipe" },
      { key: "ingredient", label: "Ingredient" },
      { key: "food_fact", label: "Food Fact" },
      { key: "technique", label: "Technique" }
    ],
    generatedAssets: [
      { key: "recipe_cards", label: "Recipe Cards" },
      { key: "ingredient_list", label: "Ingredient List" },
      { key: "shopping_list", label: "Shopping List" },
      { key: "cooking_script", label: "Cooking Script" },
      { key: "food_facts", label: "Food Facts" },
      { key: "nutrition_notes", label: "Nutrition Notes" },
      { key: "plating_notes", label: "Plating Notes" },
      { key: "ai_food_images", label: "AI Food Images" },
      { key: "social_captions", label: "Social Captions" }
    ],
    exportOptions: [
      { key: "full_package", label: "Full Production Package", format: "pdf" },
      { key: "recipe_cards", label: "Recipe Cards", format: "pdf" },
      { key: "ingredient_list", label: "Ingredient List", format: "pdf" },
      { key: "shopping_list", label: "Shopping List", format: "pdf" },
      { key: "cooking_script", label: "Cooking Script", format: "txt" },
      { key: "social_package", label: "Social Package", format: "zip" }
    ]
  },

  // Placeholder profiles - not yet implemented
  radio: {
    id: "radio",
    name: "Radio Show",
    description: "Talk radio and broadcast production",
    itemSingular: "Segment",
    itemPlural: "Segments",
    icon: "Mic",
    color: "chart-2",
    isImplemented: false
  },

  podcast: {
    id: "podcast",
    name: "Podcast",
    description: "Podcast episode production with guest management and show notes",
    itemSingular: "Topic",
    itemPlural: "Topics",
    icon: "Mic",
    color: "chart-4",
    isImplemented: false
  },

  sports: {
    id: "sports",
    name: "Sports Show",
    description: "Sports commentary and game analysis production",
    itemSingular: "Game",
    itemPlural: "Games",
    icon: "Trophy",
    color: "chart-5",
    isImplemented: false
  },

  talk: {
    id: "talk",
    name: "Talk Show",
    description: "Talk show production with guest interviews and segments",
    itemSingular: "Segment",
    itemPlural: "Segments",
    icon: "MessageCircle",
    color: "chart-3",
    isImplemented: false
  },

  livestream: {
    id: "livestream",
    name: "Livestream",
    description: "Live streaming production with real-time elements",
    itemSingular: "Element",
    itemPlural: "Elements",
    icon: "Video",
    color: "primary",
    isImplemented: false
  },

  church: {
    id: "church",
    name: "Church Service",
    description: "Religious service production with sermon and worship elements",
    itemSingular: "Element",
    itemPlural: "Elements",
    icon: "Church",
    color: "muted-foreground",
    isImplemented: false
  },

  educational: {
    id: "educational",
    name: "Educational Content",
    description: "Educational video and course content production",
    itemSingular: "Lesson",
    itemPlural: "Lessons",
    icon: "GraduationCap",
    color: "chart-1",
    isImplemented: false
  },

  business: {
    id: "business",
    name: "Business Briefing",
    description: "Corporate briefing and presentation production",
    itemSingular: "Briefing",
    itemPlural: "Briefings",
    icon: "Briefcase",
    color: "berna-navy",
    isImplemented: false
  },

  gaming: {
    id: "gaming",
    name: "Gaming Stream",
    description: "Gaming content and livestream production",
    itemSingular: "Segment",
    itemPlural: "Segments",
    icon: "Gamepad2",
    color: "chart-2",
    isImplemented: false
  },

  custom: {
    id: "custom",
    name: "Custom Production",
    description: "Flexible production template for unique workflows",
    itemSingular: "Item",
    itemPlural: "Items",
    icon: "Settings",
    color: "muted-foreground",
    isImplemented: false
  }
};

export function getAllProfiles() {
  return Object.values(productionProfiles);
}

export function getProfileById(profileId) {
  return productionProfiles[profileId] || null;
}

export function getProfileByKey(profileKey) {
  return productionProfiles[profileKey] || null;
}

export function getImplementedProfiles() {
  return Object.values(productionProfiles).filter(p => p.isImplemented);
}

export function getProfileConfig(profileKey) {
  const profile = productionProfiles[profileKey];
  if (!profile) {
    return null;
  }
  
  return {
    ...profile,
    sidebarItems: profile.sidebarItems || [],
    dashboardWidgets: profile.dashboardWidgets || [],
    researchModules: profile.researchModules || [],
    contentItemTypes: profile.contentItemTypes || [],
    generatedAssets: profile.generatedAssets || [],
    exportOptions: profile.exportOptions || [],
    setupFields: profile.setupFields || []
  };
}