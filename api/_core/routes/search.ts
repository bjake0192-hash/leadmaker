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

    // 2. Return response immediately
    res.json({
      search_id: search.id,
      status: 'pending',
      estimated_time: fastMode ? 5 : max_results * 10 // Fast mode is much quicker
    });

    // 3. Start processing in background using the new Pipeline Orchestrator
    (async () => {
      try {
        await supabase
          .from('searches')
          .update({ status: 'processing' })
          .eq('id', search.id);

        const orchestrator = new PipelineOrchestrator();
        
        // Note: In production, limit maxResultsPerRegion based on max_results 
        // to avoid over-fetching if there are many regions.
        const pipelineLeads = await orchestrator.run({
          keyword,
          location,
          maxResultsPerRegion: max_results,
          fastMode,
        });

        // 4. Map pipeline leads to database schema
        const validResults = pipelineLeads.map(lead => ({
          search_id: search.id,
          name: lead.name,
          email: lead.emails.length > 0 ? lead.emails[0] : null,
          company: lead.name, // Usually the title is the company name
          source_url: lead.url,
          // You could extend the DB schema to store phones, socials, summary, leadScore
        }));

        // Insert results
        if (validResults.length > 0) {
            const { error: insertError } = await supabase
            .from('results')
            .insert(validResults);
            
            if (insertError) {
                console.error('Error inserting results:', insertError);
                throw insertError;
            }
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
