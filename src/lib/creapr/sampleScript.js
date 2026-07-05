/**
 * Sample Hybrid Script — "Editorial Spotlight"
 *
 * A minimal end-to-end demo of the CREAPr Engine interpreter:
 *   1. set_context  → seed article scores into contextVars
 *   2. run_logic    → JS logic module reads scores, picks the winner
 *   3. highlight    → command the winning card atom to glow
 *   4. dim          → command the losing card atom to fade
 *
 * This proves the full loop: context → logic module → atom command.
 */

const logicModules = {
  /**
   * pickWinner — reads `articles` from contextVars, finds the highest-
   * scoring one, and writes `winner_id` + `loser_ids` back to context.
   */
  pickWinner: async ({ get, set, registry }) => {
    const articles = get('articles') || [];
    if (articles.length === 0) return { vars: { winner_id: null, loser_ids: [] } };

    const sorted = [...articles].sort((a, b) => (b.score || 0) - (a.score || 0));
    const winner = sorted[0];
    const losers = sorted.slice(1).map((a) => a.id);

    return {
      vars: {
        winner_id: winner.id,
        loser_ids: losers,
        winner_score: winner.score,
      },
    };
  },
};

export const editorialSpotlightScript = {
  id: 'editorial-spotlight',
  name: 'Editorial Spotlight',
  description: 'Scores articles, highlights the winner, dims the rest.',
  logicModules,
  steps: [
    {
      action: 'set_context',
      payload: {
        articles: [
          { id: 'demo-card-1', title: 'AI Bill Passes Senate', score: 8.5 },
          { id: 'demo-card-2', title: 'Local Market Update', score: 6.2 },
          { id: 'demo-card-3', title: 'Tech Earnings Beat', score: 7.8 },
        ],
      },
    },
    {
      action: 'run_logic',
      script: 'pickWinner',
    },
    {
      action: 'highlight',
      target: 'demo-card-1',
      command: 'highlight',
      payload: { intensity: 'gold' },
      on_missing: 'skip',
    },
    {
      action: 'dim',
      target: 'demo-card-2',
      command: 'dim',
      payload: {},
      on_missing: 'skip',
    },
    {
      action: 'dim',
      target: 'demo-card-3',
      command: 'dim',
      payload: {},
      on_missing: 'skip',
    },
  ],
};

export default editorialSpotlightScript;