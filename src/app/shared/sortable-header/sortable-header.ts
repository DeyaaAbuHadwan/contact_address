// shared/sortable-header/sortable-header.ts
import { Component, computed, input, output } from '@angular/core';

export type SortDirection = 'asc' | 'desc';

// K = the column names of the table using it, e.g. SortState<keyof Contact>
export interface SortState<K extends string = string> {
  column: K | '';
  direction: SortDirection;
}

/**
 * Clickable, keyboard-accessible table header.
 * Usage: <th [appSortable]="'company'" [sortState]="sortState()" (sort)="onSort($event)">Company</th>
 */
@Component({
  selector: 'th[appSortable]',
  standalone: true,
  host: {
    '[attr.aria-sort]': 'ariaSort()',
  },
  template: `
    <button type="button" class="sort-btn" (click)="sort.emit(column())">
      <ng-content />
      <span class="sort-icon" aria-hidden="true">{{ icon() }}</span>
    </button>
  `,
  styles: `
    .sort-btn {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font: inherit;
      color: inherit;
    }

    .sort-btn:hover {
      color: #1e293b;
    }

    .sort-btn:focus-visible {
      outline: 2px solid #0957bd;
      outline-offset: 2px;
      border-radius: 2px;
    }

    .sort-icon {
      min-width: 1ch;
      opacity: 0.4;
    }

    :host([aria-sort='ascending']) .sort-icon,
    :host([aria-sort='descending']) .sort-icon {
      opacity: 1;
    }
  `,
})
export class SortableHeader<K extends string = string> {
  column = input.required<K>({ alias: 'appSortable' });
  sortState = input.required<SortState<K>>();
  sort = output<K>();

  private isActive = computed(() => this.sortState().column === this.column());

  ariaSort = computed(() => {
    if (!this.isActive()) return 'none';
    return this.sortState().direction === 'asc' ? 'ascending' : 'descending';
  });

  icon = computed(() => {
    if (!this.isActive()) return '↕';
    return this.sortState().direction === 'asc' ? '↑' : '↓';
  });
}
