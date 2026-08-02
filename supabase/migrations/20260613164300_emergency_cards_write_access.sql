-- ============================================================
-- MIGRATION: Fix emergency_cards for full CRUD by admins/managers
-- 
-- Problems fixed:
--   1. scenario column had an enum CHECK constraint — form sends free-text
--   2. No INSERT / UPDATE / DELETE RLS policies existed — all writes blocked
--   3. No seed data — page was always empty
-- ============================================================

-- 1. Drop the scenario enum CHECK constraint so free-text descriptions work
ALTER TABLE emergency_cards
  DROP CONSTRAINT IF EXISTS emergency_cards_scenario_check;
-- 2. Widen scenario column to TEXT for free-form scenario descriptions
ALTER TABLE emergency_cards
  ALTER COLUMN scenario TYPE text,
  ALTER COLUMN scenario SET DEFAULT '';
-- 3. Add INSERT policy — admin and hse_manager only
DROP POLICY IF EXISTS "emergency_cards_insert" ON emergency_cards;
CREATE POLICY "emergency_cards_insert" ON emergency_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager')
    )
  );
-- 4. Add UPDATE policy — admin and hse_manager only
DROP POLICY IF EXISTS "emergency_cards_update" ON emergency_cards;
CREATE POLICY "emergency_cards_update" ON emergency_cards
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager')
    )
  );
-- 5. Add DELETE policy — admin and hse_manager only
DROP POLICY IF EXISTS "emergency_cards_delete" ON emergency_cards;
CREATE POLICY "emergency_cards_delete" ON emergency_cards
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager')
    )
  );
-- 6. Seed default emergency response cards
--    (only inserts if table is empty to avoid duplicates on re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM emergency_cards LIMIT 1) THEN

    INSERT INTO emergency_cards
      (title, scenario, severity, icon, color, quick_actions, checklist_items,
       escalation_contacts, muster_points, equipment_needed, is_active)
    VALUES

    -- Card 1: Fire Emergency
    (
      'Fire Emergency',
      'Uncontrolled fire detected in facility, process area, or equipment. Immediate evacuation and response required.',
      'critical', 'fire', 'red',
      ARRAY[
        'Activate nearest fire alarm pull station',
        'Call Control Room immediately',
        'Evacuate all personnel from affected area — do NOT use elevators',
        'Report to designated muster point',
        'Await headcount clearance from Supervisor'
      ],
      ARRAY[
        'All personnel accounted for at muster point',
        'Fire brigade notified',
        'Access routes clear for emergency vehicles',
        'Utilities (gas, power) isolated if safe to do so',
        'Incident commander on scene and briefed'
      ],
      '[
        {"role":"HSE Manager","number":"+234-800-HSE-NEPL"},
        {"role":"Control Room","number":"+234-1-CTRL-000"},
        {"role":"Fire Brigade","number":"01-770-0001"},
        {"role":"Site Medical Officer","number":"101"}
      ]'::jsonb,
      '["Muster Point A – Main Gate Car Park","Muster Point B – Drill Ground (Offshore Ops)"]'::jsonb,
      ARRAY[
        'CO2 / Dry Powder Fire Extinguisher',
        'SCBA Breathing Apparatus',
        'Fire-Resistant PPE (suit, gloves, boots)',
        'First Aid Kit'
      ],
      true
    ),

    -- Card 2: Gas Leak / Toxic Release
    (
      'Gas Leak / Toxic Release',
      'Detection of flammable or toxic gas release from pipeline, vessel, or storage tank. Potential for explosion or asphyxiation.',
      'critical', 'gas', 'orange',
      ARRAY[
        'Activate gas alarm — evacuate upwind immediately',
        'Eliminate ALL ignition sources in 50m radius',
        'Isolate gas supply at nearest isolation valve',
        'Call Control Room — do NOT use mobile phones near leak',
        'Do NOT operate electrical switches in hazardous area'
      ],
      ARRAY[
        'Wind direction confirmed — all personnel evacuated upwind',
        'Ignition sources eliminated in 50 m radius',
        'Gas isolation valve closed and locked out/tagged out',
        'Emergency services contacted and on standby',
        'Continuous air quality monitoring initiated'
      ],
      '[
        {"role":"HSE Manager","number":"+234-800-HSE-NEPL"},
        {"role":"Control Room","number":"+234-1-CTRL-000"},
        {"role":"Gas Safety Officer","number":"+234-803-GAS-0001"},
        {"role":"Emergency Response Team","number":"+234-803-ERT-0001"}
      ]'::jsonb,
      '["Upwind Muster Point – min. 200m from source","Emergency Assembly Area – Admin Block"]'::jsonb,
      ARRAY[
        'Multi-gas detector (H2S, LEL, CO, O2)',
        'SCBA / Air-purifying respirator',
        'Non-sparking tools',
        'Full body chemical protective suit'
      ],
      true
    ),

    -- Card 3: Oil Spill Response
    (
      'Oil Spill Response',
      'Uncontrolled release of hydrocarbon liquid to ground, water, or secondary containment breach posing environmental and fire risk.',
      'high', 'spill', 'yellow',
      ARRAY[
        'Stop or reduce source flow if it can be done safely',
        'Contain spill with absorbent booms / berms',
        'Notify HSE Manager and Control Room immediately',
        'Prevent spill from reaching storm drains or water bodies',
        'Initiate Spill Response Team activation'
      ],
      ARRAY[
        'Spill source identified and isolated',
        'Containment booms and berms deployed',
        'Drainage points blocked / plugged',
        'Environmental Officer and Control Room notified',
        'Spill volume estimated and logged in incident system'
      ],
      '[
        {"role":"HSE Manager","number":"+234-800-HSE-NEPL"},
        {"role":"Environmental Officer","number":"+234-803-ENV-0001"},
        {"role":"Control Room","number":"+234-1-CTRL-000"},
        {"role":"Spill Response Team Lead","number":"+234-803-SRT-0001"}
      ]'::jsonb,
      '["Upwind Muster Point – min. 100m from spill","Secondary Assembly – Admin Block"]'::jsonb,
      ARRAY[
        'Absorbent boom and spill pads',
        'Chemical-resistant gloves and boots',
        'Spill kit (sand / vermiculite)',
        'Sample containers for regulatory evidence'
      ],
      true
    ),

    -- Card 4: Medical Emergency
    (
      'Medical Emergency',
      'Personnel injury, illness, cardiac event, or unconscious worker requiring immediate first aid and medical evacuation.',
      'high', 'medical', 'blue',
      ARRAY[
        'Call for help — shout or use radio channel',
        'Do NOT move casualty unless in immediate danger',
        'Begin first aid or CPR if trained to do so',
        'Call Medical Officer: 101',
        'Clear area and guide ambulance / medevac to location'
      ],
      ARRAY[
        'Scene confirmed safe — no secondary hazard present',
        'Casualty responsiveness and breathing assessed',
        'Qualified first-aider on scene',
        'Ambulance or medic en route with ETA confirmed',
        'Supervisor and HSE Manager notified'
      ],
      '[
        {"role":"Site Medical Officer","number":"101"},
        {"role":"HSE Manager","number":"+234-800-HSE-NEPL"},
        {"role":"Control Room","number":"+234-1-CTRL-000"},
        {"role":"Medevac Coordinator","number":"+234-803-MED-0001"}
      ]'::jsonb,
      '["Medical Bay – Admin Block Ground Floor","Helicopter Landing Zone – Pad Alpha"]'::jsonb,
      ARRAY[
        'Comprehensive First Aid Kit',
        'AED (Automated External Defibrillator)',
        'Stretcher / Spine board',
        'Portable Oxygen Cylinder'
      ],
      true
    ),

    -- Card 5: Electrical Incident
    (
      'Electrical Incident',
      'Electric shock, electrical fire, equipment failure, or exposed live conductor posing risk to personnel and infrastructure.',
      'high', 'electrical', 'yellow',
      ARRAY[
        'Do NOT touch victim — isolate power supply first',
        'Isolate at distribution panel or Motor Control Centre (MCC)',
        'Call Control Room and confirm isolation',
        'Administer first aid only once power confirmed isolated',
        'Secure and barricade affected area — erect warning signs'
      ],
      ARRAY[
        'Power isolation confirmed and locked out/tagged out',
        'Casualty removed from hazard safely by trained person',
        'Medical assessment completed on site',
        'Electrical Supervisor and HSE Manager notified',
        'Area secured pending formal investigation'
      ],
      '[
        {"role":"Electrical Supervisor","number":"+234-803-ELEC-01"},
        {"role":"Control Room","number":"+234-1-CTRL-000"},
        {"role":"Site Medical Officer","number":"101"},
        {"role":"HSE Manager","number":"+234-800-HSE-NEPL"}
      ]'::jsonb,
      '["Muster Point A – Main Gate Car Park","Electrical Control Room – Block C"]'::jsonb,
      ARRAY[
        'Insulated rubber gloves (minimum Class 0)',
        'Voltage tester / non-contact voltmeter',
        'Lock-out tag-out (LOTO) kit',
        'First Aid Kit',
        'Fire extinguisher (CO2 type)'
      ],
      true
    );

  END IF;
END;
$$;
