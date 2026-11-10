export interface Announcement {
  id: number;
  title: string;
  message: string;
  image_url: string | null;
  is_urgent: boolean;
  expires_on: string | null;
  created_at: string;
  is_published?: boolean;
  author_name?: string;
  can_manage?: boolean;
}
