export interface UserProfile {
  id: string; // matches auth UID or custom guest session
  name: string;
  email: string;
  phone?: string;
  points: number;
  ordersCount: number;
  joined: string;
  role: 'admin' | 'user';
}

export interface Order {
  id: string;
  userId?: string; // empty for guest
  name: string;
  email?: string;
  userType: 'Hosteller' | 'Day Scholar';
  hostel?: string;
  pickup?: string;
  delivery?: string;
  service: string;
  manualType?: string;
  handwriting: 'Printed' | 'Cursive';
  qty: string; // e.g., "10 Pages" or "Full Manual"
  qtyValue: number;
  content: 'Upload' | 'AI Content';
  deliveryDate: string;
  urgent: boolean;
  basePrice: number;
  urgentFee: number;
  discount: number;
  total: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Rejected';
  createdAt: string;
  images?: string[]; // base64 compressed dataUrls
  notes?: string;
}

export interface Review {
  id: string;
  name: string;
  userId?: string;
  stars: number;
  text: string;
  received: boolean;
  date: string;
  imageUrl?: string;
}

export interface Hostel {
  id: string;
  name: string;
  receiver: string;
  ordersCount: number;
  revenue: number;
}

export interface SystemNotification {
  id: string;
  title: string;
  desc: string;
  type: 'order' | 'review' | 'user' | 'system' | 'announcement';
  createdAt: string;
  read: boolean;
  userId?: string; // empty means admin/all
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  features: string[];
}
