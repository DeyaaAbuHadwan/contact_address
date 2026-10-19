import { Component, computed, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, concat, map, of, switchMap, timer } from 'rxjs';
import { Contact, ContactAddress } from '../contact.model';

type AddressType = ContactAddress['type'];

const METHOD_LABELS: Record<AddressType, string> = {
  mobile: 'Mobile',
  email: 'Email',
  landline: 'Landline',
  fax: 'Fax',
};

const METHOD_ICONS: Record<AddressType, string> = {
  mobile: '📱',
  email: '✉️',
  landline: '☎️',
  fax: '📠',
};

/**
 * Side panel that previews the contact selected in the list.
 * Presentational only: the list owns the selection and decides what previous/next mean.
 * Usage: <app-contact-peek [contact]="c" [position]="3" [total]="20" (close)="..." (next)="..." />
 */
@Component({
  selector: 'app-contact-peek',
  templateUrl: './contact-peek.html',
  styleUrl: './contact-peek.css',
  host: {
    '(keydown.escape)': 'close.emit()',
  },
})
export class ContactPeek {
  contact = input.required<Contact>();
  position = input.required<number>(); // 1-based place of this contact in the list
  total = input.required<number>(); // contacts loaded so far
  hasMore = input(false); // more pages exist on the server

  close = output<void>();
  previous = output<void>();
  next = output<void>();
  openDetails = output<void>();

  readonly labels = METHOD_LABELS;
  readonly icons = METHOD_ICONS;

  fullName = computed(() => `${this.contact().first_name} ${this.contact().last_name}`.trim());
  initials = computed(
    () => this.contact().first_name.charAt(0) + this.contact().last_name.charAt(0),
  );
  roleLine = computed(() =>
    [this.contact().job_title, this.contact().company].filter(Boolean).join(' · '),
  );
  // Same name, same colour: the eye recognises a contact before reading the name
  hue = computed(
    () => [...this.fullName()].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360,
  );

  addresses = computed(() => this.contact().addresses ?? []);
  phone = computed(
    () =>
      this.addresses().find((a) => a.type === 'mobile') ??
      this.addresses().find((a) => a.type === 'landline'),
  );
  email = computed(() => this.addresses().find((a) => a.type === 'email'));

  // Shows "Copied" for 1.5s. A new copy restarts the timer: switchMap cancels the old one
  private copied$ = new Subject<string>();
  copiedValue = toSignal(
    this.copied$.pipe(switchMap((value) => concat(of(value), timer(1500).pipe(map(() => null))))),
    { initialValue: null },
  );

  async copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.copied$.next(value);
    } catch {
      // Clipboard blocked by the browser: the value is still selectable by hand (user-select: all)
    }
  }
}
