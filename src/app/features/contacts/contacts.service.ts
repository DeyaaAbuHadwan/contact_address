import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';
import { Contact } from './contact.model';
import { AddressService } from './address.service';
@Injectable({ providedIn: 'root' })
export class ContactsService {
  private supabaseService = inject(SupabaseService);
  private addressService = inject(AddressService);

  async getContacts(
    start: number,
    end: number,
    searchTerm: string = '',
    firstLetter: string = '',
  ): Promise<Contact[]> {
    let query = this.supabaseService.client.from('contacts').select('*, addresses(*)');
    if (firstLetter) {
      query = query.ilike('first_name', `${firstLetter}%`);
    }
    if (searchTerm) {
      // Step 1: Check the addresses table for any matches
      const matchedAddresses = await this.supabaseService.client
        .from('addresses')
        .select('contact_id')
        .or(`value.ilike.%${searchTerm}%`);

      // Extract a clean array of unique contact UUIDs
      const matchedContactIds = (matchedAddresses.data ?? []).map((address) => address.contact_id);

      let contactFilter = `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,job_title.ilike.%${searchTerm}%`;

      if (matchedContactIds.length > 0) {
        contactFilter += `,id.in.(${matchedContactIds.join(',')})`;
      }

      query = query.or(contactFilter);
    }
    // Pages come alphabetically by first name, so the list is in order before any header click
    // and "load more" continues where the last page stopped; id keeps the paging order stable
    const { data, error } = await query
      .order('first_name', { ascending: true })
      .order('id', { ascending: true })
      .range(start, end);

    if (error) throw error;
    return data as Contact[];
  }

  /** The letters that at least one contact's first name starts with */
  async getAvailableLetters(letters: readonly string[]): Promise<Set<string>> {
    const results = await Promise.all(
      letters.map(async (letter) => {
        const { count, error } = await this.supabaseService.client
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .ilike('first_name', `${letter}%`);

        if (error) throw error;
        return (count ?? 0) > 0 ? letter : null;
      }),
    );
    return new Set(results.filter((letter): letter is string => letter !== null));
  }

  async getContactById(id: string): Promise<Contact> {
    const { data, error } = await this.supabaseService.client
      .from('contacts')
      .select('*, addresses(*)')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to load contact details: ${error.message}`);
    return data as Contact;
  }

  async addContact(newContact: Contact): Promise<Contact> {
    // addresses live in their own table, so keep them out of the contacts insert
    const { addresses = [], ...contactData } = newContact;

    // Get current authenticated user ID for the created_by foreign key
    const {
      data: { session },
      error: sessionError,
    } = await this.supabaseService.client.auth.getSession();

    if (sessionError || !session) {
      throw new Error('Your session has expired. Please log in again.');
    }

    const { data, error } = await this.supabaseService.client
      .from('contacts')
      .insert({ ...contactData, created_by: session.user.id })
      .select()
      .single();

    if (error) throw new Error(`Failed to add contact: ${error.message}`);

    // Use the id the database generated for the new contact
    await this.addressService.addAddresses(data.id, addresses);
    return data as Contact;
  }

  async updateContact(contact: Contact): Promise<void> {
    const { id, addresses = [], ...contactData } = contact;

    const { error } = await this.supabaseService.client
      .from('contacts')
      .update(contactData)
      .eq('id', id);

    if (error) throw new Error(`Failed to update contact: ${error.message}`);

    // Wait for the delete to finish before inserting, otherwise the old rows can survive
    await this.addressService.replaceAddresses(id!, addresses);
  }

  async deleteContact(id: string): Promise<void> {
    const { error } = await this.supabaseService.client.from('contacts').delete().eq('id', id);

    if (error) throw new Error(`Failed to delete contact: ${error.message}`);
  }
}
