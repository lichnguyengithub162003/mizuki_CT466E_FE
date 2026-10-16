import type { AppRole } from '@/types/auth'

export interface ProfileBranch {
  readonly id: number
  readonly code: string
  readonly name: string
}

export interface ProfileAssignment {
  readonly id: number
  readonly branch: ProfileBranch | null
  readonly role: Exclude<AppRole, 'customer'>
  readonly role_label: string
  readonly job_title: string | null
  readonly work_area: string | null
  readonly effective_from: string | null
  readonly effective_to: string | null
}

interface ProfileBase {
  readonly id: number
  readonly name: string
  readonly email: string
  readonly phone: string | null
  readonly avatar: string | null
  readonly avatar_rendition_url: string | null
  readonly role_label: string
  readonly created_at: string | null
}

export interface CustomerProfile extends ProfileBase {
  readonly role: 'customer'
}

export interface StaffProfile extends ProfileBase {
  readonly role: Exclude<AppRole, 'customer'>
  readonly staff_code: string | null
  readonly branch_id: number | null
  readonly branch: ProfileBranch | null
  readonly job_title: string | null
  readonly work_area: string | null
  readonly employment_status: 'working' | 'left' | null
  readonly employment_status_label: string | null
  readonly current_assignment: ProfileAssignment | null
}

export type Profile = CustomerProfile | StaffProfile

export interface ProfileUpdatePayload {
  readonly name: string
  readonly phone: string | null
}

export interface AvatarUploadResult {
  readonly upload_token: string
  readonly preview_url: string
  readonly preview_expires_at: string
  readonly expires_at: string
  readonly mime_type: string
  readonly bytes: number
  readonly width: number | null
  readonly height: number | null
}

export interface PasswordChangePayload {
  readonly current_password: string
  readonly password: string
  readonly password_confirmation: string
}
