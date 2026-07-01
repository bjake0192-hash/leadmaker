import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { PipelineOrchestrator } from '../pipeline/PipelineOrchestrator.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { keyword, location, max_results = 10, query, fastMode = false } = req.body;

  if (!keyword || !location) {
    res.status(400).json({ error: 'Keyword and location are required' });
    return;
  }

  try {
    // 1. Create search record
    const { data: search, error: createError } = await supabase
      .from('searches')
      .insert({
        query: query || `${keyword} in ${location}${fastMode ? ' (Fast Mode)' : ''}`,
        max_results,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    if (!search) {
      throw new Error('Failed to create search record');
    }

    // 2. Start processing
    const orchestrator = new PipelineOrchestrator();
    
    // If it's Fast Mode, we can try to wait for the initial search results 
    // before responding to ensure the user sees progress immediately on Vercel.
    if (fastMode) {
      try {
        await supabase
          .from('searches')
          .update({ status: 'processing' })
          .eq('id', search.id);

        const pipelineLeads = await orchestrator.run({
          keyword,
          location,
          maxResultsPerRegion: max_results,
          fastMode,
        });

        const validResults = pipelineLeads.map(lead => ({
          search_id: search.id,
          name: lead.name,
          email: lead.emails.length > 0 ? lead.emails[0] : null,
          company: lead.name,
          source_url: lead.url,
        }));

        if (validResults.length > 0) {
          await supabase.from('results').insert(validResults);
        }

        await supabase
          .from('searches')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', search.id);

        res.json({
          search_id: search.id,
          status: 'completed',
          results_count: validResults.length
        });
        return;
      } catch (error) {
        console.error('Fast mode error:', error);
        // Fallback to background if it fails or takes too long
      }
    }

    // Default: Return response immediately for Deep Mode or if Fast Mode failed/timed out
    res.json({
      search_id: search.id,
      status: 'pending',
      estimated_time: fastMode ? 5 : max_results * 10
    });

    // 3. Start background processing (Best effort for Deep Mode on Vercel)
    (async () => {
      try {
        await supabase
          .from('searches')
          .update({ status: 'processing' })
          .eq('id', search.id);

        const pipelineLeads = await orchestrator.run({
          keyword,
          location,
          maxResultsPerRegion: max_results,
          fastMode,
        });

        const validResults = pipelineLeads.map(lead => ({
          search_id: search.id,
          name: lead.name,
          email: lead.emails.length > 0 ? lead.emails[0] : null,
          company: lead.name,
          source_url: lead.url,
        }));

        if (validResults.length > 0) {
          await supabase.from('results').insert(validResults);
        }

        await supabase
          .from('searches')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', search.id);

      } catch (error) {
        console.error('Background processing error:', error);
        await supabase
          .from('searches')
          .update({ status: 'failed' })
          .eq('id', search.id);
      }
    })();

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
