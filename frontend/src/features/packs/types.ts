export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface PackSummary {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  is_active: boolean;
  course_count: number;
  item_count: number;
}

export interface PackItemPreview {
  id: number;
  course_id: number;
  course_name: string;
  item_type: string;
  title: string;
  created_at: string;
  attached_at: string | null;
  grade: string | null;
  subject: string | null;
}

export interface CourseSearchResult {
  id: number;
  name: string;
  subject: string | null;
  grade: string | null;
  client_id: number | null;
  content_item_count: number;
  created_at: string;
}

export interface CourseContentPreviewItem {
  id: number;
  course_id: number;
  parent_id: number | null;
  item_type: string;
  title: string;
  content_url: string | null;
  order_index: number;
  created_at: string;
  course_name: string;
  grade: string | null;
  subject: string | null;
}

export interface PackSummaryGroupItem {
  id: number;
  parent_id: number | null;
  title: string;
  item_type: string;
  order_index: number;
}

export interface PackSummaryGroup {
  course_id: number;
  course_name: string;
  grade: string | null;
  subject: string | null;
  item_count: number;
  items: PackSummaryGroupItem[];
}

export interface PackCompositionSummary {
  pack_id: number;
  total_items: number;
  groups: PackSummaryGroup[];
}

export interface AddPackItemsResponse {
  added_item_ids: number[];
  skipped_item_ids: number[];
  item_count: number;
}

export interface CreateCourseResponse {
  course_id: number;
}

export interface CreatePackResponse {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  is_active: boolean;
  item_count: number;
  course_count: number;
}

export interface RemovePackItemResponse {
  removed: boolean;
  item_count: number;
}

export interface EditablePackFormValues {
  name: string;
  description: string;
}

export interface EditableCourseFormValues {
  name: string;
  grade: string;
  subject: string;
}

export interface ClientOption {
  id: number;
  name: string;
}

export interface PackEntitlementFormValues {
  client_id: string;
  pack_id: number;
  start_at: string;
  end_at: string;
  status: string;
}
