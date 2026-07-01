import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { PipelineOrchestrator } from '../pipeline/PipelineOrchestrator.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { keyword, location, max_results = 10, query, fastMode = false, requirePhone = false } = req.body;

  if (!keyword || !location) {
    res.status(400).json({ error: 'Keyword and location are required' });
    return;
  }

  try {
    // 1. Create search record
    const { data: search, error: createError } = await supabase
      .from('searches')
      .insert({
        query: query || `${keyword} in ${location}${fastMode ? ' (Fast Mode)' : ''}${requirePhone ? ' (Phone Only)' : ''}`,
        max_results,
        status: 'pending',
        filters: {
          keyword,
          location,
          fastMode,
          requirePhone,
          lastPage: 1
        }
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
          targetTotal: max_results,
          fastMode,
          requirePhone,
        });

        const validResults = pipelineLeads.map(lead => ({
          search_id: search.id,
          name: lead.name,
          email: lead.emails.length > 0 ? lead.emails[0] : null,
          phone: lead.phones.length > 0 ? lead.phones[0] : null,
          address: lead.address,
          company: lead.name,
          source_url: lead.url,
        }));

        if (validResults.length > 0) {
          console.log(`[search.ts] Inserting ${validResults.length} leads into results table...`);
          
          // Deduplicate against any already existing results for this search (unlikely but safe)
          const { data: existingResults } = await supabase
            .from('results')
            .select('source_url')
            .eq('search_id', search.id);
          
          const existingUrls = new Set(existingResults?.map(r => r.source_url) || []);
          const trulyNewResults = validResults.filter(r => !existingUrls.has(r.source_url));

          if (trulyNewResults.length > 0) {
            const { error: insertError } = await supabase.from('results').insert(trulyNewResults);
            if (insertError) {
              console.error('[search.ts] Error inserting results:', insertError);
              throw insertError;
            }
          }
          console.log('[search.ts] Successfully inserted leads.');
        } else {
          console.log('[search.ts] No leads found to insert.');
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
        await supabase
          .from('searches')
          .update({ status: 'failed', filters: { ...search.filters, error: 'Fast mode timeout' } })
          .eq('id', search.id);
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
          targetTotal: max_results,
          fastMode,
          requirePhone,
        });

        const validResults = pipelineLeads.map(lead => ({
          search_id: search.id,
          name: lead.name,
          email: lead.emails.length > 0 ? lead.emails[0] : null,
          phone: lead.phones.length > 0 ? lead.phones[0] : null,
          address: lead.address,
          company: lead.name,
          source_url: lead.url,
        }));

        if (validResults.length > 0) {
          console.log(`[search.ts] Inserting ${validResults.length} leads into results table (Background)...`);
          
          // Deduplicate
          const { data: existingResults } = await supabase
            .from('results')
            .select('source_url')
            .eq('search_id', search.id);
          
          const existingUrls = new Set(existingResults?.map(r => r.source_url) || []);
          const trulyNewResults = validResults.filter(r => !existingUrls.has(r.source_url));

          if (trulyNewResults.length > 0) {
            const { error: insertError } = await supabase.from('results').insert(trulyNewResults);
            if (insertError) {
              console.error('[search.ts] Error inserting results (Background):', insertError);
              throw insertError;
            }
          }
        } else {
          console.log('[search.ts] No leads found to insert (Background).');
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

router.post('/extend', async (req: Request, res: Response): Promise<void> => {
  const { search_id } = req.body;

  if (!search_id) {
    res.status(400).json({ error: 'Search ID is required' });
    return;
  }

  try {
    // 1. Get existing search record
    const { data: search, error: fetchError } = await supabase
      .from('searches')
      .select('*')
      .eq('id', search_id)
      .single();

    if (fetchError || !search) {
      res.status(404).json({ error: 'Search not found' });
      return;
    }

    const filters = search.filters || {};
    const nextPage = (filters.lastPage || 1) + 1;
    const { keyword, location, fastMode, requirePhone } = filters;

    if (!keyword || !location) {
      res.status(400).json({ error: 'Invalid search record: missing keyword/location' });
      return;
    }

    // 2. Update search record to processing
    await supabase
      .from('searches')
      .update({ 
        status: 'processing',
        filters: { ...filters, lastPage: nextPage }
      })
      .eq('id', search_id);

    // 3. Start processing
    const orchestrator = new PipelineOrchestrator();
    
    // We'll run this in the background since it's an extension
    (async () => {
      try {
        const pipelineLeads = await orchestrator.run({
          keyword,
          location,
          targetTotal: 50, // Fixed batch size for extensions
          fastMode,
          requirePhone,
          page: nextPage
        });

        const validResults = pipelineLeads.map(lead => ({
          search_id: search.id,
          name: lead.name,
          email: lead.emails.length > 0 ? lead.emails[0] : null,
          phone: lead.phones.length > 0 ? lead.phones[0] : null,
          address: lead.address,
          company: lead.name,
          source_url: lead.url,
        }));

        if (validResults.length > 0) {
          console.log(`[search.ts] Inserting ${validResults.length} extended leads into results table...`);
          
          // Get existing source_urls for this search to avoid duplicates
          const { data: existingResults } = await supabase
            .from('results')
            .select('source_url')
            .eq('search_id', search.id);
          
          const existingUrls = new Set(existingResults?.map(r => r.source_url) || []);
          const trulyNewResults = validResults.filter(r => !existingUrls.has(r.source_url));

          if (trulyNewResults.length > 0) {
            const { error: insertError } = await supabase.from('results').insert(trulyNewResults);
            if (insertError) {
               console.error('[search.ts] Error inserting extended results:', insertError);
            }
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
        console.error('Extension processing error:', error);
        await supabase
          .from('searches')
          .update({ status: 'completed' }) // Don't fail the whole search if one extension fails
          .eq('id', search.id);
      }
    })();

    res.json({
      success: true,
      next_page: nextPage,
      message: 'Search extension started'
    });

  } catch (error) {
    console.error('Extend search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;