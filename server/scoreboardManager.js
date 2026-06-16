'use strict';

const supabase = require('./supabase');

async function writeEntry(id, leagueData) {
  const now = new Date().toISOString();

  const { data: existing, error: fetchErr } = await supabase
    .from('scoreboard')
    .select('data')
    .eq('id', id)
    .single();

  if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

  const createdAt = existing?.data?.createdAt || now;
  const entryData = {
    name: leagueData.name,
    createdAt,
    lastUpdatedAt: now,
    completionStatus: leagueData.status,
    config: leagueData.config,
    state: leagueData.state,
  };

  if (existing) {
    const { error } = await supabase
      .from('scoreboard')
      .update({ data: entryData, updated_at: now })
      .eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('scoreboard')
      .insert({ id, data: entryData });
    if (error) throw error;
  }
}

async function markTerminated(id) {
  const { data: existing, error: fetchErr } = await supabase
    .from('scoreboard')
    .select('data')
    .eq('id', id)
    .single();

  if (fetchErr) {
    if (fetchErr.code === 'PGRST116') return;
    throw fetchErr;
  }

  if (existing.data.completionStatus !== 'in_progress') return;

  const now = new Date().toISOString();
  const updated = {
    ...existing.data,
    completionStatus: 'terminated',
    lastUpdatedAt: now,
  };

  const { error } = await supabase
    .from('scoreboard')
    .update({ data: updated, updated_at: now })
    .eq('id', id);

  if (error) throw error;
}

async function listEntries(filter) {
  let query = supabase
    .from('scoreboard')
    .select('id, data')
    .order('updated_at', { ascending: false });

  if (filter?.status) {
    query = query.filter('data->>completionStatus', 'eq', filter.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(row => ({ id: row.id, ...row.data }));
}

async function deleteEntry(id) {
  const { error } = await supabase
    .from('scoreboard')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

module.exports = { writeEntry, markTerminated, listEntries, deleteEntry };
