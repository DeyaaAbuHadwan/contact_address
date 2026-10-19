import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';
import { UserRole } from '@core/auth/role.model';
import { PendingUser } from './pending-user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private supabaseService = inject(SupabaseService);
  private pendingCount = signal(0);

  readonly pendingUsersCount = this.pendingCount.asReadonly();

  async getPendingUsers(): Promise<PendingUser[]> {
    const { data, error } = await this.supabaseService.client.rpc('get_pending_users');

    if (error) throw new Error(`Failed to load register requests: ${error.message}`);
    const users = (data ?? []) as PendingUser[];
    this.pendingCount.set(users.length);
    return users;
  }

  async refreshPendingUsersCount(): Promise<void> {
    const { data, error } = await this.supabaseService.client.rpc('count_pending_users');

    if (error) {
      console.error('Failed to load register requests count:', error.message);
      return;
    }
    this.pendingCount.set(data ?? 0);
  }

  async approveUser(userId: string, role: Exclude<UserRole, 'new'>): Promise<void> {
    const { error } = await this.supabaseService.client.rpc('approve_user', {
      target_user_id: userId,
      role_name: role,
    });

    if (error) throw new Error(`Failed to approve user: ${error.message}`);
    this.pendingCount.update((count) => Math.max(count - 1, 0));
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseService.client.rpc('check_email_exists', {
        email_to_check: email,
      });

      if (error) {
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('Unexpected error checking email:', err);
      return false;
    }
  }
}
