import { Express } from 'express';
import adminRouter, { initializeAdminRoutes } from './routes';

export * from './database';
export * from './auth';
export { default as adminRouter } from './routes';

export async function mountAdminRoutes(app: Express): Promise<void> {
  console.log('🔧 [Admin] Mounting admin routes on /admin...');
  
  try {
    await initializeAdminRoutes();
    
    app.use('/admin', adminRouter);
    
    console.log('✅ [Admin] Admin routes mounted successfully');
    console.log('📍 [Admin] Available endpoints:');
    console.log('   POST   /admin/login');
    console.log('   POST   /admin/refresh');
    console.log('   GET    /admin/me');
    console.log('   GET    /admin/stats');
    console.log('   GET    /admin/users');
    console.log('   GET    /admin/users/:id');
    console.log('   PUT    /admin/users/:id/subscription');
    console.log('   PUT    /admin/users/:id/free-searches');
    console.log('   GET    /admin/subscriptions');
    console.log('   GET    /admin/referrals');
    console.log('   GET    /admin/settings');
    console.log('   PUT    /admin/settings');
    console.log('   GET    /admin/search-history');
  } catch (error) {
    console.error('❌ [Admin] Failed to mount admin routes:', error);
    throw error;
  }
}

export async function createDefaultAdmin(
  username: string = 'admin',
  password: string = 'admin123'
): Promise<void> {
  const { createAdmin, getAdminByUsername } = await import('./database');
  
  console.log('🔧 [Admin] Checking for default admin user...');
  
  const existing = await getAdminByUsername(username);
  
  if (existing) {
    console.log(`✅ [Admin] Admin user '${username}' already exists`);
    return;
  }
  
  const result = await createAdmin(username, password, 'superadmin');
  
  if (result.success) {
    console.log(`✅ [Admin] Default admin created: ${username}`);
    console.log(`⚠️  [Admin] IMPORTANT: Change the default password immediately!`);
  } else {
    console.error(`❌ [Admin] Failed to create default admin: ${result.error}`);
  }
}
