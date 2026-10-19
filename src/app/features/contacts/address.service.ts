import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';
import { ContactAddress as Address } from './contact.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private supabaseService = inject(SupabaseService);

  async addAddresses(contactId: string, addresses: Address[]): Promise<void> {
    if (addresses.length === 0) return;

    const { error } = await this.supabaseService.client.from('addresses').insert(
      addresses.map((address) => ({
        contact_id: contactId,
        type: address.type,
        value: address.value,
      })),
    );

    if (error) throw new Error(`Failed to add addresses: ${error.message}`);
  }

  async updateAddress(addressId: string, addressData: Address): Promise<Address> {
    const { data, error } = await this.supabaseService.client
      .from('addresses')
      .update({
        type: addressData.type,
        value: addressData.value,
      })
      .eq('id', addressId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update address: ${error.message}`);
    return data as Address;
  }

  async replaceAddresses(contactId: string, addresses: Address[]): Promise<void> {
    await this.deleteAddressesByContactId(contactId);

    // Supabase RLS doesn't return an error when it blocks a delete, it just deletes nothing so we need to check if delete succefull
    const remaining = await this.getAddressByContactId(contactId);
    if (remaining.length > 0) {
      throw new Error(
        'Old addresses were not deleted. Add a DELETE policy for the addresses table in Supabase.',
      );
    }

    await this.addAddresses(contactId, addresses);
  }

  async deleteAddressesByContactId(contactId: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('addresses')
      .delete()
      .eq('contact_id', contactId);

    if (error) throw new Error(`Failed to delete addresses: ${error.message}`);
  }

  async getAddressByContactId(contactId: string): Promise<Address[]> {
    const { data, error } = await this.supabaseService.client
      .from('addresses')
      .select()
      .eq('contact_id', contactId);

    if (error) throw new Error(`Failed to load address: ${error.message}`);
    return data as Address[];
  }
}
