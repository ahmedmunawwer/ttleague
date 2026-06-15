'use strict';

const supabase = require('../supabase');
const { isValidUuid, validateName } = require('../validate');

function registerPresetHandlers(io, socket) {

  socket.on('list_presets', async (cb) => {
    try {
      const { data, error } = await supabase
        .from('presets')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[list_presets]', error);
        return cb({ ok: false, error: 'Failed to list presets' });
      }

      cb({ ok: true, presets: data });
    } catch (err) {
      console.error('[list_presets]', err);
      cb({ ok: false, error: 'Failed to list presets' });
    }
  });

  socket.on('add_preset', async (name, cb) => {
    try {
      const nameResult = validateName(name, 1, 20);
      if (!nameResult.ok) return cb({ ok: false, error: nameResult.error });

      const { data, error } = await supabase
        .from('presets')
        .insert({ name: nameResult.value })
        .select()
        .single();

      if (error) {
        console.error('[add_preset]', error);
        if (error.code === '23505') return cb({ ok: false, error: 'A preset with that name already exists' });
        return cb({ ok: false, error: 'Failed to add preset' });
      }

      io.emit('presets_changed');
      cb({ ok: true, preset: data });
    } catch (err) {
      console.error('[add_preset]', err);
      cb({ ok: false, error: 'Failed to add preset' });
    }
  });

  socket.on('remove_preset', async (id, cb) => {
    try {
      if (!isValidUuid(id)) return cb({ ok: false, error: 'Invalid ID format' });

      const { data, error } = await supabase
        .from('presets')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('[remove_preset]', error);
        return cb({ ok: false, error: 'Failed to remove preset' });
      }

      if (!data || data.length === 0) {
        return cb({ ok: false, error: 'Preset not found' });
      }

      io.emit('presets_changed');
      cb({ ok: true });
    } catch (err) {
      console.error('[remove_preset]', err);
      cb({ ok: false, error: 'Failed to remove preset' });
    }
  });

}

module.exports = registerPresetHandlers;
