import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { generateExcel } from '../services/exportService.js';

const router = Router();

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const format = (req.query.format as string) || 'xlsx';

  try {
    // Get all results for this search
    const { data: results, error } = await supabase
      .from('results')
      .select('name, email, company, source_url')
      .eq('search_id', id);

    if (error) {
      throw error;
    }

    if (!results || results.length === 0) {
      res.status(404).json({ error: 'No results found to export' });
      return;
    }

    if (format === 'xlsx') {
      const buffer = generateExcel(results);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=results-${id}.xlsx`);
      res.send(buffer);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
