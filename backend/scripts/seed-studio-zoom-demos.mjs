import 'dotenv/config';
import pool from '../config/db.js';

const owner = { clientId: 17, subtopicId: 1, userId: 187 };
const demos = [
  {
    marker: '[SPECTROPY_ZOOM_DEMO_SCREEN]',
    title: 'DEMO – Screen Zoom Guided Tour',
    screens: [
      { title: 'Screen Zoom Hub', elements: [
        { key: 'heading', type: 'title', text: 'Choose a destination', x: 160, y: 80, width: 1600, height: 130 },
        { key: 'zoom-concept', type: 'zoom', text: 'Open Concept Explanation', x: 220, y: 300, width: 650, height: 340, target: 1 },
        { key: 'zoom-example', type: 'zoom', text: 'Open Classroom Example', x: 1050, y: 300, width: 650, height: 340, target: 2 },
      ] },
      { title: 'Concept Explanation', elements: [
        { key: 'heading', type: 'title', text: 'Reflection of light', x: 150, y: 80, width: 1620, height: 130 },
        { key: 'idea-1', type: 'text', text: '1. Light strikes a reflecting surface.', x: 220, y: 300, width: 1450, height: 150, animation: 'fade' },
        { key: 'idea-2', type: 'text', text: '2. The angle of incidence equals the angle of reflection.', x: 220, y: 520, width: 1450, height: 180, animation: 'fly-in' },
      ] },
      { title: 'Classroom Example', elements: [
        { key: 'heading', type: 'title', text: 'Mirror demonstration', x: 150, y: 80, width: 1620, height: 130 },
        { key: 'step-1', type: 'text', text: 'Shine a ray toward the mirror.', x: 220, y: 300, width: 1450, height: 150, animation: 'appear' },
        { key: 'step-2', type: 'text', text: 'Measure both angles from the normal.', x: 220, y: 520, width: 1450, height: 150, animation: 'wipe' },
      ] },
    ],
  },
  {
    marker: '[SPECTROPY_ZOOM_DEMO_SECTION]',
    title: 'DEMO – Section and Summary Zoom',
    sections: [
      { name: 'Learn the idea', screenIndexes: [1, 2] },
      { name: 'Apply the idea', screenIndexes: [3, 4] },
    ],
    screens: [
      { title: 'Summary Zoom Hub', elements: [
        { key: 'heading', type: 'title', text: 'Summary Zoom: choose a teaching section', x: 120, y: 70, width: 1680, height: 140 },
        { key: 'section-learn', type: 'zoom', text: 'Learn the idea', x: 220, y: 300, width: 650, height: 340, section: 0 },
        { key: 'section-apply', type: 'zoom', text: 'Apply the idea', x: 1050, y: 300, width: 650, height: 340, section: 1 },
      ] },
      { title: 'Meaning of reflection', elements: [{ key: 'text', type: 'text', text: 'Reflection is the return of light into the same medium.', x: 250, y: 340, width: 1420, height: 260, animation: 'fade' }] },
      { title: 'Law of reflection', elements: [{ key: 'text', type: 'text', text: 'Angle of incidence = Angle of reflection.', x: 250, y: 340, width: 1420, height: 260, animation: 'zoom' }] },
      { title: 'Guided question', elements: [{ key: 'text', type: 'question', text: 'If the incident angle is 35°, what is the reflected angle?', x: 250, y: 300, width: 1420, height: 300, animation: 'appear' }] },
      { title: 'Answer and transfer', elements: [{ key: 'text', type: 'response', text: '35°. Both angles are measured from the normal.', x: 250, y: 320, width: 1420, height: 260, animation: 'fly-in' }] },
    ],
  },
];

const animation = (effect) => effect ? { animation: { effects: [{ effect, start: 'on-click', duration: 0.7, delay: 0 }] } } : {};

const seed = async () => {
  const client = await pool.connect();
  const results = [];
  try {
    await client.query('BEGIN');
    for (const demo of demos) {
      let session = (await client.query('SELECT id FROM sessions WHERE description = $1 LIMIT 1', [demo.marker])).rows[0];
      if (!session) {
        const number = Number((await client.query('SELECT COALESCE(MAX(session_number), 0) + 1 AS value FROM sessions WHERE subtopic_id = $1', [owner.subtopicId])).rows[0].value);
        session = (await client.query(
          `INSERT INTO sessions (client_id, subtopic_id, session_number, title, description, status, created_by)
           VALUES ($1,$2,$3,$4,$5,'draft',$6) RETURNING id`,
          [owner.clientId, owner.subtopicId, number, demo.title, demo.marker, owner.userId],
        )).rows[0];
      } else {
        await client.query("UPDATE sessions SET title=$1, status='draft', updated_at=NOW() WHERE id=$2", [demo.title, session.id]);
        await client.query('DELETE FROM screens WHERE session_id=$1', [session.id]);
        await client.query('DELETE FROM screen_sections WHERE session_id=$1', [session.id]);
      }
      const screenIds = [];
      for (let index = 0; index < demo.screens.length; index += 1) {
        const screen = demo.screens[index];
        const row = (await client.query(
          `INSERT INTO screens (client_id, session_id, title, screen_number, display_order, creation_mode, screen_settings_json, created_by)
           VALUES ($1,$2,$3,$4,$5,'blank',$6::jsonb,$7) RETURNING id`,
          [owner.clientId, session.id, screen.title, index + 1, index, JSON.stringify({ transition: { effect: 'fade', duration: 0.45, advanceOnClick: true } }), owner.userId],
        )).rows[0];
        screenIds.push(Number(row.id));
        for (let order = 0; order < screen.elements.length; order += 1) {
          const element = screen.elements[order];
          await client.query(
            `INSERT INTO screen_elements (screen_id, element_key, slot_id, element_type, content_json, position_json, display_order)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
            [row.id, element.key, `free-${element.key}`, element.type, JSON.stringify({ text: element.text, ...animation(element.animation) }), JSON.stringify({ x: element.x, y: element.y, width: element.width, height: element.height, zIndex: order + 1 }), order],
          );
        }
      }
      const sectionIds = [];
      for (let index = 0; index < (demo.sections || []).length; index += 1) {
        const section = demo.sections[index];
        const sectionRow = (await client.query('INSERT INTO screen_sections (session_id,name,display_order,created_by) VALUES ($1,$2,$3,$4) RETURNING id', [session.id, section.name, index, owner.userId])).rows[0];
        sectionIds.push(Number(sectionRow.id));
        for (let order = 0; order < section.screenIndexes.length; order += 1) await client.query('INSERT INTO screen_section_members (section_id,screen_id,display_order) VALUES ($1,$2,$3)', [sectionRow.id, screenIds[section.screenIndexes[order]], order]);
      }
      for (let sourceIndex = 0; sourceIndex < demo.screens.length; sourceIndex += 1) {
        for (const element of demo.screens[sourceIndex].elements.filter((item) => item.type === 'zoom')) {
          const isSection = element.section !== undefined;
          await client.query(
            `INSERT INTO screen_zoom_links (source_screen_id,element_id,session_id,zoom_kind,target_screen_id,target_section_id,return_to_zoom)
             VALUES ($1,$2,$3,$4,$5,$6,TRUE)`,
            [screenIds[sourceIndex], element.key, session.id, isSection ? 'section' : 'screen', isSection ? null : screenIds[element.target], isSection ? sectionIds[element.section] : null],
          );
        }
      }
      results.push({ session_id: Number(session.id), title: demo.title, screens: screenIds.length });
    }
    await client.query('COMMIT');
    console.log(JSON.stringify(results));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); await pool.end(); }
};

await seed();
