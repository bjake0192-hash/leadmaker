import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Since we don't have user authentication yet, we'll return the latest searches globally or handle it differently.
    // Ideally, we filter by user_id.
    // For now, let's return all searches ordered by created_at desc.
    
    const { data: searches, error } = await supabase
      .from('searches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    res.json({ searches });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
