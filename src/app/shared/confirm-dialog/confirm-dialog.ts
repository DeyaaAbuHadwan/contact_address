// shared/confirm-dialog/confirm-dialog.ts
import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string; // default: "Confirm"
  cancelText?: string; // default: "Cancel"
  danger?: boolean; // true = red confirm button (delete, discard…)
}

/**
 * The confirmation box itself. Don't open it directly: use ConfirmService.confirm(),
 * which opens it and gives back true / false.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="confirm-dialog">
      <h3 id="confirm-dialog-title">{{ data.title }}</h3>
      <p>{{ data.message }}</p>

      <div class="actions">
        <!-- Cancel comes first, so it gets the focus: pressing Enter by mistake is safe -->
        <button type="button" class="btn-cancel" (click)="dialogRef.close(false)">
          {{ data.cancelText ?? 'Cancel' }}
        </button>
        <button
          type="button"
          class="btn-confirm"
          [class.danger]="data.danger"
          (click)="dialogRef.close(true)"
        >
          {{ data.confirmText ?? 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .confirm-dialog {
      background: #ffffff;
      color: #0f172a;
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      animation: pop-in 0.15s ease-out;
    }

    h3 {
      margin: 0 0 8px;
      font-size: 1.15rem;
      font-weight: 700;
    }

    p {
      margin: 0 0 24px;
      color: #475569;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    button {
      border: none;
      border-radius: 8px;
      padding: 9px 18px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    button:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    .btn-cancel {
      background: #f1f5f9;
      color: #334155;
    }

    .btn-cancel:hover {
      background: #e2e8f0;
    }

    .btn-confirm {
      background: #2563eb;
      color: #ffffff;
    }

    .btn-confirm:hover {
      background: #1d4ed8;
    }

    .btn-confirm.danger {
      background: #dc2626;
    }

    .btn-confirm.danger:hover {
      background: #b91c1c;
    }

    @keyframes pop-in {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
})
export class ConfirmDialog {
  // The texts passed to ConfirmService.confirm({...})
  data = inject<ConfirmDialogData>(DIALOG_DATA);
  // Handle to this open dialog: close(true) = confirmed, close(false) = cancelled
  dialogRef = inject<DialogRef<boolean>>(DialogRef);
}
