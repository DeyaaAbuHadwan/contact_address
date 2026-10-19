export interface ContactAddress {
  contact_id?: string;
  type: 'mobile' | 'email' | 'landline' | 'fax';
  value: string;
}

export interface Contact {
  id?: string;
  createdBy?: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  company?: string;
  city?: string;
  lastChange?: string;
  addresses?: ContactAddress[];
}
