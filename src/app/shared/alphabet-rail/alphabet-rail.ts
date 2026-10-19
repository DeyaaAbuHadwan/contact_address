// shared/alphabet-rail/alphabet-rail.ts
import { Component, input, output } from '@angular/core';

export const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/**
 * Vertical A-Z bar. Letters missing from `available` are greyed out and disabled.
 * Usage: <app-alphabet-rail [selected]="letter()" [available]="letters()" (letterSelect)="onLetter($event)" />
 * Emits '' for "All".
 */
@Component({
  selector: 'app-alphabet-rail',
  standalone: true,
  host: {
    role: 'navigation',
    'aria-label': 'Filter by first letter',
  },
  template: `
    <button
      type="button"
      class="letter letter--all"
      [class.is-active]="!selected()"
      [attr.aria-pressed]="!selected()"
      title="Show all"
      (click)="letterSelect.emit('')"
    >
      All
    </button>
    @for (letter of letters; track letter) {
      <button
        type="button"
        class="letter"
        [class.is-active]="selected() === letter"
        [attr.aria-pressed]="selected() === letter"
        [disabled]="!isAvailable(letter)"
        [title]="isAvailable(letter) ? 'Starts with ' + letter : 'Nothing starts with ' + letter"
        (click)="letterSelect.emit(letter)"
      >
        {{ letter }}
      </button>
    }
  `,
  styles: `
    :host {
      position: sticky;
      top: 16px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      padding: 6px 4px;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      background-color: #f8fafc;
    }

    .letter {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 18px;
      padding: 0;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: #2563eb;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
    }

    .letter--all {
      width: auto;
      padding: 0 6px;
      margin-bottom: 2px;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .letter:hover:not(:disabled) {
      background-color: #dbeafe;
    }

    .letter.is-active {
      background-color: #2563eb;
      color: #ffffff;
    }

    .letter:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 1px;
    }

    /* Nothing starts with this letter */
    .letter:disabled {
      color: #c0c0c0;
      cursor: default;
    }
  `,
})
export class AlphabetRail {
  readonly letters = ALPHABET;

  selected = input('');
  // null = not loaded yet: keep every letter clickable instead of all silver
  available = input<ReadonlySet<string> | null>(null);
  letterSelect = output<string>();

  isAvailable(letter: string) {
    return this.available()?.has(letter) ?? true;
  }
}
