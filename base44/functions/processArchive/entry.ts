import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Archive articles from completed/exported productions
    const exportedProductions = await base44.asServiceRole.entities.Production.filter({ status: 'exported' });
    const archivedProductions = await base44.asServiceRole.entities.Production.filter({ status: 'archived' });
    const doneProductions = [...exportedProductions, ...archivedProductions];

    let articlesArchived = 0;
    for (const prod of doneProductions) {
      const articles = await base44.asServiceRole.entities.Article.filter({ production_id: prod.id });
      const toArchive = articles.filter(a => a.status !== 'archived' && a.status !== 'rejected');
      for (const a of toArchive) {
        await base44.asServiceRole.entities.Article.update(a.id, {
          status: 'archived',
          archived_date: now.toISOString()
        });
        articlesArchived++;
      }
    }

    // 2. Set archived_date on rejected articles that don't have one yet
    const rejectedArticles = await base44.asServiceRole.entities.Article.filter({ status: 'rejected' });
    let rejectedDated = 0;
    for (const a of rejectedArticles) {
      if (!a.archived_date) {
        await base44.asServiceRole.entities.Article.update(a.id, { archived_date: now.toISOString() });
        rejectedDated++;
      }
    }

    // 3. Delete rejected articles older than 7 days
    let deletedCount = 0;
    for (const a of rejectedArticles) {
      if (a.archived_date && new Date(a.archived_date) < sevenDaysAgo) {
        await base44.asServiceRole.entities.Article.delete(a.id);
        deletedCount++;
      }
    }

    return Response.json({
      archived_from_productions: articlesArchived,
      rejected_dated: rejectedDated,
      deleted_expired: deletedCount,
      processed_at: now.toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});