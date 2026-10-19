import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/users/user.service';

// Form-level validator: password and confirm_password must match
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm_password')?.value;
  return password === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export default class Register {
  saveError = signal<string | null>(null);
  isSubmitting = signal(false);
  requestSent = signal(false);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private formBuilder = inject(FormBuilder);

  regesterForm = this.formBuilder.group(
    {
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: [
        '',
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [this.emailAlreadyExist()],
        },
      ],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  async onSubmit() {
    if (this.regesterForm.invalid) {
      // Show the errors on every field the user skipped
      this.regesterForm.markAllAsTouched();
      this.regesterForm.markAllAsDirty();
      return;
    }
    const email = this.regesterForm.controls.email.value!;
    const pw = this.regesterForm.controls.password.value!;
    const fullName =
      this.regesterForm.controls.first_name.value! +
      ' ' +
      this.regesterForm.controls.last_name.value!;

    this.isSubmitting.set(true);
    this.saveError.set(null);

    try {
      await this.authService.register(email, pw, fullName);
      this.requestSent.set(true);
    } catch (error: any) {
      this.saveError.set(error.message ?? error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  showError(control: AbstractControl): boolean {
    return control.invalid && control.dirty && control.touched;
  }

  get confirmPasswordIsInvalid() {
    const control = this.regesterForm.controls.confirm_password;
    return (
      control.touched &&
      control.dirty &&
      (control.invalid || this.regesterForm.hasError('passwordsMismatch'))
    );
  }
  private emailAlreadyExist(): AsyncValidatorFn {
    return async (control) => {
      if (!control.value) return null;

      const isUsed = await this.userService.checkEmailExists(control.value);
      return isUsed ? { emailAlreadyExists: true } : null;
    };
  }
}
