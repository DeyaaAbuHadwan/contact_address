import { Component, inject, input, OnInit, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export default class Login implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  saveError = signal<string | null>(null);
  returnUrl = '/login';
  emailValue = '';
  passwordValue = '';

  form = new FormGroup({
    email: new FormControl(this.emailValue, {
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl(this.passwordValue, [Validators.required, Validators.minLength(6)]),
  });

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/contacts';
  }

  async onSubmit() {
    if (this.form.valid) {
      const emailValue = this.form.value.email ?? '';
      const passwordValue = this.form.value.password ?? '';

      try {
        await this.authService.login(emailValue, passwordValue, this.returnUrl);
      } catch (error: any) {
        this.saveError.set(error);
      }
    } else {
      console.log('Form is invalid');
    }
  }

  get emailIsInvalid() {
    const emailControl = this.form.get('email');
    return emailControl?.invalid && emailControl?.touched && emailControl?.dirty;
  }

  get passwordIsInvalid() {
    const passwordControl = this.form.get('password');
    return passwordControl?.invalid && passwordControl?.touched && passwordControl?.dirty;
  }
}
