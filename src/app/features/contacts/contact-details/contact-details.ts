import {
  ChangeDetectorRef,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Contact, ContactAddress } from '../contact.model';
import { ContactsService } from '../contacts.service';
import { Router } from '@angular/router';
import { NgSelectComponent } from '@ng-select/ng-select';
import { HasRole } from '@core/auth/has-role';
import { DigitsOnly } from '@shared/directives/digits-only';
import { AuthService } from '@core/auth/auth.service';
import { ConfirmService } from '@shared/confirm-dialog/confirm.service';

type AddressType = ContactAddress['type'];

const ADDRESS_INPUTS: Record<
  AddressType,
  {
    inputType: string;
    placeholder: string;
    validators: ValidatorFn[];
    digitsOnly: boolean;
    allowCountryCode: boolean;
    maxLength: number | null;
  }
> = {
  mobile: {
    inputType: 'tel',
    placeholder: 'e.g. 0599123456 or +970599123456',
    // OLD: validators: [Validators.pattern(/^05\d{8}$/), Validators.maxLength(10)],
    validators: [Validators.pattern(/^(05\d{8}|\+97[02]5\d{8})$/), Validators.maxLength(13)],
    digitsOnly: true,
    allowCountryCode: true,
    maxLength: 13,
  },
  email: {
    inputType: 'email',
    placeholder: 'e.g. john@mail.com',
    validators: [Validators.email],
    digitsOnly: false,
    allowCountryCode: false,
    maxLength: null,
  },

  landline: {
    inputType: 'tel',
    placeholder: 'e.g. 022951234 or +97022951234',
    validators: [Validators.pattern(/^(0\d{8}|\+97[02][1-9]\d{7})$/), Validators.maxLength(12)],
    digitsOnly: true,
    allowCountryCode: true,
    maxLength: 12,
  },
  fax: {
    inputType: 'tel',
    placeholder: 'e.g. 022951235 or +97022951235',
    validators: [Validators.pattern(/^(0\d{8}|\+97[02][1-9]\d{7})$/), Validators.maxLength(12)],
    digitsOnly: true,
    allowCountryCode: true,
    maxLength: 12,
  },
};

// Removes spaces from phone numbers (e.g. "+970 590971946" → "+970590971946"); emails are left as-is
function normalizeAddressValue(type: AddressType, value: string): string {
  return type === 'email' ? value.trim() : value.replace(/\s+/g, '');
}

@Component({
  imports: [ReactiveFormsModule, NgSelectComponent, HasRole, DigitsOnly],
  selector: 'app-contact-details',
  styleUrl: './contact-details.css',
  templateUrl: './contact-details.html',
})
export default class ContactDetails implements OnInit {
  private contactServive = inject(ContactsService);
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);
  private cdr = inject(ChangeDetectorRef);

  order = 'asc';

  contactID = input<string>('');
  canEdit = this.authService.isAdmin;

  addressTypes: { value: AddressType; label: string }[] = [
    { value: 'mobile', label: 'Mobile' },
    { value: 'email', label: 'Email' },
    { value: 'landline', label: 'Landline' },
    { value: 'fax', label: 'Fax' },  ];

  saving = signal(false);
  saveError = signal<string | null>(null);
  contactForm = this.formBuilder.group({
    contactDetailsForm: this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      jobTitle: ['', Validators.required],
      company: ['', Validators.required],
      city: ['', [Validators.required]],
    }),
    addressContactForm: this.formBuilder.array([]),
  });

  async ngOnInit() {
    if (this.contactID()) {
      try {
        const contact = await this.contactServive.getContactById(this.contactID());
        const addresses = contact.addresses;

        this.contactForm.patchValue({
          contactDetailsForm: {
            firstName: contact.first_name,
            lastName: contact.last_name,
            jobTitle: contact.job_title ?? '',
            company: contact.company ?? '',
            city: contact.city ?? '',
          },
        });
        const addressFormArray = this.contactForm.get('addressContactForm') as FormArray;

        addressFormArray.clear();

        if (addresses && addresses.length > 0) {
          addresses.forEach((addr: any) => {
            const addressGroup = this.createAddressGroup();

            addressGroup.patchValue({
              addressType: addr.type,
              addressValue: normalizeAddressValue(addr.type, addr.value ?? ''),
            });

            addressFormArray.push(addressGroup);
          });
        } else {
          addressFormArray.push(this.createAddressGroup());
        }
      } catch (error: any) {
        console.error('Load contact error:', error.message);
      }
    }
    this.applyEditPermission();
  }

  private applyEditPermission() {
    if (!this.canEdit()) {
      this.contactForm.disable({ emitEvent: false });
    }
  }
  showError(control: AbstractControl): boolean {
    return control.invalid && control.dirty && control.touched;
  }

  get addressContactForm(): FormArray {
    return this.contactForm.get('addressContactForm') as FormArray;
  }

  createAddressGroup(): FormGroup {
    const group = this.formBuilder.group({
      // null (not '') so ng-select shows its placeholder
      addressType: [null as AddressType | null, Validators.required],
      addressValue: [{ value: '', disabled: true }, Validators.required],
    });

    group.get('addressType')?.valueChanges.subscribe((type: string | null) => {
      const valueControl = group.get('addressValue');
      const selectedType = (type || '') as AddressType;

      if (selectedType in ADDRESS_INPUTS) {
        const config = ADDRESS_INPUTS[selectedType];
        valueControl?.enable();
        valueControl?.setValidators([Validators.required, ...config.validators]);
        valueControl?.setValue('');
        valueControl?.markAsUntouched();
        valueControl?.updateValueAndValidity();
      }
    });
    return group;
  }

  addAddress() {
    this.addressContactForm.push(this.createAddressGroup());
  }

  async removeAddress(index: number, address: string) {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete contact?',
      message: `Are you sure you want to delete ${address}  This cannot be undone after save the new changes.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    this.addressContactForm.removeAt(index);
    // Refersh the UI.
    this.cdr.markForCheck();
  }

  getAddressDetail(index: number) {
    const typeControl = this.addressContactForm.at(index).get('addressType');
    const selectedType = typeControl?.value as AddressType;
    return selectedType ? ADDRESS_INPUTS[selectedType] : null;
  }

  async cancelContactForm() {
    if (this.contactForm.dirty) {
      const discardChanges = await this.confirmService.confirm({
        title: 'Discard changes?',
        message: 'You have unsaved data. Are you sure you want to leave this page?',
        confirmText: 'Leave page',
        cancelText: 'Stay',
        danger: true,
      });

      if (discardChanges) {
        this.router.navigate(['/contacts']);
      }
    } else {
      this.router.navigate(['/contacts']);
    }
  }

  getAddresses(): ContactAddress[] {
    return this.addressContactForm
      .getRawValue()
      .map((address: { addressType: AddressType; addressValue: string }) => ({
        type: address.addressType,
        value: normalizeAddressValue(address.addressType, address.addressValue ?? ''),
      }));
  }

  private buildContact(): Contact {
    const details = this.contactForm.getRawValue().contactDetailsForm;
    return {
      first_name: details.firstName ?? '',
      last_name: details.lastName ?? '',
      job_title: details.jobTitle ?? '',
      company: details.company ?? '',
      city: details.city ?? '',
      addresses: this.getAddresses(),
    };
  }

  async onSave() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsDirty();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const contact = this.buildContact();
      const id = this.contactID();
      if (id) {
        await this.contactServive.updateContact({ ...contact, id });
      } else {
        await this.contactServive.addContact(contact);
      }
      this.router.navigate(['/contacts']);
    } catch (error: any) {
      this.saveError.set(error.message ?? 'Failed to save contact.');
    } finally {
      this.saving.set(false);
    }
  }
}
