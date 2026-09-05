import { JunctionEvent } from "@/types";

export const MOCK_EVENT: JunctionEvent = {
  id: "IPL_WANKHEDE_2026",
  name: "Mumbai Indians vs Delhi Capitals",
  venue: "Wankhede Stadium",
  city: "Mumbai",
  expectedAttendance: 33000,
  startTime: "19:30",
  endTime: "22:30",
  status: "LIVE",
  gates: [
    { id: "G1", label: "Gate 1 (North)", capacity: 10000 },
    { id: "G2", label: "Gate 2 (East)", capacity: 8000 },
    { id: "G3", label: "Gate 3 (South)", capacity: 9000 },
    { id: "G4", label: "Gate 4 (West)", capacity: 6000 },
  ],
};
