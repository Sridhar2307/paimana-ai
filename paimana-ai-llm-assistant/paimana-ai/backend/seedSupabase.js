import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function upsertWithRetry(batch, batchNum, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Batch request timed out after 10s')), 10000)
      );
      const queryPromise = supabase.from('projects').upsert(batch, { onConflict: 'project_id' });

      const { error } = await Promise.race([queryPromise, timeoutPromise]);
      if (!error) return true;

      console.error(`\n⚠️ Batch ${batchNum} attempt ${attempt} failed:`, error.message);
      if (error.message.includes('Could not find the table')) {
        console.error('Please run supabase_schema.sql in your Supabase SQL Editor first.');
        return false;
      }
    } catch (err) {
      console.error(`\n⚠️ Batch ${batchNum} attempt ${attempt} network error:`, err.message);
    }

    if (attempt < maxRetries) {
      const delay = attempt * 1500;
      console.log(`⏳ Retrying batch ${batchNum} in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
  return false;
}

async function seed() {
  console.log('🔄 Loading demo projects from projects_demo.json...');
  const jsonPath = path.join(__dirname, 'app', 'data', 'projects_demo.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Could not find demo data file at: ${jsonPath}`);
    return;
  }
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const projects = JSON.parse(rawData);

  console.log(`📊 Found ${projects.length} projects. Preparing batch upsert to Supabase...`);

  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < projects.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = projects.slice(i, i + batchSize).map((p) => ({
      project_id: p.project_id,
      project_name: p.project_name,
      ministry: p.ministry,
      sector: p.sector,
      implementing_agency: p.implementing_agency,
      region: p.region,
      original_cost: p.original_cost,
      revised_cost: p.revised_cost,
      cost_variance: p.cost_variance || 0,
      cost_variance_pct: p.cost_variance_pct || 0,
      expenditure: p.expenditure,
      expenditure_ratio: p.expenditure_ratio || 0,
      planned_progress: p.planned_progress,
      actual_progress: p.actual_progress,
      progress_gap: p.progress_gap || 0,
      planned_start_date: p.planned_start_date,
      planned_completion_date: p.planned_completion_date,
      expected_completion_date: p.expected_completion_date,
      planned_duration_months: p.planned_duration_months || 0,
      schedule_delay_months: p.schedule_delay_months || 0,
      milestone_count: p.milestone_count || 10,
      milestones_completed: p.milestones_completed || 0,
      milestone_delays: p.milestone_delays || 0,
      milestone_delay_ratio: p.milestone_delay_ratio || 0,
      status: p.status || 'In Progress',
      reason_for_delay: p.reason_for_delay || null,
      candidate_variables: p.candidate_variables || {},
      history: p.history || [],
    }));

    const success = await upsertWithRetry(batch, batchNum);
    if (success) {
      inserted += batch.length;
      process.stdout.write(`✅ Inserted ${inserted}/${projects.length} projects...\r`);
    } else {
      console.error(`❌ Batch ${batchNum} could not be inserted after retries.`);
      console.log('Skipping further batches if connection is down.');
      break;
    }
  }

  console.log(`\n🎉 Seeding finished! Total synced: ${inserted}/${projects.length} projects.`);
}

seed().catch((err) => {
  console.error('Fatal error during seeding:', err);
});
