import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createMessageFromContext } from '@/lib/createMessage';
import { PenTool, Loader2 } from 'lucide-react';

/**
 * Reusable "Create Message" button that auto-creates a full production from any context.
 * Clicking it triggers the automation-first pipeline: creates a config from saved defaults,
 * invokes the build function (script, slides, voice, assets, package), and routes to the
 * Message Builder workspace.
 *
 * @param {Object} context - Passed to createMessageFromContext (title, research_session_id, etc.)
 * @param {string} label - Button label (default: "Create Message")
 * @param {string} variant - Button variant
 * @param {string} size - Button size
 * @param {React.ReactNode} children - Optional children
 */
export default function CreateMessageButton({ context, label, variant, size, className, children }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleClick = async () => {
    setCreating(true);
    try {
      await createMessageFromContext(context);
      navigate('/spiritual/message');
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={creating} variant={variant} size={size} className={className}>
      {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PenTool className="w-4 h-4 mr-2" />}
      {creating ? 'Creating...' : (label || 'Create Message')}
      {children}
    </Button>
  );
}