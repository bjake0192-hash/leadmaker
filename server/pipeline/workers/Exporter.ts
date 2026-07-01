import * as xlsx from 'xlsx';
import { Parser } from 'json2csv';
import { Lead } from '../types';

export class Exporter {
  /**
   * Prepares leads for export by flattening the nested structures.
   */
  private prepareLeadsForExport(leads: Lead[]) {
    return leads.map(lead => ({
      ID: lead.id,
      Name: lead.name,
      Category: lead.category || '',
      Address: lead.address || '',
      URL: lead.url,
      Region: lead.sourceRegion,
      Emails: lead.emails?.join(', ') || '',
      Phones: lead.phones?.join(', ') || '',
      LinkedIn: lead.socials?.linkedin || '',
      Twitter: lead.socials?.twitter || '',
      Facebook: lead.socials?.facebook || '',
      Instagram: lead.socials?.instagram || '',
      Status: lead.status
    }));
  }

  public toCSV(leads: Lead[]): string {
    const data = this.prepareLeadsForExport(leads);
    if (data.length === 0) return '';
    const parser = new Parser();
    return parser.parse(data);
  }

  public toExcelBuffer(leads: Lead[]): Buffer {
    const data = this.prepareLeadsForExport(leads);
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // Push to Google Sheets could be implemented here via Google Sheets API
  // or Zapier/Make webhook
}
