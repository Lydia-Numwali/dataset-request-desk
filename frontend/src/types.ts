export type Role = 'client' | 'operator' | 'admin';

export interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
  organisation?: string;
  is_active: boolean;
  created_at: string;
}

export interface Episode {
  episode_id: string;
  robot_id: string;
  task_name: string;
  recorded_at: string;
  duration_seconds: number;
  operator_name: string;
  quality: 'good' | 'usable' | 'bad';
  created_at: string;
  is_assigned?: boolean;
  assigned_request_id?: string;
}

export interface ExportJob {
  id: string;
  assignment_id: string;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  request_id: string;
  episode_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
  export_status: 'pending' | 'processing' | 'completed' | 'failed';
  episode?: Episode;
}

export interface StatusHistory {
  id: string;
  from_status?: string;
  to_status: string;
  changed_by_user_id: string;
  changed_by_name?: string;
  changed_at: string;
}

export type RequestStatus = 'submitted' | 'in_progress' | 'delivered' | 'accepted' | 'rejected';

export interface RequestItem {
  id: string;
  client_id: string;
  task_name: string;
  episodes_requested: number;
  deadline: string;
  notes?: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  client?: User;
  assignments: Assignment[];
  history: StatusHistory[];
}

export interface SkipReason {
  row_number: number;
  episode_id?: string;
  reason: string;
}

export interface ImportReport {
  total_rows_processed: number;
  imported_count: number;
  skipped_count: number;
  duplicate_count: number;
  skip_reasons: SkipReason[];
}

export interface DailyRobotEpisodeCount {
  record_date: string;
  robot_id: string;
  episode_count: number;
}

export interface RequestStatusCount {
  status: string;
  count: number;
}

export interface RequestFulfilmentMetrics {
  status_counts: RequestStatusCount[];
  median_time_to_delivery_seconds?: number;
  median_time_to_delivery_hours?: number;
}

export interface TopTaskCount {
  task_name: string;
  good_episodes_count: number;
}

export interface AnalyticsData {
  episodes_per_day_per_robot: DailyRobotEpisodeCount[];
  request_fulfilment: RequestFulfilmentMetrics;
  top_5_tasks_by_good_episodes: TopTaskCount[];
}
