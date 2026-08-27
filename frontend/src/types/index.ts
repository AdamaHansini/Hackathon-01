export type Role = 'USER' | 'MODERATOR' | 'ADMIN';

export type User = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  city?: string;
  role: Role;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  trustScore: number;
  successfulReturnsCount: number;
  recoveredItemsCount: number;
  reportsAgainstCount: number;
  notificationPreferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    matchAlerts: boolean;
  };
  createdAt: string;
};

export type ItemPostStatus = 'ACTIVE' | 'MATCHED' | 'CLAIMED' | 'VERIFIED' | 'RETURNED' | 'EXPIRED' | 'CANCELLED' | 'REMOVED' | 'DISPUTED';

export type ItemPost = {
  _id: string;
  userId: string | User;
  type: 'LOST' | 'FOUND';
  itemName: string;
  category: string;
  publicDescription: string;
  color?: string;
  brand?: string;
  images: { url: string; publicId: string }[];
  publicCharacteristics: string[];
  lostOrFoundDate: string;
  lostOrFoundTime: string;
  locationName: string;
  city: string;
  approximateCoordinates: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    radiusMeters: number;
  };
  status: ItemPostStatus;
  visibility: 'PUBLIC' | 'HIDDEN' | 'PRIVATE';
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  expiresAt: string;
  renewedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiResponse<T = any> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
};

export type PaginatedData<T> = {
  items?: T[]; // Sometimes endpoints might name the array differently, we need to adapt per endpoint
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
