import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import {
  Song,
  CreateSong,
  UpdateSong,
  ReadinessStatus,
} from '../../shared/models';

@Component({
  selector: 'app-song-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  template: `
    <form [formGroup]="songForm" (ngSubmit)="onSubmit()">
      <h2 mat-dialog-title>{{ data ? 'Edit Song' : 'Add New Song' }}</h2>

      <mat-dialog-content class="dialog-content">
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Song Name</mat-label>
            <input
              matInput
              formControlName="name"
              placeholder="Enter song name"
              maxlength="200"
            />
            @if (songForm.get('name')?.hasError('required') &&
            songForm.get('name')?.touched) {
            <mat-error>Song name is required</mat-error>
            } @if (songForm.get('name')?.hasError('maxlength')) {
            <mat-error>Song name cannot exceed 200 characters</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Artist</mat-label>
            <input
              matInput
              formControlName="artist"
              placeholder="Enter artist name"
              maxlength="100"
            />
            @if (songForm.get('artist')?.hasError('required') &&
            songForm.get('artist')?.touched) {
            <mat-error>Artist is required</mat-error>
            } @if (songForm.get('artist')?.hasError('maxlength')) {
            <mat-error>Artist name cannot exceed 100 characters</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Duration (seconds)</mat-label>
            <input
              matInput
              type="number"
              formControlName="durationSeconds"
              placeholder="Duration in seconds"
              min="1"
              max="3600"
            />
            @if (songForm.get('durationSeconds')?.hasError('required') &&
            songForm.get('durationSeconds')?.touched) {
            <mat-error>Duration is required</mat-error>
            } @if (songForm.get('durationSeconds')?.hasError('min')) {
            <mat-error>Duration must be at least 1 second</mat-error>
            } @if (songForm.get('durationSeconds')?.hasError('max')) {
            <mat-error>Duration cannot exceed 3600 seconds (1 hour)</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Readiness Status</mat-label>
            <mat-select formControlName="readinessStatus">
              <mat-option [value]="ReadinessStatus.Ready">Ready</mat-option>
              <mat-option [value]="ReadinessStatus.InProgress"
                >In Progress</mat-option
              >
              <mat-option [value]="ReadinessStatus.WishList"
                >Wish List</mat-option
              >
            </mat-select>
            @if (songForm.get('readinessStatus')?.hasError('required') &&
            songForm.get('readinessStatus')?.touched) {
            <mat-error>Readiness status is required</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Genre</mat-label>
            <input
              matInput
              formControlName="genre"
              placeholder="Enter genre (optional)"
              maxlength="50"
            />
            @if (songForm.get('genre')?.hasError('maxlength')) {
            <mat-error>Genre cannot exceed 50 characters</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notes</mat-label>
            <textarea
              matInput
              formControlName="notes"
              placeholder="Additional notes (optional)"
              rows="3"
              maxlength="1000"
            ></textarea>
            @if (songForm.get('notes')?.hasError('maxlength')) {
            <mat-error>Notes cannot exceed 1000 characters</mat-error>
            }
          </mat-form-field>
        </div>

        <div
          class="duration-helper"
          *ngIf="songForm.get('durationSeconds')?.value"
        >
          <small
            >Duration:
            {{
              formatDurationDisplay(songForm.get('durationSeconds')?.value)
            }}</small
          >
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="songForm.invalid"
        >
          {{ data ? 'Update' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .dialog-content {
        min-width: 400px;
        max-width: 600px;
      }

      .form-row {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .full-width {
        width: 100%;
      }

      .half-width {
        width: calc(50% - 0.5rem);
      }

      .duration-helper {
        margin-top: -0.5rem;
        margin-bottom: 1rem;
        color: #666;
      }

      mat-dialog-content {
        overflow-x: hidden;
      }

      mat-dialog-actions {
        padding: 1rem 0;
      }

      @media (max-width: 600px) {
        .dialog-content {
          min-width: 300px;
        }

        .form-row {
          flex-direction: column;
        }

        .half-width {
          width: 100%;
        }
      }
    `,
  ],
})
export class SongDialogComponent implements OnInit {
  songForm: FormGroup;
  ReadinessStatus = ReadinessStatus;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SongDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Song | null
  ) {
    this.songForm = this.createForm();
  }

  ngOnInit() {
    if (this.data) {
      this.songForm.patchValue({
        name: this.data.name,
        artist: this.data.artist,
        durationSeconds: this.data.durationSeconds,
        readinessStatus: this.data.readinessStatus,
        genre: this.data.genre || '',
        notes: this.data.notes || '',
      });
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      artist: ['', [Validators.required, Validators.maxLength(100)]],
      durationSeconds: [
        null,
        [Validators.required, Validators.min(1), Validators.max(3600)],
      ],
      readinessStatus: [ReadinessStatus.WishList, [Validators.required]],
      genre: ['', [Validators.maxLength(50)]],
      notes: ['', [Validators.maxLength(1000)]],
    });
  }

  formatDurationDisplay(seconds: number): string {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onSubmit() {
    if (this.songForm.valid) {
      const formValue = this.songForm.value;

      const songData: CreateSong | UpdateSong = {
        name: formValue.name.trim(),
        artist: formValue.artist.trim(),
        durationSeconds: formValue.durationSeconds,
        readinessStatus: formValue.readinessStatus,
        genre: formValue.genre?.trim() || undefined,
        notes: formValue.notes?.trim() || undefined,
      };

      this.dialogRef.close(songData);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
