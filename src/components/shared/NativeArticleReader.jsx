import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ExternalLink, Loader2, FileText, AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

/**
 * Reusable native article reader — displays full article body content within CREAPD.
 * Fetches content on-demand from the source URL via the fetchArticleContent backend function.
 * Caches the extracted text on the Article entity so subsequent reads are instant.
 *
 * Designed to work across all Production Profiles — any entity with a `url` and `body_content`
 * field can use this component.
 *
 * @param {object} article — the Article entity (must have `id` and `url`)
 * @param {string} sourceLabel — optional label for the source attribution
 */
export default function NativeArticleReader({ article, sourceLabel }) {
  const [bodyContent, setBodyContent] = useState(article?.body_content || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(!!article?.body_content);

  const fetchContent = useCallback(async () => {
    if (!article?.id || !article?.url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("fetchArticleContent", {
        article_id: article.id,
      });
      if (res.data?.body_content) {
        setBodyContent(res.data.body_content);
        setHasFetched(true);
      } else if (res.data?.error) {
        setError(res.data.is_video_page
          ? 'This source is a video page with no written article body. You can still watch the original video.'
          : res.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load article");
    } finally {
      setLoading(false);
    }
  }, [article?.id, article?.url]);

  // No URL — can't fetch
  if (!article?.url) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="glass-panel p-8 flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="w-6 h-6 text-berna-purple animate-spin" />
        <p className="text-xs text-muted-foreground">Fetching full article from source…</p>
      </div>
    );
  }

  // Error state — offer retry or external link
  if (error && !bodyContent) {
    return (
      <div className="glass-panel p-6 border-l-2 border-yellow-400/40">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-yellow-400 mb-1">Couldn't load article natively</p>
            <p className="text-xs text-muted-foreground mb-3">{error}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="border-white/10 text-white text-xs h-7" onClick={fetchContent}>
                Try Again
              </Button>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="text-berna-purple text-xs h-7">
                  <ExternalLink className="w-3 h-3 mr-1" /> Open Original Source
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Content available — show the native reader
  if (bodyContent) {
    return (
      <div className="glass-panel p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
          <BookOpen className="w-4 h-4 text-berna-purple" />
          <h3 className="text-sm font-semibold text-white">Full Article</h3>
          {sourceLabel && (
            <span className="text-[10px] text-muted-foreground ml-auto">{sourceLabel}</span>
          )}
        </div>

        <div className="text-sm text-white/75 leading-relaxed space-y-3">
          <ReactMarkdown
            components={{
              h2: ({ node, ...props }) => <h2 className="text-base font-heading font-semibold text-white mt-5 mb-2" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-sm font-heading font-semibold text-white mt-4 mb-1.5" {...props} />,
              h4: ({ node, ...props }) => <h4 className="text-sm font-heading font-medium text-white mt-3 mb-1" {...props} />,
              p: ({ node, ...props }) => <p className="text-white/75 leading-relaxed my-2" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-berna-purple/40 pl-3 text-white/60 italic my-3" {...props} />,
              a: ({ node, ...props }) => <a className="text-berna-purple hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
              strong: ({ node, ...props }) => <strong className="text-white/90 font-semibold" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2" {...props} />,
              li: ({ node, ...props }) => <li className="text-white/75" {...props} />,
            }}
          >
            {bodyContent}
          </ReactMarkdown>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
          <a href={article.url} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-berna-purple transition-colors">
            <ExternalLink className="w-3 h-3" />
            View Original Source
          </a>
        </div>
      </div>
    );
  }

  // Initial state — prompt user to load
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-berna-purple" />
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Full Article</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Read the full article natively within CREAPD — no new tab needed.
      </p>
      <Button
        size="sm"
        className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8"
        onClick={fetchContent}
      >
        <BookOpen className="w-3 h-3 mr-1.5" />
        Load Full Article
      </Button>
    </div>
  );
}