/**
 * Lab Readiness master list — the branch's own NABL / ISO 15189:2022 daily checklist (TDPL-LAB-SOP-014),
 * carried over from v1 unchanged: `MyDairy/app/Support/LabReadinessSeed.php`.
 *
 * The activity key is the sheet's S.No (o02–o27 opening, c01–c26 closing), so a row here can always be
 * pointed back at its line on the paper record. Two lines of the sheet are deliberately absent — "record
 * the opening time" and "record the closing time" — because a tick says nothing about when it was made;
 * the board stamps both itself, the opening time when the first activity is actioned and the closing time
 * at sign-off.
 *
 * `scope` says which units an activity applies to: all · nrl (NRL departments only) · field (regional and
 * satellite labs only). `photoRequired` activities cannot be signed off without a photograph.
 */

/** What a person signs at the end of each phase. */
export const DECLARATIONS = {
  opening: 'I confirm that all activities above have been completed and recorded, and that the laboratory is fit to accept and examine patient samples.',
  closing: 'I confirm that all activities above have been completed and recorded, that all deviations have been escalated, and that the laboratory has been secured.',
};

/** The 14 units a readiness board can be run for. `kind`: nrl | regional | satellite. */
export const LAB_UNITS = [
  { key: 'nrl-preanalytical', name: 'Pre-analytical & Accessioning', kind: 'nrl', active: true, order: 1 },
  { key: 'nrl-biochemistry', name: 'Clinical Biochemistry', kind: 'nrl', active: true, order: 2 },
  { key: 'nrl-haematology', name: 'Haematology & Coagulation', kind: 'nrl', active: true, order: 3 },
  { key: 'nrl-clinpath', name: 'Clinical Pathology', kind: 'nrl', active: true, order: 4 },
  { key: 'nrl-serology', name: 'Serology & Immunoassay', kind: 'nrl', active: true, order: 5 },
  { key: 'nrl-microbiology', name: 'Microbiology', kind: 'nrl', active: true, order: 6 },
  { key: 'nrl-molecular', name: 'Molecular Biology', kind: 'nrl', active: true, order: 7 },
  { key: 'nrl-histopath', name: 'Histopathology & Cytology', kind: 'nrl', active: true, order: 8 },
  { key: 'lab-anantapur', name: 'Anantapur', kind: 'regional', active: true, order: 9 },
  { key: 'lab-noida', name: 'Noida', kind: 'regional', active: true, order: 10 },
  { key: 'lab-chandigarh', name: 'Chandigarh', kind: 'regional', active: true, order: 11 },
  { key: 'lab-bangalore', name: 'Bangalore', kind: 'regional', active: true, order: 12 },
  { key: 'lab-satellite-1', name: 'Satellite Lab 1 (rename in Settings)', kind: 'satellite', active: true, order: 13 },
  { key: 'lab-satellite-2', name: 'Satellite Lab 2 (rename in Settings)', kind: 'satellite', active: true, order: 14 },
];

/** The 52 activities: 26 opening, 26 closing. */
export const LAB_ACTIVITIES = [
  // ---------------------------------------------------------------- OPENING
  { key: 'o02', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that the laboratory is secure and that CCTV and access control are working', scheduledTime: '07:00', scope: 'all', photoRequired: false, active: true, order: 1 },
  { key: 'o03', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that mains power supply is available', scheduledTime: '07:05', scope: 'all', photoRequired: false, active: true, order: 2 },
  { key: 'o04', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that the UPS and backup power are available and charged', scheduledTime: '07:05', scope: 'all', photoRequired: false, active: true, order: 3 },
  { key: 'o05', phase: 'opening', section: 'Environmental monitoring', text: 'Record the ambient temperature and humidity', scheduledTime: '07:10', scope: 'all', photoRequired: true, active: true, order: 4 },
  { key: 'o06', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that the laboratory is clean and tidy', scheduledTime: '07:10', scope: 'all', photoRequired: true, active: true, order: 5 },
  { key: 'o07', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that water supply is available', scheduledTime: '07:10', scope: 'all', photoRequired: false, active: true, order: 6 },
  { key: 'o08', phase: 'opening', section: 'Environmental monitoring', text: 'Record refrigerator and freezer temperatures', scheduledTime: '07:15', scope: 'all', photoRequired: true, active: true, order: 7 },
  { key: 'o09', phase: 'opening', section: 'Reagents & consumables', text: 'Check that reagents, controls and calibrators are stored under the required conditions', scheduledTime: '07:20', scope: 'all', photoRequired: false, active: true, order: 8 },
  { key: 'o10', phase: 'opening', section: 'Reagents & consumables', text: 'Check reagent expiry dates and the open-vial validity of reagents in use', scheduledTime: '07:20', scope: 'all', photoRequired: false, active: true, order: 9 },
  { key: 'o11', phase: 'opening', section: 'Equipment start-up', text: 'Check that all analyzers and instruments are in good working condition', scheduledTime: '07:25', scope: 'all', photoRequired: false, active: true, order: 10 },
  { key: 'o12', phase: 'opening', section: 'Equipment start-up', text: 'Switch on the instruments required for the day', scheduledTime: '07:25', scope: 'all', photoRequired: false, active: true, order: 11 },
  { key: 'o13', phase: 'opening', section: 'Equipment start-up', text: 'Check instruments for alarms or error messages and resolve them', scheduledTime: '07:30', scope: 'all', photoRequired: false, active: true, order: 12 },
  { key: 'o14', phase: 'opening', section: 'Equipment start-up', text: 'Carry out the daily maintenance activities for each instrument', scheduledTime: '07:30', scope: 'all', photoRequired: false, active: true, order: 13 },
  { key: 'o15', phase: 'opening', section: 'Equipment start-up', text: 'Check that the calibration of all equipment is current', scheduledTime: '07:35', scope: 'all', photoRequired: false, active: true, order: 14 },
  { key: 'o16', phase: 'opening', section: 'Reagents & consumables', text: 'Check reagent levels on board each analyzer', scheduledTime: '07:35', scope: 'all', photoRequired: false, active: true, order: 15 },
  { key: 'o17', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that waste containers are in place, labelled and empty', scheduledTime: '07:40', scope: 'all', photoRequired: true, active: true, order: 16 },
  { key: 'o18', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that adequate PPE is available', scheduledTime: '07:40', scope: 'all', photoRequired: false, active: true, order: 17 },
  { key: 'o19', phase: 'opening', section: 'LIS & pre-analytical readiness', text: 'Check that the sample collection area is ready for patients', scheduledTime: '07:45', scope: 'all', photoRequired: true, active: true, order: 18 },
  { key: 'o20', phase: 'opening', section: 'Internal quality control', text: 'Run IQC and confirm the results meet the acceptance criteria', scheduledTime: '07:50', scope: 'all', photoRequired: true, active: true, order: 19 },
  { key: 'o21', phase: 'opening', section: 'Internal quality control', text: 'Confirm that the analyzers are ready for patient testing', scheduledTime: '08:10', scope: 'all', photoRequired: false, active: true, order: 20 },
  { key: 'o22', phase: 'opening', section: 'LIS & pre-analytical readiness', text: 'Check that the LIS/HIS, analyzer interfaces, printers and scanners are working', scheduledTime: '08:15', scope: 'all', photoRequired: false, active: true, order: 21 },
  { key: 'o23', phase: 'opening', section: 'Information systems & stock', text: 'Review QTQMS for open NCs, CAPAs, document reviews and training due', scheduledTime: '08:20', scope: 'all', photoRequired: false, active: true, order: 22 },
  { key: 'o24', phase: 'opening', section: 'Manpower & declaration', text: 'Check staff attendance and authorized signatory availability, and conduct the team briefing', scheduledTime: '08:25', scope: 'all', photoRequired: false, active: true, order: 23 },
  { key: 'o25', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that the washrooms are clean and usable', scheduledTime: '08:25', scope: 'all', photoRequired: false, active: true, order: 24 },
  { key: 'o26', phase: 'opening', section: 'Facility, safety & housekeeping', text: 'Check that the eyewash station and first-aid kit are complete and ready for use', scheduledTime: '08:30', scope: 'all', photoRequired: false, active: true, order: 25 },
  { key: 'o27', phase: 'opening', section: 'Manpower & declaration', text: 'Confirm the laboratory is ready to start testing patient samples for the day', scheduledTime: '08:30', scope: 'all', photoRequired: false, active: true, order: 26 },
  // ---------------------------------------------------------------- CLOSING
  { key: 'c01', phase: 'closing', section: 'Workload reconciliation', text: 'Confirm that all samples received during the day have been logged and processed', scheduledTime: '20:30', scope: 'all', photoRequired: false, active: true, order: 27 },
  { key: 'c02', phase: 'closing', section: 'Workload reconciliation', text: 'Review pending patient samples and their release timelines', scheduledTime: '20:35', scope: 'all', photoRequired: false, active: true, order: 28 },
  { key: 'c03', phase: 'closing', section: 'Workload reconciliation', text: 'Review abnormal, critical and pending results', scheduledTime: '20:40', scope: 'all', photoRequired: true, active: true, order: 29 },
  { key: 'c04', phase: 'closing', section: 'Equipment shutdown', text: 'Shut down the analyzers as per the shutdown procedure', scheduledTime: '20:45', scope: 'all', photoRequired: false, active: true, order: 30 },
  { key: 'c05', phase: 'closing', section: 'Equipment shutdown', text: 'Carry out end-of-day cleaning and maintenance of the instruments', scheduledTime: '20:50', scope: 'all', photoRequired: true, active: true, order: 31 },
  { key: 'c06', phase: 'closing', section: 'Sample storage & retention', text: 'Check the condition of reagents in storage', scheduledTime: '20:55', scope: 'all', photoRequired: false, active: true, order: 32 },
  { key: 'c07', phase: 'closing', section: 'Sample storage & retention', text: 'Store reagents at the required temperatures (room temperature or refrigerator)', scheduledTime: '20:55', scope: 'all', photoRequired: true, active: true, order: 33 },
  { key: 'c08', phase: 'closing', section: 'Sample storage & retention', text: 'Record the closing refrigerator and freezer temperatures', scheduledTime: '21:00', scope: 'all', photoRequired: true, active: true, order: 34 },
  { key: 'c09', phase: 'closing', section: 'Waste, stock & data', text: 'Segregate and dispose of biomedical waste as per procedure', scheduledTime: '21:00', scope: 'all', photoRequired: true, active: true, order: 35 },
  { key: 'c10', phase: 'closing', section: 'Waste, stock & data', text: 'Clean the work benches', scheduledTime: '21:05', scope: 'all', photoRequired: true, active: true, order: 36 },
  { key: 'c11', phase: 'closing', section: 'Waste, stock & data', text: 'Clean the sample processing area', scheduledTime: '21:05', scope: 'all', photoRequired: true, active: true, order: 37 },
  { key: 'c12', phase: 'closing', section: 'Equipment shutdown', text: 'Inspect the centrifuges, mixers, incubators and other equipment', scheduledTime: '21:10', scope: 'all', photoRequired: false, active: true, order: 38 },
  { key: 'c13', phase: 'closing', section: 'Equipment shutdown', text: 'Switch off equipment that is not required overnight', scheduledTime: '21:10', scope: 'all', photoRequired: false, active: true, order: 39 },
  { key: 'c14', phase: 'closing', section: 'Commercial, security & declaration', text: 'Check that water and gas supplies are turned off or secured', scheduledTime: '21:15', scope: 'all', photoRequired: false, active: true, order: 40 },
  { key: 'c15', phase: 'closing', section: 'Commercial, security & declaration', text: 'Check that all doors and windows are locked', scheduledTime: '21:15', scope: 'all', photoRequired: false, active: true, order: 41 },
  { key: 'c16', phase: 'closing', section: 'Commercial, security & declaration', text: 'Check that emergency equipment is in place and ready for use', scheduledTime: '21:20', scope: 'all', photoRequired: false, active: true, order: 42 },
  { key: 'c17', phase: 'closing', section: 'Commercial, security & declaration', text: 'Secure patient records and controlled documents', scheduledTime: '21:20', scope: 'all', photoRequired: false, active: true, order: 43 },
  { key: 'c18', phase: 'closing', section: 'Waste, stock & data', text: 'Check that all waste is secured', scheduledTime: '21:25', scope: 'all', photoRequired: true, active: true, order: 44 },
  { key: 'c19', phase: 'closing', section: 'Commercial, security & declaration', text: 'Switch off lights and air conditioning where applicable', scheduledTime: '21:25', scope: 'all', photoRequired: false, active: true, order: 45 },
  { key: 'c20', phase: 'closing', section: 'Workload reconciliation', text: 'Confirm that all authorized reports have been released', scheduledTime: '21:30', scope: 'all', photoRequired: false, active: true, order: 46 },
  { key: 'c21', phase: 'closing', section: 'Information systems & stock', text: 'Run the LIS/server backup and confirm it has completed', scheduledTime: '21:30', scope: 'all', photoRequired: true, active: true, order: 47 },
  { key: 'c22', phase: 'closing', section: 'Information systems & stock', text: 'Update QTQMS with the day\'s deviations, NCs and CAPAs', scheduledTime: '21:35', scope: 'all', photoRequired: false, active: true, order: 48 },
  { key: 'c23', phase: 'closing', section: 'Information systems & stock', text: 'Update the day\'s consumption in AIMS', scheduledTime: '21:35', scope: 'all', photoRequired: false, active: true, order: 49 },
  { key: 'c24', phase: 'closing', section: 'Information systems & stock', text: 'Review the stock position and raise indents for low inventory', scheduledTime: '21:40', scope: 'all', photoRequired: false, active: true, order: 50 },
  { key: 'c25', phase: 'closing', section: 'Commercial, security & declaration', text: 'Secure the laboratory premises, activate the security systems and confirm CCTV is recording', scheduledTime: '21:45', scope: 'all', photoRequired: true, active: true, order: 51 },
  { key: 'c26', phase: 'closing', section: 'Commercial, security & declaration', text: 'Carry out a final walk-through inspection of the laboratory', scheduledTime: '21:50', scope: 'all', photoRequired: false, active: true, order: 52 },
];

/** The department that gets a readiness board when the seed runs. */
export const LAB_READINESS_DEPARTMENT_CODE = 'TDPL-CLIN-001';
