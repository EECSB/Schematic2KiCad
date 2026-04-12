import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SchematicComponent {
  id: string;
  type: string; // e.g., Resistor, Capacitor, IC, Connector
  value: string;
  reference: string; // e.g., R1, C1, U1
  pins: { number: string; x: number; y: number }[];
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface SchematicNet {
  name: string;
  nodes: { componentId: string; pinNumber: string }[];
  segments?: { x: number; y: number }[][]; // Array of polyline segments
}

export interface SchematicData {
  components: SchematicComponent[];
  nets: SchematicNet[];
  junctions?: { x: number; y: number }[];
}

export async function analyzeSchematic(base64Image: string): Promise<SchematicData> {
  const prompt = `
    Analyze this electrical schematic image with extreme precision for conversion to KiCad.
    
    1. Identify all components. For each:
       - reference (e.g., R1, C1)
       - type (Resistor, Capacitor, Diode, LED, Transistor, Battery, Connector, Ground, Integrated Circuit)
       - value (e.g., 10k, 100nF)
       - rotation (0, 90, 180, or 270 degrees. 0 is vertical pins, 90 is horizontal pins)
       - center coordinates (x, y from 0 to 1000)
       - pins: For each pin, provide its number ("1", "2", etc.) and its exact relative coordinates (x, y from 0 to 1000) where the wire attaches.
    
    2. Identify all electrical nets. For each net:
       - name (e.g., Net-R1-Pad1)
       - nodes: List of { componentId, pinNumber }. 
         CRITICAL: Every component that a wire segment touches MUST be included as a node in the net.
       - segments: A list of polyline segments (each segment is a list of x,y points from 0 to 1000).
         CRITICAL: Wires must be strictly horizontal or vertical.
         CRITICAL: Maintain the visual "topology". If two horizontal wires are parallel, ensure their Y-coordinates reflect their relative vertical positions in the image. 
         Ensure parallel horizontal wires have a Y-coordinate difference of at least 20 units (out of 1000) to prevent them from snapping to the same grid line.
         Maximize vertical separation between distinct horizontal paths to avoid overlapping or "clumping".
         The start and end points of these segments must align exactly with the pin coordinates identified above.
    
    3. Identify junctions:
       - junctions: A list of (x, y) coordinates where 3 or more wire segments meet.

    Return the data in a structured JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          components: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                value: { type: Type.STRING },
                reference: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                rotation: { type: Type.NUMBER },
                pins: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      number: { type: Type.STRING },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                    },
                  },
                },
              },
              required: ["id", "type", "reference", "x", "y", "rotation", "pins"],
            },
          },
          nets: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      componentId: { type: Type.STRING },
                      pinNumber: { type: Type.STRING },
                    },
                  },
                },
                segments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                      },
                    },
                  },
                },
              },
              required: ["name", "nodes"],
            },
          },
          junctions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
              },
            },
          },
        },
        required: ["components", "nets"],
      },
    },
  });

  return JSON.parse(response.text);
}

export function generateKiCadSchematic(data: SchematicData): string {
  const SNAP = 1.27;
  const toGrid = (v: number) => Math.round(v / SNAP) * SNAP;

  const getLibId = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("resistor")) return "Device:R";
    if (t.includes("capacitor")) return "Device:C";
    if (t.includes("diode")) return "Device:D";
    if (t.includes("led")) return "Device:LED";
    if (t.includes("transistor")) return "Device:Q";
    if (t.includes("integrated circuit") || t.includes("ic")) return "Device:U";
    if (t.includes("battery") || t.includes("voltage source") || t.includes("source")) return "Device:V";
    if (t.includes("connector")) return "Connector:Conn_01x02_Male";
    if (t.includes("ground") || t.includes("gnd")) return "power:GND";
    return "Device:U";
  };

  const getBasePinOffset = (libId: string, pinNumber: string) => {
    if (libId === "Device:R" || libId === "Device:V") {
      return pinNumber === "1" ? { dx: 0, dy: -3.81 } : { dx: 0, dy: 3.81 };
    }
    if (libId === "Device:C") {
      return pinNumber === "1" ? { dx: 0, dy: -2.54 } : { dx: 0, dy: 2.54 };
    }
    return { dx: 0, dy: 0 };
  };

  const rotateOffset = (offset: { dx: number; dy: number }, rotation: number) => {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      dx: Math.round((offset.dx * cos - offset.dy * sin) * 1000) / 1000,
      dy: Math.round((offset.dx * sin + offset.dy * cos) * 1000) / 1000,
    };
  };

  const scaleX = (x: number) => toGrid(40 + (x / 1000) * 210);
  const scaleY = (y: number) => toGrid(30 + (y / 1000) * 150);

  const sheetUuid = crypto.randomUUID();
  
  const libSymbols = `  (lib_symbols
    (symbol "Device:R" (pin_numbers hide) (pin_names (offset 0)) (in_bom yes) (on_board yes)
      (property "Reference" "R" (id 0) (at 2.032 0 90) (effects (font (size 1.27 1.27))))
      (property "Value" "R" (id 1) (at 0 0 90) (effects (font (size 1.27 1.27))))
      (symbol "R_0_1"
        (rectangle (start -1.016 -2.54) (end 1.016 2.54) (stroke (width 0.254) (type default) (color 0 0 0 0)) (fill (type none)))
      )
      (pin passive line (at 0 -3.81 90) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
      (pin passive line (at 0 3.81 270) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
    )
    (symbol "Device:C" (pin_numbers hide) (pin_names (offset 0)) (in_bom yes) (on_board yes)
      (property "Reference" "C" (id 0) (at 0.635 2.54 0) (effects (font (size 1.27 1.27)) (justify left)))
      (property "Value" "C" (id 1) (at 0.635 -2.54 0) (effects (font (size 1.27 1.27)) (justify left)))
      (symbol "C_0_1"
        (polyline (pts (xy -2.032 -0.762) (xy 2.032 -0.762)) (stroke (width 0.508) (type default) (color 0 0 0 0)) (fill (type none)))
        (polyline (pts (xy -2.032 0.762) (xy 2.032 0.762)) (stroke (width 0.508) (type default) (color 0 0 0 0)) (fill (type none)))
      )
      (pin passive line (at 0 -2.54 90) (length 1.778) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
      (pin passive line (at 0 2.54 270) (length 1.778) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
    )
    (symbol "Device:V" (pin_numbers hide) (pin_names (offset 0)) (in_bom yes) (on_board yes)
      (property "Reference" "V" (id 0) (at 2.54 2.54 0) (effects (font (size 1.27 1.27)) (justify left)))
      (property "Value" "V" (id 1) (at 2.54 -2.54 0) (effects (font (size 1.27 1.27)) (justify left)))
      (symbol "V_0_1"
        (circle (center 0 0) (radius 2.54) (stroke (width 0.254) (type default) (color 0 0 0 0)) (fill (type none)))
        (polyline (pts (xy 0 1.27) (xy 0 0.254)) (stroke (width 0) (type default) (color 0 0 0 0)) (fill (type none)))
        (polyline (pts (xy -0.508 0.762) (xy 0.508 0.762)) (stroke (width 0) (type default) (color 0 0 0 0)) (fill (type none)))
      )
      (pin passive line (at 0 -3.81 90) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
      (pin passive line (at 0 3.81 270) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
    )
    (symbol "power:GND" (power) (pin_names (offset 0)) (in_bom no) (on_board yes)
      (property "Reference" "#PWR" (id 0) (at 0 -6.35 0) (effects (font (size 1.27 1.27)) hide))
      (property "Value" "GND" (id 1) (at 0 -3.81 0) (effects (font (size 1.27 1.27))))
      (symbol "GND_0_1"
        (polyline (pts (xy 0 0) (xy 0 -1.27)) (stroke (width 0) (type default) (color 0 0 0 0)) (fill (type none)))
        (polyline (pts (xy -1.27 -1.27) (xy 1.27 -1.27)) (stroke (width 0) (type default) (color 0 0 0 0)) (fill (type none)))
        (polyline (pts (xy -0.762 -1.778) (xy 0.762 -1.778)) (stroke (width 0) (type default) (color 0 0 0 0)) (fill (type none)))
        (polyline (pts (xy -0.254 -2.286) (xy 0.254 -2.286)) (stroke (width 0) (type default) (color 0 0 0 0)) (fill (type none)))
      )
      (pin power_in line (at 0 0 270) (length 0) (name "GND" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
    )
  )`;

  let output = `(kicad_sch (version 20211123) (generator eeschema)
  (uuid ${sheetUuid})
  (paper "A4")
${libSymbols}
`;

  const symbolInstances: string[] = [];

  data.components.forEach((comp) => {
    const libId = getLibId(comp.type);
    const x = scaleX(comp.x);
    const y = scaleY(comp.y);
    const compUuid = crypto.randomUUID();
    
    // Adjust label placement based on rotation
    let refPos = { x: x, y: y - 5 };
    let valPos = { x: x, y: y + 5 };
    if (comp.rotation === 90 || comp.rotation === 270) {
      refPos = { x: x - 5, y: y - 2 };
      valPos = { x: x - 5, y: y + 2 };
    }

    output += `  (symbol (lib_id "${libId}") (at ${x} ${y} ${comp.rotation || 0}) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced)
    (uuid ${compUuid})
    (property "Reference" "${comp.reference}" (id 0) (at ${refPos.x} ${refPos.y} 0))
    (property "Value" "${comp.value || ""}" (id 1) (at ${valPos.x} ${valPos.y} 0))
  )\n`;

    symbolInstances.push(`    (path "/${compUuid}" (reference "${comp.reference}") (unit 1) (value "${comp.value || ""}") (footprint ""))`);
  });

  data.nets.forEach(net => {
    // Calculate exact pin positions based on component center and rotation
    const netPins = net.nodes.map(node => {
      const comp = data.components.find(c => c.id === node.componentId);
      if (!comp) return null;
      const libId = getLibId(comp.type);
      const baseOffset = getBasePinOffset(libId, node.pinNumber);
      const rotatedOffset = rotateOffset(baseOffset, comp.rotation || 0);
      return {
        x: toGrid(scaleX(comp.x) + rotatedOffset.dx),
        y: toGrid(scaleY(comp.y) + rotatedOffset.dy),
        componentId: node.componentId,
        pinNumber: node.pinNumber
      };
    }).filter(p => p !== null) as { x: number; y: number; componentId: string; pinNumber: string }[];

    if (netPins.length < 2) return;

    if (net.segments && net.segments.length > 0) {
      net.segments.forEach(segment => {
        if (segment.length < 2) return;
        
        // Orthogonalize and snap each segment
        for (let i = 0; i < segment.length - 1; i++) {
          let p1 = { x: scaleX(segment[i].x), y: scaleY(segment[i].y) };
          let p2 = { x: scaleX(segment[i+1].x), y: scaleY(segment[i+1].y) };

          // Snap endpoints to the nearest pin in THIS net
          if (i === 0) {
            let minDist = Infinity;
            let bestPin = netPins[0];
            netPins.forEach(pin => {
              const d = Math.sqrt((p1.x - pin.x)**2 + (p1.y - pin.y)**2);
              if (d < minDist) { minDist = d; bestPin = pin; }
            });
            p1 = { x: bestPin.x, y: bestPin.y };
          }

          if (i === segment.length - 2) {
            let minDist = Infinity;
            let bestPin = netPins[0];
            netPins.forEach(pin => {
              const d = Math.sqrt((p2.x - pin.x)**2 + (p2.y - pin.y)**2);
              if (d < minDist) { minDist = d; bestPin = pin; }
            });
            p2 = { x: bestPin.x, y: bestPin.y };
          }

          // Ensure orthogonality: if diagonal, add a corner
          if (p1.x !== p2.x && p1.y !== p2.y) {
            const corner = { x: p2.x, y: p1.y };
            output += `  (wire (pts (xy ${p1.x} ${p1.y}) (xy ${corner.x} ${corner.y})) (uuid ${crypto.randomUUID()}))\n`;
            output += `  (wire (pts (xy ${corner.x} ${corner.y}) (xy ${p2.x} ${p2.y})) (uuid ${crypto.randomUUID()}))\n`;
          } else {
            output += `  (wire (pts (xy ${p1.x} ${p1.y}) (xy ${p2.x} ${p2.y})) (uuid ${crypto.randomUUID()}))\n`;
          }
        }
      });
    } else {
      // Fallback: simple right-angle connection between pins
      for (let i = 0; i < netPins.length - 1; i++) {
        const p1 = netPins[i];
        const p2 = netPins[i+1];
        const corner = { x: p2.x, y: p1.y };
        output += `  (wire (pts (xy ${p1.x} ${p1.y}) (xy ${corner.x} ${corner.y})) (uuid ${crypto.randomUUID()}))\n`;
        output += `  (wire (pts (xy ${corner.x} ${corner.y}) (xy ${p2.x} ${p2.y})) (uuid ${crypto.randomUUID()}))\n`;
      }
    }
  });

  // Add junctions where wires meet
  if (data.junctions) {
    data.junctions.forEach(j => {
      output += `  (junction (at ${scaleX(j.x)} ${scaleY(j.y)}) (uuid ${crypto.randomUUID()}))\n`;
    });
  }

  output += `  (sheet_instances
    (path "/" (page "1"))
  )
  (symbol_instances
${symbolInstances.join("\n")}
  )
)\n`;
  return output;
}
