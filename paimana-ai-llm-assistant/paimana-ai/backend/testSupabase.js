import supabase from './supabaseClient.js';

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out after 5 seconds')), 5000)
    );

    const queryPromise = supabase.from('projects').select('*').limit(1);

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) {
      console.log('⚠️ Supabase response error:', error.message);
    } else {
      console.log('✅ Connection successful. Sample data retrieved:', data);
    }
  } catch (err) {
    console.log('⚠️ Error connecting to Supabase:', err.message);
    console.log('ℹ️ Note: If cloud Supabase is unreachable, PAIMANA-AI operates in standalone mode using the local FastAPI backend and calibrated dataset.');
  }
}

testConnection();