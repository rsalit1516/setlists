import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { Gig } from '../../shared/models/gig.interface';

export interface GigDialogData {
  gig?: Gig;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-gig-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ title() }}</h2>

    <mat-dialog-content>
      <form [formGroup]="gigForm" class="gig-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter gig name" />
          @if (gigForm.get('name')?.hasError('required') &&
          gigForm.get('name')?.touched) {
          <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Venue</mat-label>
          <input
            matInput
            formControlName="venue"
            placeholder="Enter venue name"
          />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Date</mat-label>
          <input
            matInput
            [matDatepicker]="gigDatePicker"
            formControlName="date"
            placeholder="Select date"
          />
          <mat-datepicker-toggle
            matIconSuffix
            [for]="gigDatePicker"
          ></mat-datepicker-toggle>
          <mat-datepicker #gigDatePicker></mat-datepicker>
          @if (gigForm.get('date')?.hasError('required') &&
          gigForm.get('date')?.touched) {
          <mat-error>Date is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea
            matInput
            formControlName="notes"
            placeholder="Enter any notes about the gig"
            rows="3"
          >
          </textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSave()"
        [disabled]="gigForm.invalid || saving()"
      >
        {{ saving() ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .gig-form {
        min-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .full-width {
        width: 100%;
      }

      mat-dialog-content {
        padding: 1rem 0;
      }

      mat-dialog-actions {
        padding: 1rem 0 0 0;
        margin: 0;
      }
    `,
  ],
})
export class GigDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<GigDialogComponent>);
  private readonly data = inject<GigDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly title = signal(
    this.data.mode === 'create' ? 'Add New Gig' : 'Edit Gig'
  );

  readonly gigForm: FormGroup = this.fb.group({
    name: [this.data.gig?.name || '', [Validators.required]],
    venue: [this.data.gig?.venue || ''],
    date: [
      this.data.gig?.date ? new Date(this.data.gig.date) : null,
      [Validators.required],
    ],
    notes: [this.data.gig?.notes || ''],
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.gigForm.valid && !this.saving()) {
      this.saving.set(true);

      const formValue = this.gigForm.value;
      const gigData: Partial<Gig> = {
        ...this.data.gig,
        name: formValue.name,
        venue: formValue.venue,
        date: formValue.date,
        notes: formValue.notes,
      };

      this.dialogRef.close(gigData);
    }
  }
}
