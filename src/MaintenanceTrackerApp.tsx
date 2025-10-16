// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wrench, Clock, CheckCircle2, Package, MapPin, AlertTriangle, CalendarClock, ListChecks, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

const LS_KEY = "maint_mvp_v3_jobstatuses";
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveState(s) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

const seed = {
  technicians: [
    { id: "t1", name: "Alex Andersson" },
    { id: "t2", name: "Billie Berg" },
  ],
  equipment: [
    { id: "eq-1001", name: "Pump A-14", serial: "PA14-00321", site: "Stockholm Plant", location: "Bldg 2 / Bay 5", model: "PX-500", lastService: "2025-10-10", nextDue: "2026-04-10", status: "OK" },
    { id: "eq-1002", name: "Compressor C-7", serial: "CC7-8821", site: "Uppsala Lab", location: "Room 12", model: "CX-700", lastService: "2025-08-21", nextDue: "2026-02-21", status: "Attention" },
  ],
  jobs: [
    {
      id: "job-1",
      equipmentId: "eq-1001",
      title: "Pump leak & vibration",
      status: "Open",
      description: "Diagnose leakage on seal housing, address vibration above threshold, perform test run.",
      created: "2025-10-10",
      materials: [
        { id: "jm1", sku: "SEAL-KIT-PX500", description: "Seal Kit PX-500", qty: 1, unit: "ea" },
      ],
    },
  ],
  visits: [
    {
      id: "v1",
      jobId: "job-1",
      equipmentId: "eq-1001",
      technicianId: "t1",
      date: "2025-10-12",
      hours: 3.5,
      notes: "Removed worn seals, installed kit, test run 2h — no leaks.",
      status: "Completed",
    },
  ],
};

const fmtDate = (d) => new Date(d).toLocaleDateString();

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="p-2 rounded-2xl shadow-inner">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function JobStatusSelect({ value, onChange }) {
  const statuses = [
    "Open",
    "In Progress",
    "Waiting for Customer",
    "Waiting for 3rd Party",
    "Waiting for Belach",
    "Job Done",
  ];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {statuses.map((s)=>(<SelectItem key={s} value={s}>{s}</SelectItem>))}
      </SelectContent>
    </Select>
  );
}

function MaterialsEditor({ materials, setMaterials, header="Materials" }) {
  const [line, setLine] = useState({ sku: "", description: "", qty: 1, unit: "ea" });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2"><Package className="w-4 h-4"/> {header}</div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input placeholder="SKU" value={line.sku} onChange={(e) => setLine({ ...line, sku: e.target.value })} />
        <Input placeholder="Description" className="md:col-span-2" value={line.description} onChange={(e) => setLine({ ...line, description: e.target.value })} />
        <Input type="number" step="0.1" placeholder="Qty" value={line.qty} onChange={(e) => setLine({ ...line, qty: Number(e.target.value) || 0 })} />
        <Input placeholder="Unit" value={line.unit} onChange={(e) => setLine({ ...line, unit: e.target.value })} />
      </div>
      <Button type="button" variant="secondary" onClick={() => {
        if (!line.description) return;
        setMaterials([...(materials || []), { id: crypto.randomUUID(), ...line }]);
        setLine({ sku: "", description: "", qty: 1, unit: "ea" });
      }}>
        <Plus className="w-4 h-4 mr-1" /> Add material
      </Button>
      {(materials || []).length > 0 && (
        <Table className="mt-2">
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.sku}</TableCell>
                <TableCell>{m.description}</TableCell>
                <TableCell>{m.qty}</TableCell>
                <TableCell>{m.unit}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setMaterials(materials.filter((x) => x.id !== m.id))}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function VisitForm({ job, technicians, onSave }) {
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState(1);
  const [status, setStatus] = useState("Completed");
  const [notes, setNotes] = useState("");

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5"/> Log visit — {job.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="text-sm">Technician</div>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm">Date</div>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <div className="text-sm">Hours</div>
            <Input type="number" step="0.1" value={hours} onChange={(e) => setHours(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm">Status</div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Needs Follow-up">Needs Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <div className="text-sm">Visit Notes</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Work performed, tests, measurements, safety notes…" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onSave({ technicianId, date, hours, status, notes })}>
            <CheckCircle2 className="w-4 h-4 mr-1"/> Save visit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JobDetail({ job, equipment, technicians, visits, onAddVisit, onUpdateJob }) {
  const eq = equipment.find((e) => e.id === job.equipmentId);
  const jobVisits = visits.filter((v) => v.jobId === job.id).sort((a,b) => b.date.localeCompare(a.date));
  const totalHours = jobVisits.reduce((s,v)=> s + (v.hours || 0), 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5"/> {job.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">Equipment</span><div className="font-medium">{eq?.name} — {eq?.serial}</div></div>
            <div><span className="text-muted-foreground">Site</span><div className="font-medium">{eq?.site}</div></div>
            <div><span className="text-muted-foreground">Status</span><JobStatusSelect value={job.status} onChange={(val)=> onUpdateJob({ ...job, status: val })} /></div>
            <div><span className="text-muted-foreground">Total hours</span><div className="font-medium">{totalHours.toFixed(1)}</div></div>
            <div className="md:col-span-4">
              <div className="text-sm mb-1">Job Description</div>
              <Textarea value={job.description} onChange={(e)=> onUpdateJob({ ...job, description: e.target.value })} placeholder="Describe the problem, scope, acceptance criteria…" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5"/> Visits ({jobVisits.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobVisits.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{fmtDate(v.date)}</TableCell>
                    <TableCell>{technicians.find((t) => t.id === v.technicianId)?.name || v.technicianId}</TableCell>
                    <TableCell>{v.hours}</TableCell>
                    <TableCell>{v.status}</TableCell>
                    <TableCell className="max-w-[400px] truncate" title={v.notes}>{v.notes}</TableCell>
                  </TableRow>
                ))}
                {jobVisits.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No visits yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <MaterialsEditor materials={job.materials || []} setMaterials={(m)=> onUpdateJob({ ...job, materials: m })} header="Job Materials" />
        <VisitForm job={job} technicians={technicians} onSave={onAddVisit} />
      </div>
    </div>
  );
}

export default function MaintenanceTrackerApp() {
  const persisted = loadState();
  const [data, setData] = useState(persisted || seed);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => saveState(data), [data]);

  const jobsWithAgg = useMemo(() => {
    return data.jobs.map(j => {
      const eq = data.equipment.find(e=>e.id===j.equipmentId);
      const hours = data.visits.filter(v=>v.jobId===j.id).reduce((s,v)=> s + (v.hours||0), 0);
      return { ...j, equipmentName: eq?.name, site: eq?.site, hours };
    });
  }, [data.jobs, data.visits, data.equipment]);

  function addVisitToJob(job, payload) {
    const v = { id: crypto.randomUUID(), jobId: job.id, equipmentId: job.equipmentId, ...payload };
    setData((d) => ({ ...d, visits: [...d.visits, v] }));
  }

  function updateJob(updated) {
    setData((d)=> ({ ...d, jobs: d.jobs.map(j=> j.id===updated.id ? updated : j) }));
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Maintenance Tracker — with Job Statuses</h1>
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsWithAgg.map(j => (
                  <TableRow key={j.id} className={`cursor-pointer hover:bg-muted/50 ${selectedJob?.id===j.id? 'bg-muted/40' : ''}`} onClick={()=> setSelectedJob(j)}>
                    <TableCell className="font-medium">{j.title}</TableCell>
                    <TableCell>{j.equipmentName}</TableCell>
                    <TableCell>{j.site}</TableCell>
                    <TableCell>{j.status}</TableCell>
                    <TableCell>{j.hours.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedJob ? (
          <JobDetail
            job={data.jobs.find((j)=> j.id===selectedJob.id)}
            equipment={data.equipment}
            technicians={data.technicians}
            visits={data.visits}
            onAddVisit={(payload)=> addVisitToJob(selectedJob, payload)}
            onUpdateJob={(upd)=> updateJob(upd)}
          />
        ) : (
          <div className="text-center text-muted-foreground">
            Select a job to view details and log visits.
          </div>
        )}
      </motion.div>
    </div>
  );
}
