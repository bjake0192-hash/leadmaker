import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  try {
    // Check if search exists and get status
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .select('status, query, created_at')
      .eq('id', id)
      .single();

    if (searchError || !search) {
      res.status(404).json({ error: 'Search not found' });
      return;
    }

    // Get results with pagination
    const { data: results, count, error: resultsError } = await supabase
      .from('results')
      .select('*', { count: 'exact' })
      .eq('search_id', id)
      .range(offset, offset + limit - 1);

    if (resultsError) {
      throw resultsError;
    }

    res.json({
      search,
      results,
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit
    });

  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
