import { Injectable, signal, computed } from '@angular/core';
import { BaseApiService } from './base-api.service';
import {
  Gig,
  CreateGig,
  UpdateGig,
  ApiResponse,
  PaginatedResult,
} from '../models';
import { firstValueFrom } from 'rxjs';

/**
 * Service for managing gigs with signal-based state management
 */
@Injectable({
  providedIn: 'root',
})
export class GigService extends BaseApiService {
  // Private signals for state management
  private readonly _gigs = signal<Gig[]>([]);
  private readonly _upcomingGigs = signal<Gig[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _pagination = signal<{
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });

  // Public readonly signals
  readonly gigs = this._gigs.asReadonly();
  readonly upcomingGigs = this._upcomingGigs.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly hasNextPage = computed(
    () => this._pagination().page < this._pagination().totalPages
  );

  readonly hasPreviousPage = computed(() => this._pagination().page > 1);

  readonly pastGigs = computed(() => {
    const now = new Date().toISOString();
    return this._gigs().filter((gig) => gig.date < now);
  });

  readonly futureGigs = computed(() => {
    const now = new Date().toISOString();
    return this._gigs().filter((gig) => gig.date >= now);
  });

  /**
   * Load gigs with optional pagination
   */
  async loadGigs(page: number = 1, pageSize: number = 20): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const params = this.buildParams({ page, pageSize });
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PaginatedResult<Gig>>>(
          `${this.baseUrl}/gigs`,
          { params }
        )
      );

      if (response.isSuccess && response.data) {
        this._gigs.set(response.data.items);
        this._pagination.set({
          totalCount: response.data.totalCount,
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages,
        });
      } else {
        this._error.set(response.errorMessage || 'Failed to load gigs');
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Load upcoming gigs
   */
  async loadUpcomingGigs(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Gig[]>>(`${this.baseUrl}/gigs/upcoming`)
      );

      if (response.isSuccess && response.data) {
        this._upcomingGigs.set(response.data);
      } else {
        this._error.set(
          response.errorMessage || 'Failed to load upcoming gigs'
        );
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get a gig by ID
   */
  async getGigById(id: number): Promise<Gig | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Gig>>(`${this.baseUrl}/gigs/${id}`)
      );

      if (response.isSuccess && response.data) {
        return response.data;
      }

      this._error.set(response.errorMessage || 'Gig not found');
      return null;
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return null;
    }
  }

  /**
   * Create a new gig
   */
  async createGig(gig: CreateGig): Promise<Gig | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<Gig>>(`${this.baseUrl}/gigs`, gig)
      );

      if (response.isSuccess && response.data) {
        // Add to current gigs list
        this._gigs.update((gigs) => [...gigs, response.data!]);

        // If it's upcoming, add to upcoming gigs as well
        const now = new Date().toISOString();
        if (response.data.date >= now) {
          this._upcomingGigs.update((upcoming) => [
            ...upcoming,
            response.data!,
          ]);
        }

        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to create gig');
        return null;
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update an existing gig
   */
  async updateGig(id: number, gig: UpdateGig): Promise<Gig | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<Gig>>(`${this.baseUrl}/gigs/${id}`, gig)
      );

      if (response.isSuccess && response.data) {
        // Update in current gigs list
        this._gigs.update((gigs) =>
          gigs.map((g) => (g.id === id ? response.data! : g))
        );

        // Update in upcoming gigs if present
        this._upcomingGigs.update((upcoming) =>
          upcoming.map((g) => (g.id === id ? response.data! : g))
        );

        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to update gig');
        return null;
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Delete a gig
   */
  async deleteGig(id: number): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/gigs/${id}`)
      );

      if (response.isSuccess) {
        // Remove from current gigs list
        this._gigs.update((gigs) => gigs.filter((g) => g.id !== id));

        // Remove from upcoming gigs if present
        this._upcomingGigs.update((upcoming) =>
          upcoming.filter((g) => g.id !== id)
        );

        return true;
      } else {
        this._error.set(response.errorMessage || 'Failed to delete gig');
        return false;
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh the current gigs list
   */
  async refresh(): Promise<void> {
    const currentPagination = this._pagination();
    await this.loadGigs(currentPagination.page, currentPagination.pageSize);
  }

  /**
   * Refresh upcoming gigs
   */
  async refreshUpcoming(): Promise<void> {
    await this.loadUpcomingGigs();
  }
}
