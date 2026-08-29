export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'AdminPassword123!',
    name: 'E2E Admin',
  },
  landlord: {
    email: process.env.E2E_LANDLORD_EMAIL || 'landlord@test.com',
    password: process.env.E2E_LANDLORD_PASSWORD || 'TestPassword123!',
    name: 'Test Landlord',
  },
  agent: {
    email: process.env.E2E_AGENT_EMAIL || 'agent@test.com',
    password: process.env.E2E_AGENT_PASSWORD || 'TestPassword123!',
    name: 'Test Agent',
  },
  platformAdmin: {
    email: process.env.E2E_PLATFORM_ADMIN_EMAIL || 'admin@propertyledge.com.au',
    password: process.env.E2E_PLATFORM_ADMIN_PASSWORD || 'admin123',
    name: 'PropertyLedge Administrator',
  },
};

export const TEST_DATA = {
  propertyA: {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Property A - Downtown Apartment',
    address: '123 Main Street',
    suburb: 'Sydney',
    postcode: '2000',
    state: 'NSW',
  },
  propertyB: {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Property B - Suburban House',
    address: '456 Oak Avenue',
    suburb: 'Melbourne',
    postcode: '3000',
    state: 'VIC',
  },
  workspace: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Test Property Management',
  },
};
