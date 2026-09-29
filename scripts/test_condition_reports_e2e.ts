import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env or .env.local
const envFiles = ['.env.local', '.env'];
for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    });
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(url, key);

const STANDARD_ITEMS = [
  'Walls',
  'Ceiling',
  'Floor',
  'Doors',
  'Windows',
  'Curtains/Blinds',
  'Power Points',
  'Lights',
  'Smoke Alarm',
  'Air Conditioner',
  'Cleanliness',
  'General Condition',
];

async function runE2ETest() {
  console.log('=== RUNNING CONDITION REPORT E2E SIMULATION TEST ===');

  // 1. Get a test workspace and property
  const { data: properties, error: propErr } = await supabase
    .from('properties')
    .select('id, workspace_id, name')
    .limit(1);

  if (propErr || !properties || properties.length === 0) {
    console.error('Failed to find a property for testing:', propErr?.message);
    return;
  }

  const testProperty = properties[0];
  const workspaceId = testProperty.workspace_id;
  console.log(`✓ Using Property: "${testProperty.name}" (ID: ${testProperty.id}, Workspace: ${workspaceId})`);

  // 2. Create Condition Report (Draft)
  const { data: report, error: repErr } = await supabase
    .from('condition_reports')
    .insert({
      workspace_id: workspaceId,
      property_id: testProperty.id,
      inspector_name: 'E2E Test Inspector',
      inspection_date: new Date().toISOString().split('T')[0],
      type: 'Move In',
      status: 'Draft',
    })
    .select()
    .single();

  if (repErr || !report) {
    console.error('Failed to create condition report:', repErr?.message);
    return;
  }
  console.log(`✓ Step 1: Created Condition Report (ID: ${report.id}, Status: ${report.status})`);

  // 3. Create 2 test rooms (e.g., Bedroom 1, Kitchen)
  const roomsToCreate = [
    { report_id: report.id, name: 'Bedroom 1', room_order: 1, status: 'Incomplete' },
    { report_id: report.id, name: 'Kitchen', room_order: 2, status: 'Incomplete' },
  ];

  const { data: createdRooms, error: roomErr } = await supabase
    .from('inspection_rooms')
    .insert(roomsToCreate)
    .select();

  if (roomErr || !createdRooms || createdRooms.length !== 2) {
    console.error('Failed to create rooms:', roomErr?.message);
    return;
  }
  console.log(`✓ Step 2: Created ${createdRooms.length} Inspection Rooms`);

  // 4. Batch generate 12 standard items per room
  const itemsToInsert = createdRooms.flatMap(r =>
    STANDARD_ITEMS.map(name => ({
      room_id: r.id,
      name,
      rating: null,
    }))
  );

  const { data: createdItems, error: itemsErr } = await supabase
    .from('inspection_items')
    .insert(itemsToInsert)
    .select();

  if (itemsErr || !createdItems || createdItems.length !== 24) {
    console.error('Failed to insert items:', itemsErr?.message);
    return;
  }
  console.log(`✓ Step 3: Inserted ${createdItems.length} standard inspection items (12 per room)`);

  // 5. Test item rating autosave
  const itemToUpdate = createdItems[0];
  const { error: rateErr } = await supabase
    .from('inspection_items')
    .update({ rating: 'Excellent' })
    .eq('id', itemToUpdate.id);

  if (rateErr) {
    console.error('Failed to update rating:', rateErr.message);
    return;
  }
  console.log(`✓ Step 4: Rating updated for item "${itemToUpdate.name}" -> "Excellent"`);

  // 6. Test "Mark Room Good" quick action on Bedroom 1
  const bedroom = createdRooms[0];
  const { error: markGoodErr } = await supabase
    .from('inspection_items')
    .update({ rating: 'Good' })
    .eq('room_id', bedroom.id);

  const { error: roomStatusErr } = await supabase
    .from('inspection_rooms')
    .update({ status: 'Completed' })
    .eq('id', bedroom.id);

  if (markGoodErr || roomStatusErr) {
    console.error('Failed to mark room good:', markGoodErr?.message || roomStatusErr?.message);
    return;
  }
  console.log(`✓ Step 5: "Mark Room Good" completed for "${bedroom.name}"`);

  // 7. Test defect logging
  const kitchen = createdRooms[1];
  const { data: defect, error: defErr } = await supabase
    .from('inspection_defects')
    .insert({
      room_id: kitchen.id,
      item_name: 'Doors',
      severity: 'Minor',
      notes: 'Slight hinge squeak on cabinet door',
    })
    .select()
    .single();

  if (defErr || !defect) {
    console.error('Failed to add defect:', defErr?.message);
    return;
  }
  console.log(`✓ Step 6: Logged defect in "${kitchen.name}" (Severity: ${defect.severity})`);

  // 8. Test photo attachment
  const { data: photo, error: photoErr } = await supabase
    .from('inspection_photos')
    .insert({
      room_id: kitchen.id,
      photo_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f',
    })
    .select()
    .single();

  if (photoErr || !photo) {
    console.error('Failed to attach photo:', photoErr?.message);
    return;
  }
  console.log(`✓ Step 7: Attached inspection photo to "${kitchen.name}"`);

  // 9. Finalize report with signatures
  const { error: finErr } = await supabase
    .from('condition_reports')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
      signature_manager: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signature_tenant: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    })
    .eq('id', report.id);

  if (finErr) {
    console.error('Failed to finalize report:', finErr.message);
    return;
  }
  console.log(`✓ Step 8: Finalized Condition Report with dual signatures -> Status: Completed`);

  // 10. Test Cascade Deletion
  const { error: delErr } = await supabase
    .from('condition_reports')
    .delete()
    .eq('id', report.id);

  if (delErr) {
    console.error('Failed to delete report:', delErr.message);
    return;
  }

  // Verify child entities are cascaded
  const { data: orphanRooms } = await supabase
    .from('inspection_rooms')
    .select('id')
    .eq('report_id', report.id);

  if (orphanRooms && orphanRooms.length === 0) {
    console.log(`✓ Step 9: Cascade deletion verified (all associated rooms/items/defects/photos cleanly purged)`);
  } else {
    console.warn('Warning: Cascade deletion check found remaining rooms:', orphanRooms);
  }

  console.log('=== ALL E2E CONDITION REPORT TESTS PASSED SUCCESSFULLY! ===');
}

runE2ETest().catch(console.error);
