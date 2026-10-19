// shared/directives/digits-only.ts
import { Directive, ElementRef, booleanAttribute, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Lets an <input> accept digits only: letters and symbols are removed as the user
 * types, pastes or autofills.
 * Usage: <input type="tel" formControlName="phone" [digitsOnly]="true" />
 * With a country code: <input ... [digitsOnly]="true" [allowPlus]="true" />  → "+970599123456"
 */

@Directive({
  selector: 'input[digitsOnly]',
  standalone: true,
  host: {
    '(input)': 'onInput()',
    '[attr.inputmode]': "digitsOnly() ? (allowPlus() ? 'tel' : 'numeric') : null",
  },
})
export class DigitsOnly {
  digitsOnly = input(true, { transform: booleanAttribute });
  allowPlus = input(false, { transform: booleanAttribute });

  private element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  // The form control on the same input (formControlName), so the form value stays in sync
  private ngControl = inject(NgControl);

  onInput() {
    if (!this.digitsOnly()) return;

    const input = this.element.nativeElement;
    const keepPlus = this.allowPlus() && input.value.trimStart().startsWith('+');
    const digits = (keepPlus ? '+' : '') + input.value.replace(/\D/g, '');

    if (digits !== input.value) {
      input.value = digits;
      this.ngControl?.control?.setValue(digits);
    }
  }
}
