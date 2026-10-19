import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserRole } from '@core/auth/role.model';
import { PendingUser } from '@core/users/pending-user.model';
import { UserService } from '@core/users/user.service';

@Component({
  selector: 'app-register-requests',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './register-requests.html',
  styleUrl: './register-requests.css',
})
export default class RegisterRequests implements OnInit {
  private userService = inject(UserService);

  requests = signal<PendingUser[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit() {
    this.loadRequests();
  }

  async loadRequests() {
    try {
      this.requests.set(await this.userService.getPendingUsers());
    } catch (error: any) {
      this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async approveRequest(request: PendingUser, role: string) {
    if (!role) {
      this.errorMessage.set(`Select a role for ${request.first_name} ${request.last_name} first.`);
      return;
    }
    this.errorMessage.set('');

    try {
      await this.userService.approveUser(request.id, role as Exclude<UserRole, 'new'>);
      this.requests.update((list) => list.filter((r) => r.id !== request.id));
    } catch (error: any) {
      this.errorMessage.set(error.message);
    }
  }
}
