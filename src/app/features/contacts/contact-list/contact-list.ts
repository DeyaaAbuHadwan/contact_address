import {
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Contact } from '../contact.model';
import { ContactsService } from '../contacts.service';
import { AddressService } from '../address.service';
import { HasRole } from '@core/auth/has-role';
import { SortableHeader, SortState } from '@shared/sortable-header/sortable-header';
import { ALPHABET, AlphabetRail } from '@shared/alphabet-rail/alphabet-rail';
import { ContactPeek } from '../contact-peek/contact-peek';
import { ConfirmService } from '@shared/confirm-dialog/confirm.service';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/users/user.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  auditTime,
  catchError,
  filter,
  from,
  fromEvent,
  merge,
  of,
  skip,
  switchMap,
  tap,
  throttleTime,
} from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [
    CommonModule,
    HasRole,
    SortableHeader,
    AlphabetRail,
    ContactPeek,
    ScrollingModule,
    MatProgressSpinnerModule,
    RouterLink,
    ReactiveFormsModule,
  ],
  templateUrl: './contact-list.html',
  styleUrl: './contact-list.css',
})
export default class ContactList implements OnInit {
  private contactsService = inject(ContactsService);
  private addressService = inject(AddressService);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  pendingRequestsCount = this.userService.pendingUsersCount;

  contacts = signal<Contact[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  // Matches the server order (first name) until the user clicks a header
  sortState = signal<SortState<keyof Contact>>({
    column: 'first_name',
    direction: 'asc',
  });

  searchInputControl = new FormControl('');
  isSearching = signal(false);
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  selectedLetter = signal('');
  availableLetters = signal<Set<string> | null>(null);
  private collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  sortedContacts = computed(() => {
    const data = [...this.contacts()];
    const { column, direction } = this.sortState();

    if (!column) return data;

    const factor = direction === 'asc' ? 1 : -1;

    return data.sort((a, b) => {
      const valA = a[column]?.toString().trim() ?? '';
      const valB = b[column]?.toString().trim() ?? '';

      // Empty values always go last, regardless of direction
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;

      return this.collator.compare(valA, valB) * factor;
    });
  });

  // ---------- Selected contact (preview panel) ----------
  // Stays selected while the contact is still listed (search, sort, load more),
  // and clears itself when it isn't (filtered out or deleted).
  selectedId = linkedSignal<Contact[], string | null>({
    source: this.sortedContacts,
    computation: (list, previous) => {
      const id = previous?.value ?? null;
      if (list.length === 0) return id; // resetList empties the list during a search: keep the id
      return list.some((c) => c.id === id) ? id : null;
    },
  });

  selectedIndex = computed(() => {
    const id = this.selectedId();
    return id ? this.sortedContacts().findIndex((c) => c.id === id) : -1;
  });

  selectedContact = computed(() => this.sortedContacts()[this.selectedIndex()] ?? null);

  readonly addressIcons = {
    mobile: '📱',
    email: '✉️',
    landline: '☎️',
    fax: '📠',
  };

  constructor() {
    // The letter feeds the same pipeline as the search box, so one switchMap cancels whichever
    // request is stale. skip(1): toObservable emits the current letter on subscribe, and
    // ngOnInit already loads the first page.
    merge(this.searchInputControl.valueChanges, toObservable(this.selectedLetter).pipe(skip(1)))
      .pipe(
        // Show the loader from the first keystroke. No distinctUntilChanged:
        // a filtered-out value would never reach subscribe and leave it stuck on
        tap(() => this.isSearching.set(true)),
        auditTime(300),
        tap(() => this.resetList()),
        switchMap(() =>
          from(
            this.contactsService.getContacts(
              0,
              19,
              this.searchInputControl.value ?? '',
              this.selectedLetter(),
            ),
          ).pipe(
            catchError((error) => {
              this.errorMessage.set(error.message);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        if (data) this.setContacts(data);
        this.isSearching.set(false);
      });

    // Ctrl+K focuses the search bar
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter((e) => e.ctrlKey && e.key === 'k'),
        throttleTime(500), // تجاهل الضغط المتكرر خلال نصف ثانية
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        e.preventDefault();
        this.searchInput()?.nativeElement.focus();
      });

    effect(() => {
      if (this.authService.isAdmin()) {
        untracked(() => this.userService.refreshPendingUsersCount());
      }
    });
  }

  private resetList() {
    this.errorMessage.set('');
    this.contacts.set([]);
    this.loadedCount.set(0);
    this.hasMoreData.set(true);
    this.viewport()?.scrollToIndex(0);
  }

  private setContacts(data: Contact[]) {
    this.contacts.set(data);
    this.loadedCount.set(data.length);
    this.hasMoreData.set(data.length === 20);
  }

  ngOnInit() {
    this.loadContacts();
    this.loadAvailableLetters();
  }

  async loadAvailableLetters() {
    try {
      const letters = await this.contactsService.getAvailableLetters(ALPHABET);

      this.availableLetters.set(letters);
      console.log('[BUG DEMO] availableLetters is set in memory:', [...letters].join(', '));
    } catch (error) {
      console.error('Error loading available letters:', error);
    }
  }

  // Clicking the active letter again (or passing '') goes back to all contacts
  onLetterClick(letter: string) {
    this.selectedLetter.set(this.selectedLetter() === letter ? '' : letter);
  }

  async loadContacts() {
    try {
      const data = await this.contactsService.getContacts(
        0,
        19,
        this.searchInputControl.value ?? '',
        this.selectedLetter(),
      );
      this.setContacts(data);
    } catch (error: any) {
      this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  viewDetails(id: string) {
    this.router.navigate(['/contacts/details', id]);
  }

  clearSelection() {
    this.selectedId.set(null);
  }

  onRowClick(contact: Contact, event: MouseEvent) {
    // Buttons inside the row (View Details, Delete) keep their own job
    if ((event.target as HTMLElement).closest('button, a')) return;
    if (contact.id) this.selectedId.set(contact.id);
  }

  moveSelection(step: 1 | -1) {
    const current = this.selectedIndex();
    if (current === -1) {
      this.selectAt(step === 1 ? 0 : this.sortedContacts().length - 1);
    } else {
      this.selectAt(current + step);
    }
  }

  // Arrow keys work only when the list itself has focus, not a button inside a row
  onListKeydown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return;

    switch (event.key) {
      case 'ArrowDown':
        this.moveSelection(1);
        break;
      case 'ArrowUp':
        this.moveSelection(-1);
        break;
      case 'Home':
        this.selectAt(0);
        break;
      case 'End':
        this.selectAt(this.sortedContacts().length - 1);
        break;
      case 'Enter': {
        const id = this.selectedContact()?.id;
        if (id) this.viewDetails(id);
        break;
      }
      case 'Escape':
        this.clearSelection();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private selectAt(index: number) {
    const list = this.sortedContacts();
    if (list.length === 0) return;
    const target = Math.min(Math.max(index, 0), list.length - 1);
    const id = list[target].id;
    if (!id) return;
    this.selectedId.set(id);
    this.revealRow(target);
  }

  // Scrolls just enough to show the row, like a native list. Reaching the bottom
  // this way also triggers scrolledIndexChange, so the next page loads as usual.
  private revealRow(index: number) {
    const viewport = this.viewport();
    if (!viewport) return;

    const top = index * this.rowHeight;
    const bottom = top + this.rowHeight;
    const offset = viewport.measureScrollOffset();
    const height = viewport.getViewportSize();

    if (top < offset) viewport.scrollToOffset(top);
    else if (bottom > offset + height) viewport.scrollToOffset(bottom - height);
  }

  addNewContact() {
    this.router.navigate(['/contacts/details', '']);
  }

  async deleteContact(contact: Contact) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete contact?',
      message: `Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.addressService.deleteAddressesByContactId(contact.id!);
      await this.contactsService.deleteContact(contact.id!);
      this.contacts.update((list) => list.filter((c) => c.id !== contact.id));
      // One row less on the server too, so the next page doesn't skip a contact
      this.loadedCount.update((count) => count - 1);
      // The deleted contact may have been the last one under its letter
      this.loadAvailableLetters();
    } catch (error: any) {
      this.errorMessage.set(error.message);
    }
  }

  onSort(column: keyof Contact) {
    const current = this.sortState();
    if (current.column === column) {
      this.sortState.set({
        column,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      this.sortState.set({ column, direction: 'asc' });
    }
  }

  // Scroll loading wokrs
  // ===========================================

  isLoadingMore = signal(false);
  hasMoreData = signal(true);
  loadedCount = signal(0);

  readonly rowHeight = 64;
  private readonly maxViewportHeight = 500;
  private readonly loadThreshold = 5;
  private viewport = viewChild(CdkVirtualScrollViewport);

  viewportHeight = computed(() =>
    Math.min(this.contacts().length * this.rowHeight, this.maxViewportHeight),
  );

  trackById = (_index: number, contact: Contact) => contact.id;

  onScrolledIndexChange() {
    const viewport = this.viewport();
    if (!viewport) return;

    const lastRenderedRow = viewport.getRenderedRange().end;
    const totalRows = viewport.getDataLength();
    if (
      lastRenderedRow >= totalRows - this.loadThreshold &&
      !this.isLoading() &&
      !this.isLoadingMore() &&
      this.hasMoreData()
    ) {
      this.loadMoreContacts();
    }
  }

  async loadMoreContacts() {
    this.isLoadingMore.set(true);

    const start = this.loadedCount();
    const limit = 10;
    const end = start + limit - 1;

    const term = this.searchInputControl.value ?? '';
    const letter = this.selectedLetter();

    try {
      const newData = await this.contactsService.getContacts(start, end, term, letter);
      // The search or letter changed while this page was loading: drop it rather than
      // appending stale rows to the new results
      if (term !== (this.searchInputControl.value ?? '') || letter !== this.selectedLetter())
        return;
      if (newData) {
        this.contacts.update((prev) => [...prev, ...newData]);
        this.loadedCount.update((count) => count + newData.length);

        if (newData.length < limit) {
          this.hasMoreData.set(false);
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      this.isLoadingMore.set(false);
    }
  }
}
