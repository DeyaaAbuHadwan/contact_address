import { Injectable, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

/**
 * Angular replacement for window.confirm().
 * Usage:  if (await this.confirmService.confirm({ title: '...', message: '...' })) { ... }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(Dialog);

  async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialogRef = this.dialog.open<boolean, ConfirmDialogData>(ConfirmDialog, {
      data,
      role: 'alertdialog', // screen readers announce it as a question that needs an answer
      ariaLabelledBy: 'confirm-dialog-title',
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
    });

    const result = await firstValueFrom(dialogRef.closed);
    return result === true;
  }
}
