export type UserRole = 'admin' | 'customer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}
