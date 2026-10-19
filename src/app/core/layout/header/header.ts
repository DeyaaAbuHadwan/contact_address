import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/auth/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  authService = inject(AuthService);

  get user() {
    return this.authService.currentUser();
  }

  get userName(): string {
    const displayName = this.user?.user_metadata?.['display_name']?.trim();
    if (displayName) return displayName;

    const email = this.user?.email ?? '';
    return email ? email.split('@')[0] : 'User';
  }

  async onLogout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error: any) {
      console.error('Logout error:', error.message);
    }
  }
}
