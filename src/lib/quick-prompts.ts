/**
 * Quick-prompt bank for the dashboard mentor search. Every prompt maps to a
 * course whose transcripts are embedded in the mentor's RAG index, so a click
 * always lands on content the mentor can actually answer well. Grouped by
 * course; 2-3 prompts each. `sampleQuickPrompts` picks a random subset per
 * visit so the chips feel alive rather than static.
 */
export const quickPrompts = [
  // 3D Printing for Industry 4.0
  "FDM vs SLA — which should I use?",
  "How does 3D printing power Industry 4.0?",
  // 5S System
  "Walk me through the 5S steps",
  "Run a 5S audit on my workspace",
  // 7 QC Tools
  "When do I use a fishbone diagram?",
  "Build a Pareto chart from defect data",
  // ABAQUS CAE
  "Set up my first ABAQUS simulation",
  "Fix convergence errors in ABAQUS",
  // AutoCAD
  "AutoCAD shortcuts that save hours",
  "Dimension a drawing like a pro in AutoCAD",
  "Set up layers and blocks in AutoCAD",
  // Autodesk CFD
  "Simulate airflow over a heat sink",
  "Meshing tips for accurate CFD results",
  // ISO 17025 Basics
  "What makes a lab ISO 17025 accredited?",
  "ISO 17025 audit — what to expect",
  // Calibration Process
  "Calibrate a pressure gauge step by step",
  "Read a calibration certificate correctly",
  // Rapid Prototyping (CARE)
  "How did Boeing use rapid prototyping?",
  "Rapid prototyping vs traditional tooling",
  // CATIA V5
  "Master sketch constraints in CATIA V5",
  "Create my first CATIA assembly",
  "Surface modeling in CATIA V5",
  // C for Mechanical Engineers
  "Why should mechanical engineers learn C?",
  "Write a C program for beam deflection",
  // CMM & PowerINSPECT
  "How does a CMM measure parts?",
  "Inspect a part with PowerINSPECT",
  // CNC Programming
  "Write my first G-code program",
  "G-code vs M-code — what's the difference?",
  "Set work offsets on a CNC machine",
  // COMSOL Multiphysics
  "Couple thermal and structural physics in COMSOL",
  "When is COMSOL better than other FEA tools?",
  // Digital Manufacturing
  "What is digital manufacturing really?",
  "From CAD file to smart factory floor",
  // Digital Twin
  "Explain digital twins with a real example",
  "Digital twin vs simulation — the difference",
  // EV & Battery
  "How does an EV battery pack work?",
  "Why lithium-ion rules electric vehicles",
  "Battery thermal runaway explained",
  // EV Thermal Cooling
  "How are EV batteries kept cool?",
  "Liquid vs air cooling for EV packs",
  // FEA
  "What happens inside an FEA solver?",
  "Verify my FEA mesh quality",
  "Von Mises stress made intuitive",
  // FreeCAD
  "Model a part in FreeCAD for free",
  "FreeCAD vs paid CAD — honest take",
  // Fusion 360
  "Design and simulate in Fusion 360",
  "Fusion 360 CAM for beginners",
  "Topology optimization in Fusion 360",
  // GD&T
  "GD&T symbols decoded simply",
  "Position tolerance explained with an example",
  "Read a GD&T feature control frame",
  // IC Engine
  "What happens in the 4 strokes?",
  "Why do diesel engines skip spark plugs?",
  "Turbocharger vs supercharger",
  // IIoT
  "IoT vs IIoT — what changes in industry?",
  "Sensors that make factories smart",
  // Industry 4.0 / IndustryX
  "The 9 pillars of Industry 4.0",
  "Is my factory ready for Industry 4.0?",
  // Kaizen
  "Start Kaizen with 10 minutes a day",
  "Kaizen events that transformed factories",
  // Lean Manufacturing Tools
  "Spot the 8 wastes on a shop floor",
  "Value stream mapping in simple steps",
  // Manufacturing Process
  "Casting vs forging vs machining",
  "Pick the right manufacturing process",
  // Material Informatics
  "How AI discovers new materials",
  "What is material informatics?",
  // MATLAB
  "Plot and analyze data in MATLAB",
  "Solve engineering equations with MATLAB",
  "Simulink basics for control systems",
  // Mechanical Career
  "Map my mechanical engineering career path",
  "Skills recruiters want from mech engineers",
  // Mechatronics
  "How sensors, actuators, and control unite",
  "Build intuition for mechatronic systems",
  // Metrology
  "Least count vs accuracy vs precision",
  "Use a micrometer the right way",
  "Calibrate vernier calipers correctly",
  // OpenFOAM
  "Run my first OpenFOAM case",
  "OpenFOAM solvers — which one when?",
  // Pressure Measurement
  "Gauge vs absolute vs differential pressure",
  "How does a Bourdon tube work?",
  // PLC Programming
  "Write my first ladder logic program",
  "How PLCs run an entire production line",
  // PTC Creo
  "Parametric modeling in Creo explained",
  "Create a sheet-metal part in Creo",
  // Python for Mechanical & Robotics
  "Automate calculations with Python",
  "Python for robot kinematics",
  "Read sensor data with Python",
  // Siemens NX
  "Why aerospace loves Siemens NX",
  "Model a complex surface in NX",
  // Six Sigma
  "What does 3.4 defects per million mean?",
  "DMAIC explained with a case study",
  "Cp vs Cpk in process capability",
  // Smart Material Science
  "Materials that heal themselves?",
  "Shape-memory alloys in action",
  // SolidWorks 2024
  "SolidWorks 2024 features worth learning",
  "Master mates in SolidWorks assemblies",
  "Simulate stress on my SolidWorks part",
  // TQM
  "TQM principles every engineer needs",
  "Deming's 14 points in practice",
  // Uncertainty in Measurement
  "Error vs uncertainty — not the same!",
  "Calculate measurement uncertainty simply",
] as const;

/**
 * Random sample without replacement (partial Fisher-Yates), fresh per call.
 */
export function sampleQuickPrompts(count = 4): string[] {
  const pool = [...quickPrompts];
  const picked = Math.min(count, pool.length);
  for (let index = 0; index < picked; index += 1) {
    const swap = index + Math.floor(Math.random() * (pool.length - index));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, picked);
}
